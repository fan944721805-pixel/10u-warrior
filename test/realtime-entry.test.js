const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPredictionSimulation, ROUND } = require('../prediction-sim');
const { normalizePolicy, createMockDecisionProvider, buildDecisionContext } = require('../ai-decision');
const { createSimulationBattles, normalizeBattleConfig, limitExternalDecisionProvider } = require('../simulation-battles');
const { evaluateDivination } = require('../public/strategy-catalog');

function fixture({ realtimeEntry = true, maxRounds = null, file, decide, agentCount = 1, limited = false } = {}) {
  const slot = 1800000000000;
  let time = slot - 20000, signal = false, denyEntry = false, executionPrice = .5;
  const calls = [], counts = { indicators: 0, books: 0, detail: 0 };
  const policy = normalizePolicy({id:'flow',strategy:'orderFlow',indicators:['takerFlow','orderbook','spread','priceChange','longReturns','odds'],maxStakePct:15},'flow');
  const topic = start => ({marketTopicId:String(start),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+ROUND,
    markets:[{status:time>=start+ROUND?'RESOLVED':'REGISTERED',tradingStatus:denyEntry?'CLOSED':'OPEN',outcomes:[{name:'Up',tokenId:'up',winner:time>=start+ROUND},{name:'Down',tokenId:'down',winner:false}]}]});
  const source = {marketFor:async start=>topic(start),detail:async id=>{counts.detail++;return topic(Number(id));},
    book:async (_,direction)=>{counts.books++;return {tokenId:direction==='UP'?'up':'down',timestamp:time,asks:[{price:executionPrice,size:10000}]};}};
  const indicatorSource = {snapshot:async()=>{counts.indicators++;return {dataTimestamp:time,indicatorCandleCloseTime:Math.floor(time/60000)*60000-1,price:100,
    priceChangePct:{oneMinute:signal?.1:0,fiveMinutes:signal?.3:0},takerFlow:{buyRatio:signal?.7:.5,netBase:signal?40:0,totalBase:100},
    spotOrderBookImbalance:signal?.3:0,spread:{basisPoints:1},longReturns:{fifteenMinutes:signal?.3:0,sixtyMinutes:signal?1:0}};}};
  const mock = createMockDecisionProvider();
  const decisionProvider = {describe:()=>({mode:'mock'}),decide:async input=>{calls.push(structuredClone(input));return decide?decide(input):mock.decide(input);}};
  const policies=Array.from({length:agentCount},(_,index)=>({...policy,id:index?`flow-${index}`:'flow'}));
  const options = {source,indicatorSource,decisionProvider:limited?limitExternalDecisionProvider({...decisionProvider,describe:()=>({mode:'external'})},1):decisionProvider,
    policyFor:id=>policies.find(p=>p.id===id),agentPolicies:policies,now:()=>time,realtimeEntry,maxRounds,file};
  let sim = createPredictionSimulation(options);
  return {slot,source,indicatorSource,decisionProvider,options,calls,counts,get sim(){return sim;},
    at:async delta=>{time=slot+delta;await sim.tick();},prepare:()=>sim.tick(),signal:value=>{signal=value;},
    closeMarket:()=>{denyEntry=true;},price:value=>{executionPrice=value;},setTime:delta=>{time=slot+delta;},restore:()=>{sim=createPredictionSimulation(options);return sim;}};
}
const skip = input => ({round_id:input.market.round_id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:50,risk_mode:'WAIT',factors:[],reason:'fixture wait',data_fresh:true});

