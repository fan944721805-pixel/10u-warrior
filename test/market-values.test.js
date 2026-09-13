const test = require('node:test');
const assert = require('node:assert/strict');
const { winningReturn, freshPrice, betReferencePrice, equityEstimate, valuationKey, equityTier } = require('../public/market-values');
test('round-boundary cards separate current stakes from prior unsettled money',()=>{
  const {pendingBets}=require('../public/market-values');
  const orders=[{id:'old',start:0,end:300000,amount:13.99,status:'OPEN'},{id:'new',start:300000,end:600000,amount:12.32,status:'OPEN'},{id:'settled',start:0,end:300000,amount:100,status:'WON'}];
  const before=structuredClone(orders),value=pendingBets(orders,300001);
  assert.deepEqual(value.current.map(o=>o.id),['new']);assert.equal(value.currentAmount,12.32);
  assert.deepEqual(value.previous.map(o=>o.id),['old']);assert.equal(value.previousAmount,13.99);
  assert.deepEqual(orders,before);
  assert.equal(pendingBets(orders,300000).previousAmount,13.99);
  assert.equal(pendingBets(orders,600000).currentAmount,0);
  assert.equal(pendingBets(orders,600000).previousAmount,26.31);
  assert.equal(pendingBets([orders[0]],300001).current.length,0);
  orders[0].status='WON';assert.equal(pendingBets(orders,300001).previousAmount,0);
});

test('card returns show equity multiples for gains and capital loss percentages', () => {
  const {equityPerformance}=require('../public/market-values');
  for(const [equity,principal,state,text] of [
    [150,100,'profit','x 1.5'],[325,100,'profit','x 3.25'],
    [75,100,'loss','-25%'],[0,100,'loss','-100%'],
    [100,100,'flat','0%'],[200,200,'flat','0%'],[150,200,'loss','-25%'],
    [null,100,'unavailable','—'],[NaN,100,'unavailable','—'],[100,0,'unavailable','—']
  ])assert.deepEqual(equityPerformance(equity,principal),{state,text});
});

test('appearance tiers use current equity multiples with exact boundaries and recover immediately', () => {
  for(const [equity,tier] of [[0,'risk'],[49.99,'risk'],[50,'normal'],[100,'normal'],[199.99,'normal'],[200,'double'],[299.99,'double'],[300,'triple'],[800,'triple'],[220,'double'],[100,'normal']]) {
    assert.equal(equityTier(equity,100),tier);
  }
  assert.equal(equityTier(20,10),'double');
  for(const [equity,principal] of [[null,100],[NaN,100],[Infinity,100],[200,0],[200,-1],[200,undefined]]) {
    assert.equal(equityTier(equity,principal),'normal');
  }
});

test('cumulative P/L includes settled history plus current positions without changing the ledger', () => {
  const now=1800000000000;
  const battle={id:'profit-test',config:{initialBalance:100},initialTotal:200,agents:[
    {id:'A',cash:60,equity:80,orders:[{id:'open',status:'OPEN',amount:20}]},
    {id:'B',cash:110,equity:110,orders:[]}
  ]};
  const original=structuredClone(battle);
  const valuation={battleId:battle.id,signature:valuationKey(battle),agents:[
    {agentId:'A',estimatedEquity:85,asOf:now,validUntil:now+5000}
  ]};
  const result=equityEstimate(battle,valuation,now);
  assert.equal(result.agents[0].floatingPnl,5);
  assert.equal(result.agents[0].cumulativePnl,-15);
  assert.equal(result.agents[1].cumulativePnl,10);
  assert.equal(result.cumulativePnl,-5);
  assert.equal(result.bookEquity,190);
  assert.deepEqual(battle,original);
  const stale=equityEstimate(battle,valuation,now+5001);
  assert.equal(stale.cumulativePnl,null);
  assert.equal(stale.agents[0].cumulativePnl,null);
  assert.equal(stale.agents[1].cumulativePnl,10);
  battle.agents[0].orders[0].status='WON';
  battle.agents[0].cash=100; battle.agents[0].equity=100;
  const settled=equityEstimate(battle,valuation,now);
  assert.equal(settled.cumulativePnl,10);
  assert.equal(settled.agents[0].cumulativePnl,0);
  assert.equal(settled.agents[1].cumulativePnl,10);
});

test('cumulative P/L stays unavailable without a known initial principal', () => {
  const battle={id:'missing',agents:[{id:'A',cash:80,equity:80,orders:[]}]};
  const result=equityEstimate(battle,null);
  assert.equal(result.cumulativePnl,null);
  assert.equal(result.agents[0].cumulativePnl,null);
});

test('entry reference comes only from the matching saved market snapshot', () => {
  const order = {start:123, topicId:'btc-round', intent:{snapshotId:7}};
  const snapshot = {id:7, type:'MARKET_SNAPSHOT', roundId:'123', market:{marketTopicId:'btc-round'}, indicators:{price:77270.31}};
  assert.equal(betReferencePrice(order, new Map([[7,snapshot]])), 77270.31);
  assert.equal(betReferencePrice(order, new Map()), null);
  assert.equal(betReferencePrice({...order,intent:undefined},new Map([[7,snapshot]])),null);
  for (const patch of [{roundId:'124'}, {market:{marketTopicId:'other'}}, {indicators:{price:null}}, {indicators:{price:-1}}, {indicators:{price:Infinity}}]) {
    assert.equal(betReferencePrice(order,new Map([[7,{...snapshot,...patch}]])),null);
  }
});

test('winning return uses saved exact shares, not rounded displayed odds or current prices', () => {
  assert.deepEqual(winningReturn({ amount: 10, quote: { shares: 18.125, odds: 1.81 } }), { odds: 1.8125, payout: 18.125, profit: 8.125, loss: -10 });
  assert.equal(winningReturn({ amount: 10, quote: { odds: 1.8 } }), null);
  assert.equal(winningReturn({ amount: 10, quote: { shares: NaN } }), null);
  assert.equal(winningReturn({ amount: 0, quote: { shares: 1 } }), null);
  assert.equal(winningReturn({ amount: 10, quote: { odds: 1.8, source: 'offline-simulated' } }).profit, 8);
});

test('live price requires matching symbol, positive price, and recent exchange trade time', () => {
  const now = 1800000000000, quote = { symbol: 'BTCUSDT', price: 65000, tradeTime: now };
  assert.equal(freshPrice(quote, 'BTCUSDT', now), true);
  for (const patch of [{ symbol: 'ETHUSDT' }, { price: null }, { price: -1 }, { tradeTime: now - 15001 }, { tradeTime: now + 2001 }, { tradeTime: undefined }]) {
    assert.equal(Boolean(freshPrice({ ...quote, ...patch }, 'BTCUSDT', now)), false);
  }
});
