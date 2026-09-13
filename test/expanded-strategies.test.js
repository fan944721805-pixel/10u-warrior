const test=require('node:test');
const assert=require('node:assert/strict');
const {profiles,indicators:catalog,coreStrategies,effectiveActionUrge,emotionAdjustment,normalStakePercent}=require('../public/strategy-catalog');
const {normalizePolicy,buildDecisionContext,createMockDecisionProvider,createDeepSeekDecisionProvider,validateDecision,strategySignal}=require('../ai-decision');
const {calculateIndicatorSnapshot}=require('../market-indicators');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const {rows,depth}=require('./fixtures/indicator-series.cjs');
const now=1800000000000;
test('display names stay bound to the strategy rules and their automatic indicator sets',()=>{
  const labels={liangXi:'凉兮',fengShui:'风水师',diviner:'占卜师',aggressive:'10U战神',smart:'超级AI',conservative:'守财奴',trendFollowing:'跟风侠',meanReversion:'抄底摸顶王',breakout:'火箭哥',orderFlow:'大单侦探',volatilityGuard:'稳如老狗',consensus:'六票战神',priceAction:'蜡烛哥',czBrother:'CZ大表哥',contrarian:'逆行者',showoff:'装逼的人',firstLady:'一姐'};
  assert.deepEqual(Object.fromEntries(Object.entries(profiles).map(([key,profile])=>[key,profile.label])),labels);
  const coreIndicators={
    aggressive:['priceChange','momentum','roc','volume','takerFlow','orderbook','longReturns','odds'],
    smart:['priceChange','rsi','ema','macd','adx','bollinger','atr','volatility','volume','takerFlow','orderbook','spread','longReturns','odds'],
    conservative:['priceChange','rsi','ema','adx','atr','volatility','spread','orderbook','longReturns','odds'],
  };
  coreIndicators.liangXi=coreIndicators.smart;
  for(const key of coreStrategies){assert.deepEqual(profiles[key].recommended,coreIndicators[key],key);assert.deepEqual(profiles[key].required,coreIndicators[key],key);}
  assert.notDeepEqual(profiles.aggressive.recommended,profiles.smart.recommended);
  assert.notDeepEqual(profiles.smart.recommended,profiles.conservative.recommended);
  for(const key of ['trendFollowing','meanReversion','breakout','orderFlow','volatilityGuard','consensus'])assert.deepEqual(profiles[key].recommended,profiles[key].required,key);
});
test('all personalities react to streaks at their own level without turning emotion into a direction signal',()=>{
  const sensitivities={liangXi:95,fengShui:25,diviner:40,aggressive:90,smart:15,conservative:60,trendFollowing:65,meanReversion:75,breakout:70,orderFlow:35,volatilityGuard:5,consensus:20,priceAction:55,czBrother:25,contrarian:30,showoff:75,firstLady:55};
  assert.deepEqual(Object.fromEntries(Object.entries(profiles).map(([key,profile])=>[key,profile.emotionSensitivity])),sensitivities);
  for(const [strategy,profile] of Object.entries(profiles)){
    const calm=emotionAdjustment({strategy,actionUrge:0,emotionSensitivity:0,lossStreak:3});
    assert.equal(calm.stakeMultiplier,1,strategy);assert.equal(calm.minimumConfidence,profile.minConfidence,strategy);
    assert.ok(profile.emotionLabel&&profile.enEmotionLabel,strategy);
  }
  const lossStake=strategy=>normalStakePercent({strategy,baseStakePct:profiles[strategy].baseStakePct,maxStakePct:profiles[strategy].maxStakePct,lossStreak:3,emotionSensitivity:profiles[strategy].emotionSensitivity});
  assert.ok(lossStake('aggressive')>profiles.aggressive.baseStakePct);
  assert.ok(lossStake('meanReversion')>profiles.meanReversion.baseStakePct);
  for(const strategy of ['smart','conservative','trendFollowing','breakout','orderFlow','volatilityGuard','consensus'])assert.ok(lossStake(strategy)<profiles[strategy].baseStakePct,strategy);
  assert.ok(lossStake('priceAction')>profiles.priceAction.baseStakePct);
  const steady=emotionAdjustment({strategy:'volatilityGuard',lossStreak:4});
  const gambler=emotionAdjustment({strategy:'aggressive',lossStreak:4});
  assert.ok(Math.abs(steady.stakeMultiplier-1)<0.01);assert.ok(gambler.stakeMultiplier>2);
});
test('all personalities have an adjustable action urge and every strategy can still skip',async()=>{
  const urges={liangXi:40,fengShui:50,diviner:55,aggressive:85,smart:60,conservative:35,trendFollowing:60,meanReversion:45,breakout:55,orderFlow:65,volatilityGuard:40,consensus:55,priceAction:85,czBrother:62,contrarian:48,showoff:70,firstLady:78};
  assert.deepEqual(Object.fromEntries(Object.entries(profiles).map(([key,profile])=>[key,profile.actionUrge])),urges);
  const low=fixture('orderFlow');Object.assign(low.policy,normalizePolicy({strategy:'orderFlow',actionUrge:0},'A'));
  Object.assign(low.indicators,{takerFlow:{buyRatio:.56,netBase:12,totalBase:100},spotOrderBookImbalance:.07,priceChangePct:{oneMinute:.01,fiveMinutes:.04}});
  const high=fixture('orderFlow');Object.assign(high.policy,normalizePolicy({strategy:'orderFlow',actionUrge:100},'A'));Object.assign(high.indicators,structuredClone(low.indicators));
  assert.equal(strategySignal(low.build()).score,0);
  assert.ok(strategySignal(high.build()).score>0);
  assert.equal((await createMockDecisionProvider().decide(low.build())).action,'SKIP');
  assert.equal((await createMockDecisionProvider().decide(high.build())).action,'BET');
  const conflict=fixture('orderFlow');Object.assign(conflict.policy,normalizePolicy({strategy:'orderFlow',actionUrge:100},'A'));
  Object.assign(conflict.indicators,{takerFlow:{buyRatio:.68,netBase:36,totalBase:100},spotOrderBookImbalance:-.3,priceChangePct:{oneMinute:0,fiveMinutes:0}});
  assert.equal(strategySignal(conflict.build()).score,0);
  assert.equal((await createMockDecisionProvider().decide(conflict.build())).action,'SKIP');
});
test('arena action urge raises every Agent from its personal baseline without forcing a direction',()=>{
  assert.equal(effectiveActionUrge(35,0),35);
  assert.equal(effectiveActionUrge(35,50),67.5);
  assert.equal(effectiveActionUrge(85,50),92.5);
  assert.equal(effectiveActionUrge(35,100),100);
  const input=buildDecisionContext({
    policy:normalizePolicy({strategy:'conservative',actionUrge:35},'A'),battleActionUrge:50,
    indicators:fixture('conservative').indicators,
    market:{roundId:'shared-urge',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},
    account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0},
  });
  assert.equal(input.policy.personal_action_urge,35);
  assert.equal(input.policy.battle_action_urge,50);
  assert.equal(input.policy.action_urge,67.5);
});
test('the arena tilt makes even cautious personalities bet larger after streaks while hard caps still win',()=>{
  for(const strategy of ['conservative','volatilityGuard']){
    const profile=profiles[strategy];
    const calm=normalStakePercent({strategy,baseStakePct:profile.baseStakePct,maxStakePct:profile.maxStakePct,lossStreak:3,emotionSensitivity:profile.emotionSensitivity,battleEmotion:0});
    const tilted=normalStakePercent({strategy,baseStakePct:profile.baseStakePct,maxStakePct:profile.maxStakePct,lossStreak:3,emotionSensitivity:profile.emotionSensitivity,battleEmotion:100});
    const adjustment=emotionAdjustment({strategy,lossStreak:3,emotionSensitivity:profile.emotionSensitivity,battleEmotion:100});
    assert.ok(tilted>calm,strategy);
    assert.ok(adjustment.globalStakeMultiplier>1,strategy);
    assert.ok(tilted<=profile.maxStakePct,strategy);
  }
});
function fixture(strategy){
  const policy=normalizePolicy({strategy,maxStakePct:100,allowAllIn:true,indicators:['rsi','ema','odds']},'A');
  const indicators={dataTimestamp:now,priceChangePct:{oneMinute:0.1,fiveMinutes:0.3},ema:{ema5:102,ema20:100},rsi14:60,
    volumeRatio:1.5,spotOrderBookImbalance:0.3,macd:{line:1,signal:0.5,histogram:0.5},adx:{adx:28,plusDI:30,minusDI:10},
    bollinger:{middle:100,upper:102,lower:98,percentB:0.7,bandwidthPct:4},atr:{value:0.2,percent:0.2},
    stochastic:{k:60,d:55},donchian:{upper:101,lower:99,close:102,breakout:1},takerFlow:{buyRatio:0.65,netBase:30,totalBase:100},
    spread:{basisPoints:1,mid:100,microprice:100.001,micropriceBiasBps:0.1},volatility:{perMinutePct:0.1},
    roc:{tenMinutes:0.5,twentyMinutes:0.8},longReturns:{fifteenMinutes:0.7,sixtyMinutes:1.6},momentum:2};
  if(strategy==='meanReversion')Object.assign(indicators,{adx:{adx:18,plusDI:10,minusDI:20},rsi14:25,bollinger:{middle:100,upper:102,lower:98,percentB:-0.1,bandwidthPct:4},stochastic:{k:15,d:20}});
  const build=()=>buildDecisionContext({policy,indicators,market:{roundId:'new-rule',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0}});
  return {policy,indicators,build};
}
for(const strategy of ['trendFollowing','meanReversion','breakout','orderFlow','volatilityGuard','consensus']){
  test(`${strategy}: distinct entry rule, required inputs, risk cap and external AI direction gate`,async()=>{
    const f=fixture(strategy),input=f.build();
    assert.equal(f.policy.allowAllIn,false);assert.equal(f.policy.maxStakePct,profiles[strategy].maxStakePct);
    assert.ok(profiles[strategy].required.every(key=>f.policy.indicators.includes(key)));
    const raw=await createMockDecisionProvider().decide(input);
    assert.equal(raw.action,'BET');assert.equal(raw.direction,'UP');
    const plan=validateDecision(raw,{...f,input,now});assert.ok(plan.stake<=profiles[strategy].maxStakePct);
    assert.throws(()=>validateDecision({...raw,direction:'DOWN'},{...f,input,now}),{code:'AI_STRATEGY_CONDITION_NOT_MET'});
    const missing=structuredClone(input);missing.indicators[catalog[profiles[strategy].required[0]].field]=null;
    await assert.rejects(()=>createMockDecisionProvider().decide(missing),{code:'AI_INDICATOR_MISSING'});
    let called=false;
    const provider=createDeepSeekDecisionProvider({apiKey:'fixture',fetchImpl:async()=>{called=true;throw Error('must not call');}});
    await assert.rejects(()=>provider.decide(missing),{code:'AI_INDICATOR_MISSING'});assert.equal(called,false);
    Object.assign(f.indicators,{priceChangePct:{oneMinute:-0.1,fiveMinutes:-0.3},ema:{ema5:98,ema20:100},rsi14:40,
      macd:{line:-1,signal:-0.5,histogram:-0.5},adx:{adx:28,plusDI:10,minusDI:30},spotOrderBookImbalance:-0.3,
      takerFlow:{buyRatio:0.35,netBase:-30,totalBase:100},roc:{tenMinutes:-0.5,twentyMinutes:-0.8},longReturns:{fifteenMinutes:-0.7,sixtyMinutes:-1.6},momentum:-2,
      donchian:{upper:101,lower:99,close:98,breakout:-1}});
    if(strategy==='meanReversion')Object.assign(f.indicators,{adx:{adx:18,plusDI:20,minusDI:10},rsi14:75,bollinger:{middle:100,upper:102,lower:98,percentB:1.1,bandwidthPct:4},stochastic:{k:85,d:80}});
    const downInput=f.build(),down=await createMockDecisionProvider().decide(downInput);
    assert.equal(down.action,'BET');assert.equal(down.direction,'DOWN');validateDecision(down,{...f,input:downInput,now});
  });
}
test('the first three personalities use different indicator families and can disagree on one snapshot',async()=>{
  const conservative=fixture('conservative'),conflicted=conservative.indicators;
  conflicted.spotOrderBookImbalance=-0.3;
  const conservativeDecision=await createMockDecisionProvider().decide(conservative.build());
  assert.equal(conservativeDecision.action,'SKIP');

  const aggressive=fixture('aggressive');
  Object.assign(aggressive.indicators,{priceChangePct:{oneMinute:0.2,fiveMinutes:0.1},ema:{ema5:99,ema20:100},rsi14:70,volumeRatio:0.9,
    spotOrderBookImbalance:-0.3,momentum:2,roc:{tenMinutes:0.3,twentyMinutes:0.4},takerFlow:{buyRatio:0.35,netBase:-30,totalBase:100},
    adx:{adx:18,plusDI:10,minusDI:20},bollinger:{middle:100,upper:102,lower:98,percentB:1.1,bandwidthPct:4}});
  const smart=fixture('smart');
  Object.assign(smart.indicators,structuredClone(aggressive.indicators));
  const aggressiveDecision=await createMockDecisionProvider().decide(aggressive.build());
  const smartDecision=await createMockDecisionProvider().decide(smart.build());
  assert.equal(aggressiveDecision.action,'BET');
  assert.equal(aggressiveDecision.direction,'UP');
  assert.equal(smartDecision.action,'BET');
  assert.equal(smartDecision.direction,'DOWN');
  assert.match(smartDecision.reason,/震荡局/);
});
test('Super AI scales normal stakes with edge but keeps non-all-in bets at 30 percent',async()=>{
  const f=fixture('smart');f.policy.allowAllIn=false;const input=f.build();
  const raw=await createMockDecisionProvider().decide(input);
  assert.equal(raw.action,'BET');assert.equal(raw.risk_mode,'NORMAL');assert.equal(raw.stake_pct,30);
  assert.throws(()=>validateDecision({...raw,stake_usdt:31,stake_pct:31},{...f,input,now}),{code:'AI_STAKE_OVER_CAP'});
  assert.throws(()=>validateDecision({...raw,risk_mode:'ADD_ON'},{...f,input,now}),{code:'AI_RISK_MODE_INVALID'});
});
test('strategies skip conflicting regimes; reversion and trend have different directions',()=>{
  for(const [strategy,mutate] of [
    ['trendFollowing',i=>i.adx.adx=10],['meanReversion',i=>i.adx.adx=48],['breakout',i=>i.volumeRatio=0.8],
    ['orderFlow',i=>i.spread.basisPoints=8],['volatilityGuard',i=>i.atr.percent=0.5],['consensus',i=>{i.macd.histogram=-1;i.ema.ema5=90;}],
  ]){const f=fixture(strategy);mutate(f.indicators);assert.equal(strategySignal(f.build()).score,0,strategy);}
});
test('15m and 60m context changes each personality without flattening them into one rule',async()=>{
  const opposed={fifteenMinutes:-0.8,sixtyMinutes:-2.2};
  for(const strategy of ['smart','conservative','trendFollowing','meanReversion','breakout','orderFlow','volatilityGuard','consensus']){
    const f=fixture(strategy);f.indicators.longReturns=opposed;
    if(strategy==='meanReversion') {
      assert.equal((await createMockDecisionProvider().decide(f.build())).action,'BET','ordinary countertrend extremes are allowed');
      f.indicators.adx.adx=36;
    }
    const decision=await createMockDecisionProvider().decide(f.build());
    assert.equal(decision.action,'SKIP',strategy);
  }
  const gambler=fixture('aggressive');gambler.indicators.longReturns=opposed;
  const gamblerDecision=await createMockDecisionProvider().decide(gambler.build());
  assert.equal(gamblerDecision.action,'BET');
  assert.equal(gamblerDecision.direction,'UP');
  assert.ok(gamblerDecision.factors.some(factor=>factor.name==='return_15m'));
  assert.ok(gamblerDecision.factors.some(factor=>factor.name==='return_60m'));
});
test('all 26 chosen groups reach the frozen AI JSON and automatic policies keep their own indicator sets',async()=>{
  const policy=normalizePolicy({strategy:'smart',indicators:Object.keys(catalog)},'B');
  const indicators=calculateIndicatorSnapshot({symbol:'BTCUSDT',klines:rows(now),depth,receivedAt:now});
  const input=buildDecisionContext({policy,indicators,market:{roundId:'all',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},account:{balance:100}});
  assert.equal(Object.keys(input.indicators).length,26);assert.deepEqual(normalizePolicy({},'A').indicators,profiles.aggressive.recommended);
  assert.deepEqual(normalizePolicy({strategy:'smart',indicators:['priceChange','rsi','ema','volume','orderbook','odds']},'B').indicators,profiles.smart.recommended);
  let sent;
  const provider=createDeepSeekDecisionProvider({apiKey:'fixture',fetchImpl:async(_,options)=>{
    sent=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({action:'SKIP'})}}]})};
  }});
  await provider.decide(input);assert.deepEqual(JSON.parse(sent.messages[1].content).indicators,input.indicators);
  assert.ok(sent.messages[0].content.includes('rolling 20m'));
  assert.ok(sent.messages[0].content.includes('mandatory long-horizon context'));
});
test('one missing advanced indicator skips only its Agent and never calls its provider',async()=>{
  let time=now-20000;let calls=[];
  const topic=start=>({marketTopicId:start,symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+ROUND,
    markets:[{marketId:start,status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
  const base=fixture('trendFollowing').indicators;delete base.macd;
  const sim=createPredictionSimulation({now:()=>time,enabled:true,policyFor:id=>normalizePolicy({strategy:id==='A'?'trendFollowing':'aggressive'},id),agentPolicies:[{id:'A',strategy:'trendFollowing'},{id:'B',strategy:'aggressive'}],
    source:{marketFor:async start=>topic(start),detail:async id=>topic(id),book:async(_,direction)=>({tokenId:direction==='UP'?'up':'down',timestamp:time,asks:[{price:0.4,size:10000}]})},
    indicatorSource:{snapshot:async()=>({...base,dataTimestamp:time})},
    decisionProvider:{describe:()=>({mode:'mock'}),decide:async input=>{calls.push(input.policy.strategy);return {round_id:input.market.round_id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:0,risk_mode:'WAIT',factors:[],reason:'fixture',data_fresh:true,warnings:[]};}}
  });
  await sim.tick();time=now;await sim.tick();
  const s=sim.snapshot();assert.deepEqual(calls,['aggressive'],JSON.stringify({error:s.error,agents:s.agents.map(a=>({status:a.lastStatus,reason:a.reason})),events:s.auditTrail.map(e=>({type:e.type,reason:e.reason}))}));assert.equal(s.error,null);
  assert.equal(s.agents[0].reason,'AI_INDICATOR_MISSING');assert.equal(s.agents[1].lastDecision.action,'SKIP');
  assert.ok(s.agents.every(agent=>agent.cash===100&&agent.orders.length===0));
  const inputs=s.auditTrail.filter(event=>event.type==='DECISION_INPUT');assert.equal(inputs.length,2);
  assert.equal(inputs[0].input.indicators.macd_12_26_9,null);
});
test('new offline policies stay identifiable but do not invent unavailable real signals',()=>{
  const {createOfflineSimulation}=require('../public/offline-simulation');
  let time=now-20000;const values=new Map();
  const sim=createOfflineSimulation({now:()=>time,storage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}});
  const battle=sim.create('new offline fixture',{initialBalance:100,rounds:1,agents:[{id:'A',strategy:'trendFollowing',provider:'claude',coin:'BTC'}]});
  time=now;
  const result=sim.snapshot(battle.id);
  assert.equal(result.agents[0].policy.strategy,'trendFollowing');assert.equal(result.agents[0].orders.length,0);
  assert.equal(result.agents[0].lastDecision.action,'SKIP');assert.match(result.agents[0].lastDecision.reason,/真实指标/);
});