test('signal-only polling makes no model calls or repeated audit writes without a signal', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-entry-'));
  try {
    const file=path.join(dir,'ledger.json'),f=fixture({file});await f.prepare();await f.at(0);
    const initial=fs.readFileSync(file,'utf8');
    for(let t=1000;t<=59000;t+=1000)await f.at(t);
    assert.equal(f.calls.length,0);assert.equal(f.counts.indicators,13);
    assert.equal(fs.readFileSync(file,'utf8'),initial);
    f.signal(true);await f.at(60000);
    const order=f.sim.snapshot().agents[0].orders[0];
    assert.ok(order);assert.equal(order.placedAt,f.slot+60000);
    assert.equal(f.calls[0].market.seconds_to_close,240);assert.equal(f.calls[0].market.entry_mode,'signal');
    assert.equal(order.intent.expiresAt,f.slot+70000);assert.equal(f.counts.detail,1);
    const reads=f.counts.indicators;
    for(let t=61000;t<270000;t+=1000)await f.at(t);
    assert.equal(f.calls.filter(i=>i.market.round_id===String(f.slot)).length,1);assert.equal(f.counts.indicators,reads+1);
    assert.equal(f.sim.snapshot().agents[0].orders.length,1);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('off retains opening review; enabling adds signal review, off stops it again', async () => {
  const f=fixture({realtimeEntry:false,decide:skip});await f.prepare();await f.at(0);
  assert.equal(f.calls.length,1);f.signal(true);await f.at(65000);assert.equal(f.calls.length,1);
  f.sim.setRealtimeEntry(true);await f.at(70000);assert.equal(f.calls.length,2);
  f.sim.setRealtimeEntry(false);await f.at(125000);assert.equal(f.calls.length,2);
  await f.at(ROUND);assert.equal(f.calls.length,3);
});

test('same signal is not polled through AI; new candle signals respect cooldown across restore', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-entry-'));
  try {
    const f=fixture({file:path.join(dir,'ledger.json'),decide:skip});f.signal(true);await f.prepare();await f.at(0);
    await f.at(5000);await f.at(35000);assert.equal(f.calls.length,1);
    f.restore();await f.at(40000);assert.equal(f.calls.length,1);
    await f.at(60000);assert.equal(f.calls.length,2);
    await f.at(65000);assert.equal(f.calls.length,2);
    assert.equal(f.sim.snapshot().config.realtimeEntry,true);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('disabling or pausing during an AI request prevents a late order', async () => {
  for(const stop of [sim=>sim.setRealtimeEntry(false),sim=>sim.setEnabled(false),sim=>sim.end()]) {
    let release,started;const blocked=new Promise(r=>release=r),called=new Promise(r=>started=r);
    const f=fixture({decide:async input=>{started();await blocked;return createMockDecisionProvider().decide(input);}});
    await f.prepare();await f.at(0);f.signal(true);const pending=f.at(60000);await called;
    stop(f.sim);release();await pending;
    assert.equal(f.sim.snapshot().agents[0].orders.length,0);
  }
});

test('fresh execution market and odds must still permit entry', async () => {
  for(const change of [f=>f.closeMarket(),f=>f.price(.99)]) {
    let f;f=fixture({decide:async input=>{const raw=await createMockDecisionProvider().decide(input);change(f);return raw;}});
    await f.prepare();await f.at(0);f.signal(true);await f.at(60000);
    assert.equal(f.sim.snapshot().agents[0].orders.length,0);
    assert.match(f.sim.snapshot().agents[0].reason,/QUOTE_WINDOW_MISSED|AI_EDGE_LOST_TO_SLIPPAGE/);
  }
});

test('last configured round remains open for signals, but the final 30 seconds cannot enter', async () => {
  const f=fixture({maxRounds:1});await f.prepare();await f.at(0);
  assert.equal(f.sim.snapshot().status,'running');f.signal(true);await f.at(270000);
  assert.equal(f.calls.length,0);await f.at(ROUND);
  assert.equal(f.sim.snapshot().status,'ended');assert.equal(f.sim.snapshot().roundCount,1);
});

test('frozen oracle draw survives changed indicators while alignment can change', () => {
  const data={priceChangePct:{oneMinute:.1,fiveMinutes:.3},rsi14:65,ema:{ema5:105,ema20:100},spotOrderBookImbalance:.3,atr:{percent:.2},spread:{basisPoints:1},longReturns:{fifteenMinutes:.7,sixtyMinutes:1.5},marketOdds:{up:2,down:2}};
  for(const strategy of ['fengShui','diviner']) {
    const first=evaluateDivination(strategy,data,{roundId:'round',asset:'BTCUSDT'}).divination;
    const next=evaluateDivination(strategy,{...data,spotOrderBookImbalance:-.4,spread:{basisPoints:20}},{roundId:'round',asset:'BTCUSDT',frozenReading:first}).divination;
    assert.deepEqual(next.draw,first.draw);assert.equal(next.seed,first.seed);assert.equal(next.omen,first.omen);assert.equal(next.verdict,'WAIT');
  }
});

test('queued, cancelled reviews never reach the external model', async () => {
  let release,calls=0;const blocked=new Promise(r=>release=r);
  const limited=limitExternalDecisionProvider({describe:()=>({mode:'external'}),decide:async()=>{calls++;await blocked;return {}; }},1);
  const first=limited.decide({},{});const second=limited.decide({},{isCancelled:()=>true});
  const rejected=assert.rejects(second,{code:'AI_DEADLINE_EXPIRED'});
  release();await first;await rejected;assert.equal(calls,1);
});

test('later seats retry a signal after queue expiry instead of starving behind earlier seats', async () => {
  let f;
  f=fixture({agentCount:2,limited:true,decide:input=>{if(f.calls.length===1)f.setTime(11000);return skip(input);}});
  f.signal(true);await f.prepare();await f.at(0);
  assert.equal(f.calls.length,1);
  assert.equal(f.sim.snapshot().agents[1].reason,'AI_DEADLINE_EXPIRED');
  await f.at(35000);
  assert.equal(f.calls.length,2);assert.equal(f.calls[1].policy.agent_id,'flow-1');
  await f.at(40000);assert.equal(f.calls.length,2);
});

test('all eight seats can enter on signals and share observation reads within a battle', async () => {
  const f=fixture({agentCount:8});await f.prepare();await f.at(0);
  assert.equal(f.calls.length,0);assert.equal(f.counts.indicators,2);assert.equal(f.counts.books,4);
  f.signal(true);await f.at(60000);
  assert.equal(f.calls.length,8);assert.equal(f.counts.indicators,3);
  assert.ok(f.sim.snapshot().agents.every(a=>a.orders.length===1&&a.reconciliation.matched));
});

test('battle setting is typed, isolated, and persisted', async () => {
  assert.equal(normalizeBattleConfig({}).realtimeEntry,false);
  assert.throws(()=>normalizeBattleConfig({realtimeEntry:'true'}),/INVALID_REALTIME_ENTRY/);
  const f=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-entry-manager-'));
  try {
    const options={...f.options,file:path.join(dir,'ledger.json'),leaseEnabled:false};
    let manager=createSimulationBattles(options);
    const a=manager.create('A',{}),b=manager.create('B',{});
    manager.setRealtimeEntry(true,a.id);
    assert.equal(manager.snapshot(a.id).config.realtimeEntry,true);assert.equal(manager.snapshot(b.id).config.realtimeEntry,false);
    manager=createSimulationBattles(options);
    assert.equal(manager.snapshot(a.id).config.realtimeEntry,true);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
