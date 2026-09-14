const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const controls=require('../global-controls.cjs');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const {normalizePolicy,buildDecisionContext,createMockDecisionProvider,entrySignal}=require('../ai-decision');
const {makeCard}=require('../public/card-lab-data');
const {emotionAdjustment}=require('../public/strategy-catalog');
function fixture({file,delay=false,delayEntry=false}={}){
 const slot=1800000000000;let time=slot-45000,resolved=false,release;
 const calls=[],policy=normalizePolicy({id:'card',cardSnapshot:makeCard('orderFlow','original',123)},'card');
 const topic=s=>({marketTopicId:String(s),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:s,endDate:s+ROUND,
   markets:[{status:resolved&&s<time?'RESOLVED':'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up',winner:resolved&&s<time?true:null},{name:'Down',tokenId:'down',winner:resolved&&s<time?false:null}]}]});
 const source={marketFor:async s=>topic(s),detail:async s=>topic(+s),book:async(_,d)=>({tokenId:d==='UP'?'up':'down',timestamp:time,asks:[{price:.4,size:10000}]})};
 const indicators=()=>({dataTimestamp:time,price:100,indicatorCandleCloseTime:time-1000,priceChangePct:{oneMinute:.1,fiveMinutes:.3},takerFlow:{buyRatio:.7,netBase:40,totalBase:100},spotOrderBookImbalance:.3,spread:{basisPoints:1},longReturns:{fifteenMinutes:.3,sixtyMinutes:1}});
 const mock=createMockDecisionProvider();
 const options={source,indicatorSource:{snapshot:async()=>indicators()},decisionProvider:{describe:()=>({mode:'external'}),decide:async(input)=>{calls.push(structuredClone(input));if(delay&&calls.length===1||delayEntry&&input.market.entry_mode!=='precompute')await new Promise(r=>release=r);return mock.decide(input);}},agentPolicies:[policy],policyFor:()=>policy,now:()=>time,file};
 let sim=createPredictionSimulation(options);
 return {get sim(){return sim;},slot,calls,policy,indicators,release:()=>release?.(),resolve:()=>resolved=true,
   at:async delta=>{time=slot+delta;await sim.tick();await new Promise(r=>setImmediate(r));},restore:()=>sim=createPredictionSimulation(options)};
}
test('global controls validate atomically, preserve existing orders and survive restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'card-controls-'));
 try{
  const f=fixture({file:path.join(dir,'ledger.json')});await f.at(-45000);await f.at(0);
  const old=f.sim.snapshot();assert.equal(old.agents[0].orders.length,1);
  const value={urge:45,tilt:60,gain:150,cooling:'slow',variance:70};
  const next=f.sim.setGlobalControls(value,0);assert.deepEqual(next.agents[0].orders,old.agents[0].orders);assert.equal(next.agents[0].cash,old.agents[0].cash);
  assert.equal(next.config.controlsRevision,1);assert.deepEqual(next.config.globalControls,value);
  assert.equal(f.sim.setGlobalControls(value,0).config.controlsRevision,1);
  assert.throws(()=>f.sim.setGlobalControls({...value,gain:201},1),{code:'INVALID_GLOBAL_CONTROLS'});
  assert.throws(()=>f.sim.setGlobalControls({...value,urge:50},0),{code:'CONTROLS_CHANGED'});
  assert.deepEqual(f.restore().snapshot().config.globalControls,value);
  f.sim.setEnabled(false);f.resolve();await f.at(ROUND);
  const expected=Math.max(0,8*f.policy.emotionSensitivity/100*1.5-3);
  assert.ok(Math.abs(f.sim.snapshot().agents[0].personalEmotion.tilt-expected)<1e-9);
  const settled=f.sim.snapshot().agents[0];await f.at(ROUND+20000);f.restore();await f.at(ROUND+40000);
  assert.deepEqual(f.sim.snapshot().agents[0].personalEmotion,settled.personalEmotion);
  assert.deepEqual(f.sim.snapshot().agents[0].orders,settled.orders);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('applying settings cancels an in-flight forecast and the fresh decision sees all five controls',async()=>{
 const f=fixture({delay:true});await f.at(-45000);assert.equal(f.calls.length,1);
 const value={urge:40,tilt:30,gain:200,cooling:'fast',variance:80};f.sim.setGlobalControls(value,0);f.release();await new Promise(r=>setImmediate(r));
 assert.equal(f.sim.snapshot().agents[0].preparation,null);await f.at(0);
 assert.equal(f.calls.length,2);assert.deepEqual(f.calls[1].policy.global_controls,value);
 assert.equal(f.calls[1].policy.controls_revision,1);
 assert.equal(f.calls[1].policy.action_urge,65+35*.4);assert.equal(f.calls[1].policy.decision_variance,35+65*.8);
 assert.ok(!f.sim.snapshot().auditTrail.some(e=>e.type==='PRECOMPUTE_REUSED'));
});
test('gain, decay and tilt use full precision; repetition and skipped wall-clock intervals do not accumulate events',()=>{
 const state=controls.restoreEmotion(null),c={...controls.DEFAULTS,gain:150,cooling:'slow'};
 controls.settleEmotion(state,'LOST',35,c);assert.ok(Math.abs(state.tilt-6.3)<1e-9);
 controls.coolEmotion(state,[300],c);assert.ok(Math.abs(state.tilt-3.3)<1e-9);
 controls.coolEmotion(state,[300],c);assert.ok(Math.abs(state.tilt-3.3)<1e-9);
 controls.coolEmotion(state,[300,3000000],c);assert.ok(Math.abs(state.tilt-.3)<1e-9);
 assert.equal(controls.effective(22.5,40),53.5);
 assert.throws(()=>controls.normalize({...c,urge:'40'}),{code:'INVALID_GLOBAL_CONTROLS'});
 const cautious=emotionAdjustment({strategy:'conservative',cardEmotion:true,battleEmotion:100,lossStreak:2,emotionSensitivity:100});
 assert.ok(cautious.stakeMultiplier<1);
});
test('card variance cannot increase reported evidence confidence or invert the technical direction',async()=>{
 const f=fixture(),raw=[];
 for(const variance of [0,100]){
  const input=buildDecisionContext({policy:f.policy,indicators:f.indicators(),market:{roundId:'r',secondsToClose:300,upOdds:2.5,downOdds:2.5,dataTimestamp:f.slot},account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0,personalEmotion:{tilt:22.5}},globalControls:{...controls.DEFAULTS,tilt:40,variance}});
  assert.equal(input.policy.battle_emotion,53.5);raw.push(await createMockDecisionProvider().decide(input));
 }
 assert.equal(raw[0].confidence,raw[1].confidence);assert.equal(raw[0].direction,'UP');assert.ok(raw[1].direction===null||raw[1].direction==='UP');
});

test('applying controls during a submitted model request cancels its not-yet-submitted bet',async()=>{
 const f=fixture({delayEntry:true});await f.at(-45000);
 f.sim.setGlobalControls({...controls.DEFAULTS,urge:30},0);
 const entering=f.at(0);while(f.calls.length<2)await new Promise(r=>setImmediate(r));
 f.sim.setGlobalControls({...controls.DEFAULTS,urge:60},1);f.release();await entering;
 assert.equal(f.sim.snapshot().agents[0].orders.length,0);assert.equal(f.sim.snapshot().agents[0].cash,100);
 const input=f.calls[1];const before=entrySignal(input,123);input.policy.controls_revision++;
 assert.notEqual(entrySignal(input,123).key,before.key);
});
