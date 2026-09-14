const test=require('node:test'),assert=require('node:assert/strict');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const {normalizePolicy}=require('../ai-decision');
const {createPublicPracticeSource}=require('../simulation-market-source');
function fixture({delay=false,realtimeEntry=false}={}) {
 const slot=1800000000000;let time=slot-45000,price=100,bookPrice=.4,release;
 const calls=[];
 const policy=normalizePolicy({id:'a',strategy:'orderFlow',maxStakePct:10,indicators:['takerFlow','orderbook','spread','priceChange','longReturns','odds']},'a');
 const topic=s=>({marketTopicId:String(s),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:s,endDate:s+ROUND,
  markets:[{status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
 const source={marketFor:async s=>topic(s),detail:async s=>topic(+s),book:async(_,d)=>({tokenId:d==='UP'?'up':'down',timestamp:time,asks:[{price:bookPrice,size:10000}]})};
 const indicators={snapshot:async()=>({dataTimestamp:time,price,indicatorCandleCloseTime:time-1000,
  priceChangePct:{oneMinute:.1,fiveMinutes:.3},takerFlow:{buyRatio:.7,netBase:40,totalBase:100},
  spotOrderBookImbalance:.3,spread:{basisPoints:1},longReturns:{fifteenMinutes:.3,sixtyMinutes:1}})};
 const provider={describe:()=>({mode:'external'}),decide:async(input,opts)=>{
  calls.push({input,at:time});opts.onRequest?.({fixture:true});
  if(delay && calls.length===1)await new Promise(resolve=>{release=resolve});
  return {round_id:input.market.round_id,action:'BET',direction:'UP',stake_usdt:10,stake_pct:10,confidence:90,risk_mode:'NORMAL',factors:[],reason:'fixture',warnings:[],data_fresh:true};
 }};
 const sim=createPredictionSimulation({source,indicatorSource:indicators,decisionProvider:provider,policyFor:()=>policy,agentPolicies:[policy],now:()=>time,realtimeEntry});
 return {sim,calls,slot,source,async prepare(){await sim.tick();await new Promise(r=>setImmediate(r));},
  async at(delta){time=slot+delta;await sim.tick();},price:v=>{price=v},oddsPrice:v=>{bookPrice=v},release:()=>release?.()};
}
test('AI starts 45 seconds early without reserving funds and its result is reused against fresh evidence',async()=>{
 const f=fixture();await f.prepare();
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].at,f.slot-45000);
 assert.equal(f.calls[0].input.market.entry_mode,'precompute');
 assert.equal(f.sim.snapshot().agents[0].preparation.status,'ready');
 assert.equal(f.sim.snapshot().agents[0].cash,100);assert.equal(f.sim.snapshot().agents[0].orders.length,0);
 await f.at(0);assert.equal(f.calls.length,1);
 const a=f.sim.snapshot().agents[0];assert.equal(a.orders.length,1);assert.equal(a.cash,90);
 assert.ok(f.sim.snapshot().auditTrail.some(e=>e.type==='PRECOMPUTE_REUSED'));
 assert.ok(f.sim.snapshot().auditTrail.some(e=>e.type==='ENTRY_EXECUTION_CHECK'));
 await f.at(1000);assert.equal(f.sim.snapshot().agents[0].orders.length,1);
});
test('fresh odds may reject a ready forecast',async()=>{
 const f=fixture();await f.prepare();f.oddsPrice(.99);await f.at(0);
 assert.equal(f.sim.snapshot().agents[0].orders.length,0);
});
test('large underlying price drift skips the prepared bet',async()=>{
 const f=fixture();await f.prepare();f.price(101);await f.at(0);
 assert.equal(f.sim.snapshot().agents[0].orders.length,0);
 assert.equal(f.sim.snapshot().agents[0].reason,'PRECOMPUTE_PRICE_MOVED');
});
test('pause invalidates an in-flight precompute result',async()=>{
 const f=fixture({delay:true});await f.prepare();f.sim.setEnabled(false);f.release();await new Promise(r=>setImmediate(r));
 await f.at(0);assert.equal(f.sim.snapshot().agents[0].orders.length,0);assert.equal(f.sim.snapshot().agents[0].preparation,null);
});
test('slow preparation does not hold the round scheduler busy',async()=>{
 const f=fixture({delay:true});await f.prepare();await f.at(0);
 assert.equal(f.sim.snapshot().roundCount,1);f.release();await new Promise(r=>setImmediate(r));
 assert.equal(f.sim.snapshot().agents[0].orders.length,1);assert.equal(f.calls.length,2);
});
test('market identity changes cannot reuse an old forecast',async()=>{
 const f=fixture();await f.prepare();
 f.source.refreshMarket=async(m)=>({...m,marketTopicId:'replacement'});
 await f.at(0);assert.equal(f.calls.length,2);assert.ok(!f.sim.snapshot().auditTrail.some(e=>e.type==='PRECOMPUTE_REUSED'));
});
test('practice preview is explicitly simulated and cannot place a pre-round bet',async()=>{
 const now=()=>1800000000000-45000,source=createPublicPracticeSource({now,fetchImpl:()=>{throw Error('must not fetch future candle')}});
 const market=await source.marketFor(1800000000000,'BTCUSDT',ROUND),book=await source.previewBook(market,'UP');
 assert.equal(book.simulated,true);assert.equal(book.source,'public-spot');
 await assert.rejects(source.book(market,'UP'),/QUOTE_WINDOW_MISSED/);
});
