const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cat=require('../public/strategy-catalog');
const ai=require('../ai-decision');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const {calculateIndicatorSnapshot}=require('../market-indicators');
const {rows,depth}=require('./fixtures/indicator-series.cjs');
const slot=1800000000000;
function data(now=slot){return calculateIndicatorSnapshot({symbol:'BTCUSDT',klines:rows(now),depth,receivedAt:now});}
function context(strategy,snapshot=data(),urge=100,battleEmotion=0){
  const policy=ai.normalizePolicy({id:strategy,strategy,actionUrge:urge},strategy);
  const input=ai.buildDecisionContext({policy,battleEmotion,indicators:snapshot,market:{roundId:slot,roundDurationSeconds:300,secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:slot},account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0}});
  return {policy,input,indicators:snapshot,now:slot};
}
const skip=input=>({round_id:input.market.round_id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:0,risk_mode:'WAIT',factors:[],reason:'fixture analysis',data_fresh:true,warnings:[],...(input.divination?{divination:{seed:input.divination.seed,reading:'fixed cards',verdict:'WAIT'}}:{})});
test('arena slider has no saturation below 100 and monotonically raises every personality',()=>{
  for(const p of Object.values(cat.profiles)){
    let previous=p.actionUrge;
    for(let v=1;v<=100;v++){const current=cat.effectiveActionUrge(p.actionUrge,v);assert.ok(current>previous);if(v<100)assert.ok(current<100);previous=current;}
  }
});
test('higher urge never turns Super AI chop into conflict on identical indicators',()=>{
  const snapshot=data();Object.assign(snapshot,{priceChangePct:{oneMinute:-.1,fiveMinutes:0},ema:{ema5:100,ema20:100},macd:{line:0,signal:0,histogram:0},adx:{adx:18,plusDI:20,minusDI:20},rsi14:30,bollinger:{...snapshot.bollinger,percentB:.1},spotOrderBookImbalance:.2,takerFlow:{...snapshot.takerFlow,buyRatio:.6},longReturns:{fifteenMinutes:0,sixtyMinutes:0},atr:{value:.1,percent:.1},spread:{...snapshot.spread,basisPoints:1},volatility:{...snapshot.volatility,perMinutePct:.1}});
  const low=cat.evaluateCoreStrategy('smart',snapshot,60),high=cat.evaluateCoreStrategy('smart',snapshot,100);
  assert.equal(low.regime,'chop');assert.equal(high.regime,'chop');assert.ok(high.score>=low.score&&high.score>1.5);
});
test('weak model opinions permit only a small normal probe; stale, invalid and oversized bets fail',()=>{
  const s=data();Object.assign(s,{priceChangePct:{oneMinute:0,fiveMinutes:0},momentum:0,roc:{tenMinutes:0,twentyMinutes:0},takerFlow:{buyRatio:.5,netBase:0,totalBase:100},spotOrderBookImbalance:0,longReturns:{fifteenMinutes:0,sixtyMinutes:0}});
  const f=context('aggressive',s);f.input.policy.review_mode='model';
  const raw={...skip(f.input),action:'BET',direction:'UP',stake_usdt:5,stake_pct:5,confidence:70,risk_mode:'NORMAL'};
  assert.equal(ai.validateDecision(raw,f).probe,true);
  assert.throws(()=>ai.validateDecision({...raw,stake_usdt:6,stake_pct:6},f),{code:'AI_PROBE_STAKE_OVER_CAP'});
  assert.throws(()=>ai.validateDecision({...raw,risk_mode:'ALL_IN'},f),{code:'AI_PROBE_STAKE_OVER_CAP'});
  assert.throws(()=>ai.validateDecision(raw,{...f,now:slot+11000}),{code:'AI_DATA_STALE'});
  f.input.account.balance=10;f.input.account.initial_balance=10;
  assert.equal(ai.validateDecision({...raw,stake_usdt:5,stake_pct:50},f).stake,5);
  f.input.account.balance=100;f.input.account.initial_balance=100;
  f.input.policy.action_urge=40;assert.throws(()=>ai.validateDecision(raw,f),{code:'AI_STRATEGY_CONDITION_NOT_MET'});
});
test('countertrade appetite relaxes loss requirements but Show-off always requires CZ and opposite direction',()=>{
  const s=data();s.atr.percent=.2;s.spread.basisPoints=1;
  const peers={roundId:String(slot),asset:'BTCUSDT',agents:[{id:'cz',strategy:'czBrother',lossStreak:0,order:{id:'cz-order',direction:'UP',amount:10}}]};
  const evaluate=(strategy,urge,targets=peers)=>cat.evaluateCharacter(strategy,s,urge,{agentId:'other',asset:'BTCUSDT',roundId:slot,peers:targets});
  assert.equal(evaluate('contrarian',50).score,0);assert.equal(evaluate('contrarian',80).score,0);assert.ok(evaluate('contrarian',100).score<0);
  peers.agents[0].lossStreak=1;assert.ok(evaluate('contrarian',80).score<0);
  for(const urge of [0,50,100]){assert.ok(evaluate('showoff',urge).score<0);assert.equal(evaluate('showoff',urge,{...peers,agents:[]}).score,0);}
  const f=context('showoff',s);f.input.peers=peers;f.input.policy.review_mode='model';
  const raw={...skip(f.input),action:'BET',direction:'UP',stake_usdt:5,stake_pct:5,confidence:90,risk_mode:'NORMAL'};
  assert.throws(()=>ai.validateDecision(raw,f),{code:'AI_STRATEGY_CONDITION_NOT_MET'});
  assert.equal(ai.validateDecision({...raw,direction:'DOWN'},f).direction,'DOWN');
});
test('long-only early entries use probes; high urge never permits DOWN',()=>{
  const s=data();Object.assign(s,{priceChangePct:{oneMinute:.1,fiveMinutes:.2},ema:{ema5:100,ema20:101},macd:{line:0,signal:0,histogram:0},adx:{adx:20,plusDI:22,minusDI:20},longReturns:{fifteenMinutes:.2,sixtyMinutes:0},volumeRatio:.8,spotOrderBookImbalance:.2,atr:{value:.1,percent:.1},spread:{...s.spread,basisPoints:1}});
  for(const strategy of ['czBrother','firstLady']){
    const f=context(strategy,s);assert.equal(cat.evaluateCharacter(strategy,s,0,{asset:'BTCUSDT'}).score,0);
    assert.ok(ai.strategySignal(f.input).score>0);assert.equal(ai.strategySignal(f.input).probe,true);
    f.input.policy.review_mode='model';assert.equal(ai.betPermission(f.input,'DOWN').allowed,false);
    const raw={...skip(f.input),action:'BET',direction:'UP',stake_usdt:5,stake_pct:5,confidence:85,risk_mode:'NORMAL'};
    assert.equal(ai.validateDecision(raw,f).probe,true);
  }
});
test('neutral cards can consult market at high urge without changing the frozen omen or cards',()=>{
  const s=data();s.atr.percent=.1;s.spread.basisPoints=1;
  const frozen={system:'diviner',roundId:String(slot),asset:'BTCUSDT',seed:'fixed',omen:'WAIT',draw:{cards:[{card:0,reversed:false},{card:1,reversed:false},{card:7,reversed:false}]}};
  const run=actionUrge=>cat.evaluateDivination('diviner',{...s,marketOdds:{up:2,down:2}},{roundId:slot,frozenReading:frozen,actionUrge});
  assert.equal(run(50).score,0);const high=run(100);assert.ok(high.score>0);assert.equal(high.probe,true);assert.equal(high.divination.omen,'WAIT');assert.deepEqual(high.divination.draw,frozen.draw);assert.equal(high.divination.seed,'fixed');
});
function simulationFixture(file,decide=skip){
  let now=slot-20000,broken=false;const calls=[];
  const strategies=['aggressive','smart','priceAction','diviner','czBrother','firstLady','contrarian','showoff'];
  const policies=strategies.map(strategy=>ai.normalizePolicy({id:strategy,strategy,actionUrge:100},strategy));
  const topic=start=>({marketTopicId:String(start),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+ROUND,markets:[{status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
  const source={marketFor:async start=>topic(start),detail:async id=>topic(Number(id)),book:async(_,direction)=>({tokenId:direction==='UP'?'up':'down',timestamp:now,asks:[{price:.5,size:10000}],bids:[{price:.5,size:10000}]})};
  const indicatorSource={snapshot:async()=>{if(broken)throw Object.assign(Error('fixture'),{code:'INDICATOR_SOURCE_UNAVAILABLE'});return data(now);}};
  const provider={describe:()=>({mode:'deepseek',simulated:false}),decide:async input=>{calls.push(input);return decide(input);}};
  const options={file,source,indicatorSource,decisionProvider:provider,agentPolicies:policies,policyFor:id=>policies.find(p=>p.id===id),now:()=>now,realtimeEntry:true};
  let sim=createPredictionSimulation(options);
  return {calls,options,get sim(){return sim;},at:async delta=>{now=slot+delta;await sim.tick();},break:value=>broken=value,restore:()=>sim=createPredictionSimulation(options)};
}
test('all seven independent seats review at opening, cooldown limits calls, and Show-off waits for CZ',async()=>{
  const f=simulationFixture();await f.at(-20000);await f.at(0);
  assert.deepEqual(f.calls.map(i=>i.policy.strategy).sort(),['aggressive','smart','priceAction','diviner','czBrother','firstLady','contrarian'].sort());
  assert.equal(f.sim.snapshot().agents.find(a=>a.id==='showoff').waitReason,'WAIT_CZ_BET');
  await f.at(5000);await f.at(55000);assert.equal(f.calls.length,7);
  await f.at(60000);assert.equal(f.calls.length,14);
  await f.at(269000);assert.equal(f.calls.length,21);await f.at(270000);assert.equal(f.calls.length,21);
});
test('same-round recovery preserves cards and review budget across restart and resumes unfilled seats',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-participation-'));
  try{
    const file=path.join(dir,'ledger.json'),f=simulationFixture(file);await f.at(-20000);await f.at(0);
    const before=JSON.parse(fs.readFileSync(file));f.break(true);await f.at(60000);assert.ok(f.sim.snapshot().recovery);
    f.restore();f.break(false);await f.at(65000);assert.equal(f.sim.snapshot().recovery,null);
    const recovered=JSON.parse(fs.readFileSync(file));assert.equal(recovered.entryRound.slot,slot);assert.deepEqual(recovered.entryRound.oracles,before.entryRound.oracles);assert.deepEqual(recovered.entryRound.attempts,before.entryRound.attempts);
    await f.at(65001);assert.equal(f.calls.length,14);assert.equal(f.sim.snapshot().roundCount,1);
    await f.at(65002);assert.equal(f.calls.length,14);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('reviews have a per-round ceiling even if the market changes repeatedly',()=>{
  const f=context('smart');let prev;for(let n=0;n<6;n++){const r=ai.modelReview(f.input,n,prev,slot+n*60000);assert.ok(r.key);prev={at:slot+n*60000,keys:[...(prev?.keys||[]),r.key],count:n+1};}
  assert.equal(ai.modelReview(f.input,99,prev,slot+400000).reason,'AI_REVIEW_LIMIT');
});
test('stake choices use exact cents and matching percentages after fractional settlement balances',()=>{
  const f=context('diviner');f.input.account.balance=118.87573964;
  const choices=ai.decisionStakeChoices(f.input);
  for(const row of choices.normal){assert.equal(row.stake_usdt,11.88);assert.ok(Math.abs(row.stake_pct-row.stake_usdt/f.input.account.balance*100)<.000001);assert.notEqual(row.stake_pct,10);}
  assert.ok(choices.normal.length);assert.match(ai.decisionPrompt(f.input),/copy BOTH stake_usdt and stake_pct/);
});
test('same-round recovery preserves filled orders and never re-enables a manual pause',async()=>{
  for(const pause of [false,true]){
    const mock=ai.createMockDecisionProvider();
    const f=simulationFixture(undefined,input=>input.policy.strategy==='aggressive'?mock.decide(input):skip(input));
    await f.at(-20000);await f.at(0);
    const before=f.sim.snapshot().agents.find(a=>a.id==='aggressive');assert.equal(before.orders.length,1);
    f.break(true);await f.at(60000);if(pause)f.sim.setEnabled(false);
    f.break(false);await f.at(65000);await f.at(70000);
    const after=f.sim.snapshot();assert.equal(after.enabled,!pause);assert.equal(after.agents.find(a=>a.id==='aggressive').orders.length,1);
    assert.equal(after.agents.find(a=>a.id==='aggressive').cash,before.cash);
  }
});

test('normal-capital personality stake choices respect the 5U floor, cents, and existing hard caps',()=>{
  for(const strategy of Object.keys(cat.profiles))for(const balance of [4.99,5,10,16.86,49.99,99.99,100,118.87573964,1000]){
    const f=context(strategy);f.input.account.balance=balance;f.input.account.initial_balance=balance;f.input.policy.review_mode='model';
    assert.equal(f.input.policy.min_stake_usdt,5);
    const choices=ai.decisionStakeChoices(f.input);
    for(const row of [...choices.normal,...(choices.probe?[choices.probe]:[]),...(choices.all_in?[choices.all_in]:[])]){
      assert.ok(row.stake_usdt>=5,`${strategy} ${balance}: floor`);
      assert.ok(row.stake_usdt<=balance,`${strategy} ${balance}: balance`);
      assert.ok(row.stake_pct<=f.policy.maxStakePct+.000001,`${strategy} ${balance}: configured cap`);
      if(row.risk_mode!=='ALL_IN')assert.ok(row.stake_pct<=cat.profiles[strategy].normalMaxStakePct+.000001);
      assert.ok(Math.abs(row.stake_usdt*100-Math.round(row.stake_usdt*100))<1e-8);
      assert.ok(Math.abs(row.stake_pct-row.stake_usdt/balance*100)<.000001);
    }
    if(balance<5)assert.deepEqual(choices,{normal:[],probe:null});
  }
});

test('the execution gate rejects sub-5U bets and raises normal tiers only within hard caps',()=>{
  const f=context('aggressive');f.input.policy.review_mode='model';f.input.account.balance=16.86;f.input.account.initial_balance=16.86;
  const raw={...skip(f.input),action:'BET',direction:'UP',stake_usdt:5,stake_pct:5/16.86*100,confidence:60,risk_mode:'NORMAL'};
  assert.equal(ai.validateDecision(raw,f).stake,5);
  for(const amount of [1,2.72,4.99])assert.throws(()=>ai.validateDecision({...raw,stake_usdt:amount,stake_pct:amount/16.86*100},f),{code:'AI_STAKE_BELOW_MINIMUM'});
  f.policy.maxStakePct=10;f.input.policy.max_stake_pct=10;f.input.policy.allow_all_in=false;
  assert.equal(ai.decisionStakeChoices(f.input).normal.length,0);
  assert.throws(()=>ai.validateDecision(raw,f),{code:'AI_STAKE_OVER_CAP'});
});

test('arena tilt 0/50/100 supplies and enforces personality-specific probe budgets',()=>{
  const s=data();Object.assign(s,{priceChangePct:{oneMinute:0,fiveMinutes:0},momentum:0,roc:{tenMinutes:0,twentyMinutes:0},takerFlow:{buyRatio:.5,netBase:0,totalBase:100},spotOrderBookImbalance:0,longReturns:{fifteenMinutes:0,sixtyMinutes:0}});
  for(const [emotion,expected] of [[0,5],[50,22.5],[100,40]]){
    const f=context('aggressive',s);f.input.policy.review_mode='model';f.input.policy.battle_emotion=emotion;
    assert.equal(ai.betPermission(f.input,'UP').maxProbePct,expected);
    assert.equal(ai.decisionStakeChoices(f.input).probe.stake_usdt,expected);
    const raw={...skip(f.input),action:'BET',direction:'UP',stake_usdt:expected,stake_pct:expected,confidence:70,risk_mode:'NORMAL'};
    assert.equal(ai.validateDecision(raw,f).probe,true);
    assert.throws(()=>ai.validateDecision({...raw,stake_usdt:expected+.1,stake_pct:expected+.1},f),{code:'AI_PROBE_STAKE_OVER_CAP'});
    const prompt=ai.decisionPrompt(f.input);assert.match(prompt,/minimum stake of 5 USDT/);
    assert.equal(prompt.includes('High-tilt decision preference'),emotion>=70);
  }
  for(const strategy of Object.keys(cat.profiles)){
    const cap=cat.probeStakePercent({strategy,balance:100,battleEmotion:100,maxStakePct:5});
    assert.equal(cap,cat.profiles[strategy].fixedStakeChoices?0:5,`${strategy}: user hard cap wins over tilt; skip if no discrete size fits`);
  }
});

test('paper execution cannot debit a subminimum model bet and does not call models below 5U balance',async()=>{
  for(const amount of [4.99,5]){
    const f=simulationFixture(undefined,input=>input.policy.strategy==='aggressive'?{...skip(input),action:'BET',direction:'UP',stake_usdt:amount,stake_pct:amount,confidence:70,risk_mode:'NORMAL'}:skip(input));
    await f.at(-20000);await f.at(0);
    const agent=f.sim.snapshot().agents.find(a=>a.policy.strategy==='aggressive');
    assert.equal(agent.orders.length,amount===5?1:0);assert.equal(agent.cash,amount===5?95:100);
  }
  const f=simulationFixture();const sim=createPredictionSimulation({...f.options,initialBalance:4.99});
  await sim.tick();await f.at(0);f.calls.length=0;await sim.tick();
  assert.equal(f.calls.length,0);assert.ok(sim.snapshot().agents.every(a=>a.orders.length===0&&a.cash===4.99));
});

test('high-tilt personas have distinct stakes and never exceed their configured caps',()=>{
  const high={aggressive:40,smart:20,priceAction:20,diviner:10,czBrother:20,firstLady:30,contrarian:15,showoff:20};
  for(const [strategy,pct] of Object.entries(high)){
    assert.equal(cat.probeStakePercent({strategy,balance:100,battleEmotion:100}),pct);
    assert.ok(cat.normalStakePercent({strategy,balance:100,battleEmotion:100,confidence:60})>=pct);
  }
});

test('Gambler tilt 100 permits honest 65-confidence all-in without prior losses only on strong signals',async()=>{
  const low=context('aggressive',data(),100,0),high=context('aggressive',data(),100,100);
  const bet=f=>({...skip(f.input),action:'BET',direction:'UP',stake_usdt:100,stake_pct:100,confidence:65,risk_mode:'ALL_IN'});
  assert.equal(high.input.policy.all_in_confidence,65);
  assert.deepEqual(high.input.policy.all_in_requirements,{confidence:65,minimumEdge:.1,requiredLossStreak:0});
  assert.throws(()=>ai.validateDecision(bet(low),low),{code:'AI_ALL_IN_REJECTED'});
  assert.equal(ai.validateDecision(bet(high),high).stake,100);
  assert.equal((await ai.createMockDecisionProvider().decide(high.input)).risk_mode,'ALL_IN');
  assert.notEqual((await ai.createMockDecisionProvider().decide(low.input)).risk_mode,'ALL_IN');
  assert.throws(()=>ai.validateDecision({...bet(high),confidence:64},high),{code:'AI_ALL_IN_REJECTED'});
  high.input.market.up_odds=1.68;
  assert.throws(()=>ai.validateDecision(bet(high),high),{code:'AI_ALL_IN_REJECTED'});
  high.input.market.up_odds=2;high.policy.allowAllIn=false;
  assert.throws(()=>ai.validateDecision(bet(high),high),{code:'AI_ALL_IN_REJECTED'});
  assert.match(ai.decisionPrompt(low.input),/confidence >= 85/);
  assert.match(ai.decisionPrompt(high.input),/confidence >= 65/);
  assert.match(ai.decisionPrompt(high.input),/no previous loss is required/);
  const smart=context('smart',data(),100,100);
  assert.equal(smart.input.policy.all_in_confidence,88);
  assert.throws(()=>ai.validateDecision(bet(smart),smart),{code:'AI_ALL_IN_REJECTED'});
});

test('DeepSeek request carries the minimum and the same persona tilt/all-in rules enforced locally',async()=>{
  for(const tilt of [0,100]){
    const f=context('aggressive',data(),100,tilt);f.input.policy.review_mode='model';let sent;
    const provider=ai.createDeepSeekDecisionProvider({apiKey:'fixture-only',fetchImpl:async(_url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({...skip(f.input),skip_reason_code:'MODEL_UNCERTAIN'})}}]})};}});
    await provider.decide(f.input);
    const input=JSON.parse(sent.messages.find(m=>m.role==='user').content);
    assert.equal(input.policy.battle_emotion,tilt);assert.equal(input.policy.min_stake_usdt,5);
    assert.equal(input.policy.all_in_confidence,tilt===100?65:85);
    assert.equal(input.policy.risk_appetite,tilt===100?'HIGH':'STANDARD');
    assert.match(sent.messages.find(m=>m.role==='system').content,new RegExp('confidence >= '+(tilt===100?65:85)));
  }
});
