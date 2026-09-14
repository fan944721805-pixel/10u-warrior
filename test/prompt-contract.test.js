const test=require('node:test'),assert=require('node:assert/strict');
const ai=require('../ai-decision'),cat=require('../public/strategy-catalog');
const {createAiConnections}=require('../ai-connections');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const {calculateIndicatorSnapshot}=require('../market-indicators');
const {rows,depth}=require('./fixtures/indicator-series.cjs');
const slot=1800000000000;
function snapshot(now=slot){
  const data=calculateIndicatorSnapshot({symbol:'BTCUSDT',klines:rows(now),depth,receivedAt:now});
  data.atr={value:.2,percent:.2};data.spread.basisPoints=1;data.volatility={perMinutePct:.1};
  return data;
}
function fixture(strategy='smart',urge=0,emotion=0){
  const policy=ai.normalizePolicy({strategy,maxStakePct:cat.profiles[strategy].maxStakePct},strategy),indicators=snapshot();
  const peers={roundId:String(slot),asset:'BTCUSDT',agents:[{id:'peer',strategy:'aggressive',lossStreak:1,order:{id:'order',direction:'DOWN',amount:10}}]};
  const input=ai.buildDecisionContext({policy,indicators,peers,battleActionUrge:urge,battleEmotion:emotion,
    market:{roundId:slot,secondsToClose:300,roundDurationSeconds:300,upOdds:2,downOdds:2,dataTimestamp:slot},
    account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0}});
  input.policy.review_mode='model';return {input,policy,indicators,now:slot};
}
const skip=input=>({round_id:input.market.round_id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:0,risk_mode:'WAIT',skip_reason_code:'MODEL_UNCERTAIN',reason:'model commentary',factors:[],warnings:[],data_fresh:true,
  ...(input.divination?{divination:{seed:input.divination.seed,reading:'Frozen draw interpretation',verdict:'WAIT'}}:{})});
function external(raw){Object.defineProperty(raw,ai.DECISION_META,{value:{responseContract:'strategy-v2'}});return raw;}

test('all nineteen strategies send distinct rules, current controls and exact audit bodies through the real router',async()=>{
  const wire=[],audit=[];
  const store=createAiConnections({now:()=>slot,fetchImpl:async(url,request)=>{
    const body=JSON.parse(request.body),input=JSON.parse(body.messages.at(-1).content);wire.push(body);
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(skip(input))}}]})};
  }});
  await store.save({provider:'deepseek',model:'fake-model',baseUrl:'https://api.deepseek.com',apiKey:'NOT_A_REAL_KEY'},true);
  const prompts=new Set();
  for(const strategy of Object.keys(cat.profiles)){
    store.assign(strategy,'deepseek');
    for(const [urge,emotion] of [[0,0],[100,100]]){
      const f=fixture(strategy,urge,emotion),raw=await store.router.decide(f.input,{onRequest:r=>audit.push(r),now:()=>slot});
      assert.deepEqual(audit.at(-1).body,wire.at(-1));
      const sent=JSON.parse(wire.at(-1).messages[1].content);
      assert.equal(sent.policy.battle_action_urge,urge);assert.equal(sent.policy.battle_emotion,emotion);
      assert.equal(wire.at(-1).messages[0].content,ai.decisionPrompt(f.input));
      assert.ok(wire.at(-1).messages[0].content.includes(cat.profiles[strategy].enDescription));
      assert.equal(ai.validateDecision(raw,f).action,'SKIP');
      prompts.add(wire.at(-1).messages[0].content);
    }
  }
  assert.equal(prompts.size,38);assert.ok(!JSON.stringify(audit).includes('NOT_A_REAL_KEY'));
});

test('oracle names are resolved using game IDs and remain consistent after restoring a frozen draw',()=>{
  const data=snapshot(),base={roundId:String(slot),asset:'BTCUSDT',seed:'frozen'};
  const feng={...base,system:'fengShui',omen:'UP',draw:{upper:0,lower:6,element:3}};
  const reading=cat.evaluateDivination('fengShui',{...data,marketOdds:{up:2,down:2}},{roundId:slot,frozenReading:feng,actionUrge:100}).divination;
  assert.equal(reading.draw_details.element.name,'Metal');assert.equal(reading.draw_details.lower.name,'Mountain');assert.equal(reading.seed,'frozen');
  const cards={...base,system:'diviner',omen:'UP',draw:{cards:[{card:1,reversed:true},{card:3,reversed:true},{card:2,reversed:true}]}};
  const tarot=cat.evaluateDivination('diviner',{...data,marketOdds:{up:2,down:2}},{roundId:slot,frozenReading:cards,actionUrge:100}).divination;
  assert.deepEqual(tarot.draw_details.cards.map(c=>[c.name,c.gameVote]),[['Moon',1],['Star',-1],['Tower',1]]);
  assert.deepEqual(tarot.draw,cards.draw);
});

test('countertrade eligibility and structured wait reasons cannot contradict the actual eligible peer',()=>{
  const f=fixture('contrarian',100),facts=ai.decisionFacts(f.input);
  assert.equal(facts.countertrade.required_loss_streak,0);assert.equal(facts.countertrade.eligible_count,1);assert.equal(facts.countertrade.fade_direction,'UP');
  assert.equal(facts.permissions.UP.allowed,true);
  for(const code of [undefined,'NO_ELIGIBLE_PEERS','STRATEGY_BLOCKED','ORACLE_WAIT']){
    const raw=external({...skip(f.input),skip_reason_code:code});
    assert.throws(()=>ai.validateDecision(raw,f),{code:'AI_REASON_CONTRADICTS_INPUT'});
  }
  const plan=ai.validateDecision(external(skip(f.input)),f);
  assert.equal(plan.reason,'模型自主观望');assert.equal(plan.modelReason,'model commentary');
  const low=fixture('contrarian',0);
  assert.equal(ai.validateDecision(external({...skip(low.input),skip_reason_code:'NO_ELIGIBLE_PEERS'}),low).skipReasonCode,'NO_ELIGIBLE_PEERS');
});

test('long-only prompts do not inherit other personas countertrade rules',()=>{
  for(const strategy of ['czBrother','firstLady']){
    const prompt=ai.decisionPrompt(fixture(strategy).input);
    assert.ok(prompt.includes('do not require any peer order'));
    assert.ok(!prompt.includes('lossStreak >= 2'));assert.ok(!prompt.includes('Show-off only opposes'));
  }
});

test('odds confidence threshold is explicit and negative-edge model bets stay rejected',()=>{
  const f=fixture('aggressive',100);f.input.market.up_odds=1.0416666666666667;
  assert.equal(ai.decisionFacts(f.input).break_even_confidence_pct.UP,96);
  assert.ok(ai.decisionPrompt(f.input).includes('confidence 62 and odds 1.0417 means negative edge'));
  assert.throws(()=>ai.validateDecision({...skip(f.input),action:'BET',direction:'UP',stake_usdt:5,stake_pct:5,confidence:62,risk_mode:'NORMAL',skip_reason_code:null},f),{code:'AI_EDGE_NOT_POSITIVE'});
});

test('tilt affects the first round for all personalities without changing hard caps or direction',()=>{
  for(const strategy of Object.keys(cat.profiles)){
    const calm=fixture(strategy,0,0),hot=fixture(strategy,0,100);
    assert.equal(calm.input.policy.emotion_stake_multiplier,1);assert.equal(hot.input.policy.emotion_stake_multiplier,1.6);
    assert.ok(Math.abs(hot.input.policy.effective_minimum_confidence-Math.max(50,calm.input.policy.effective_minimum_confidence-2.5))<1e-8);
    assert.equal(hot.input.policy.max_stake_pct,calm.input.policy.max_stake_pct);
    assert.equal(ai.strategySignal(hot.input).score,ai.strategySignal(calm.input).score);
  }
});

test('control changes trigger a new review after cooldown even with unchanged candles; review budget cannot be reset',()=>{
  const f=fixture('smart',100),first=ai.modelReview(f.input,slot,null,slot),prev={at:slot,keys:[first.key],count:1};
  f.input.policy.battle_emotion=100;f.input.policy.controls_revision=1;
  assert.equal(ai.modelReview(f.input,slot,prev,slot+59000).reason,'AI_REVIEW_COOLDOWN');
  assert.ok(ai.modelReview(f.input,slot,prev,slot+60000).key);
  f.input.policy.battle_emotion=0;f.input.policy.controls_revision=2;
  assert.ok(ai.modelReview(f.input,slot,prev,slot+60000).key);
  assert.equal(ai.modelReview(f.input,slot,{...prev,count:6},slot+60000).reason,'AI_REVIEW_LIMIT');
});

test('changing either slider during a pending model call discards it and the next call receives new values',async()=>{
  for(const control of ['setEmotionLevel','setActionUrgeLevel']){
    let now=slot-20000,started,release;
    const called=new Promise(r=>started=r),blocked=new Promise(r=>release=r),calls=[];
    const topic=start=>({marketTopicId:String(start),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+ROUND,markets:[{status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
    const p=fixture().policy;
    const sim=createPredictionSimulation({source:{marketFor:async start=>topic(start),detail:async id=>topic(Number(id)),book:async(_,direction)=>({tokenId:direction==='UP'?'up':'down',timestamp:now,asks:[{price:.5,size:10000}]})},indicatorSource:{snapshot:async()=>snapshot(now)},policyFor:()=>p,agentPolicies:[p],realtimeEntry:true,now:()=>now,
      decisionProvider:{describe:()=>({mode:'deepseek'}),decide:async input=>{calls.push(input);if(calls.length===1){started();await blocked;}return skip(input);}}});
    await sim.tick();now=slot;const pending=sim.tick();await called;sim[control](100);release();await pending;
    assert.equal(sim.snapshot().agents[0].orders.length,0);
    assert.equal(sim.snapshot().auditTrail.filter(e=>e.type==='DECISION').at(-1).risk,'REJECTED');
    now=slot+90000;await sim.tick();assert.equal(calls.length,2);
    assert.equal(calls[1].policy[control==='setEmotionLevel'?'battle_emotion':'battle_action_urge'],100);
    assert.equal(calls[1].policy.controls_revision,1);
  }
});
