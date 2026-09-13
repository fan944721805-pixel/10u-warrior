const test=require('node:test');
const assert=require('node:assert/strict');
const {roundContext,alignRoundDirection}=require('../round-direction');
const {buildDecisionContext,createMockDecisionProvider,validateDecision,normalizePolicy,entrySignal,decisionAudit,decisionPrompt}=require('../ai-decision');
const slot=1800000000000,now=slot+180000;
function context(displacement=-.3) {
  return {round_id:String(slot),start_price:100,observed_price:99.7,displacement_pct:displacement,
    noise_pct_per_minute:.05,observed_at:now,opening_price_basis:'spot-open-proxy',observed_price_basis:'spot-proxy'};
}
function input(strategy='priceAction') {
  return {market:{round_id:String(slot),round_duration_seconds:300,seconds_to_close:120,data_timestamp:now,up_odds:3,down_odds:1.6,round_context:context()},policy:{strategy}};
}
test('round target corrects a rebound below the opening and symmetrically a pullback above it',()=>{
  for(const sign of [1,-1]) {
    const i=input();i.market.round_context=context(-sign*.3);
    if(sign<0)[i.market.up_odds,i.market.down_odds]=[i.market.down_odds,i.market.up_odds];
    const raw={score:sign*5.2,factors:[],regime:'raw-price-action'},adjusted=alignRoundDirection(raw,i);
    assert.equal(adjusted.score,-raw.score);assert.equal(adjusted.regime,raw.regime);
    assert.equal(adjusted.directionCorrection.from,sign>0?'UP':'DOWN');
    assert.equal(raw.factors.length,0);
  }
});
test('target correction preserves entry availability, fixed characters, oracle contracts and unavailable context',()=>{
  const raw={score:5.2,factors:[]};
  for(const strategy of ['czBrother','firstLady','showoff','contrarian','fengShui','diviner'])assert.equal(alignRoundDirection(raw,input(strategy)),raw);
  assert.equal(alignRoundDirection({score:0,factors:[]},input()).score,0);
  for(const change of [i=>delete i.market.round_context,i=>i.market.round_context.round_id='other',i=>i.market.round_context.noise_pct_per_minute=0,
    i=>i.market.round_context.observed_at-=20000,i=>i.market.seconds_to_close=290,i=>i.market.up_odds=1.5]) {
    const i=input();change(i);assert.equal(alignRoundDirection(raw,i).score,raw.score);
  }
});
test('opening context uses the exact opening, labels spot proxies and excludes unclosed/future returns',()=>{
  const rows=Array.from({length:24},(_,n)=>{const t=slot+(n-20)*60000,close=n%2?100.02:100;return [t,'100',101,99,close,1,t+59999];});
  const indicators={price:99.7,raw:{klines:rows}};
  const result=roundContext({},indicators,slot,300,now);
  assert.equal(result.opening_price_basis,'spot-open-proxy');assert.equal(result.start_price,100);
  rows.at(-1)[4]=9999;assert.deepEqual(roundContext({},indicators,slot,300,now),result);
  assert.equal(roundContext({variantData:{startPrice:100.1}},indicators,slot,300,now).opening_price_basis,'official-market');
  assert.equal(roundContext({},indicators,slot+1,300,now),null);
  rows.splice(5,1);assert.equal(roundContext({},indicators,slot,300,now),null);
});
test('provider, entry invitation, validation and audit share corrected direction without changing stakes',async()=>{
  const bars=Array.from({length:20},(_,n)=>({openTime:now-(20-n)*60000,closeTime:now-(19-n)*60000-1,open:100+n*.1,close:100+n*.1+.08,high:100+n*.1+.09,low:100+n*.1-.01}));
  const policy=normalizePolicy({strategy:'priceAction',actionUrge:100},'candle');
  const indicators={dataTimestamp:now,candles:{intervalMinutes:1,targetMinutes:5,bars}};
  const args={market:{roundId:slot,secondsToClose:120,upOdds:3,downOdds:1.6,dataTimestamp:now},indicators,policy,
    account:{balance:100,initialBalance:100,wins:2,losses:0,winStreak:2,lossStreak:0,openStake:0}};
  const before=buildDecisionContext(args),after=buildDecisionContext({...args,market:{...args.market,roundContext:context()}});
  const provider=createMockDecisionProvider(),old=await provider.decide(before),raw=await provider.decide(after);
  assert.equal(old.action,'BET');assert.equal(raw.action,'BET');assert.equal(old.direction,'UP');assert.equal(raw.direction,'DOWN');
  assert.equal(old.stake_usdt,raw.stake_usdt);assert.equal(old.stake_pct,raw.stake_pct);
  assert.equal(old.confidence,raw.confidence);assert.equal(old.risk_mode,raw.risk_mode);
  assert.equal(entrySignal(after,now-1).direction,'DOWN');
  assert.throws(()=>validateDecision(old,{input:after,indicators,policy,now}),{code:'AI_STRATEGY_CONDITION_NOT_MET'});
  const plan=validateDecision(raw,{input:after,indicators,policy,now});
  const audit=decisionAudit({provider,input:after,plan,indicators});
  assert.equal(audit.directionCorrection.to,'DOWN');assert.equal(audit.roundContext.opening_price_basis,'spot-open-proxy');
  assert.match(decisionPrompt(after),/ORIGINAL round opening/);
  assert.match(decisionPrompt(after),/Local settlement-target correction/);
});

test('simulation carries observed round prices through input, corrected paper order and audit',async()=>{
  const {createPredictionSimulation,ROUND}=require('../prediction-sim');
  let time=slot-20000;
  const policy=normalizePolicy({strategy:'priceAction',actionUrge:100},'candle');
  const topic=start=>({marketTopicId:String(start),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+ROUND,
    markets:[{status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
  const provider=createMockDecisionProvider();
  const sim=createPredictionSimulation({now:()=>time,realtimeEntry:true,agentPolicies:[policy],policyFor:()=>policy,
    source:{marketFor:async start=>topic(start),detail:async id=>topic(Number(id)),book:async(_,dir)=>({tokenId:dir==='UP'?'up':'down',timestamp:time,asks:[{price:dir==='UP'?1/3:1/1.6,size:10000}]})},
    indicatorSource:{snapshot:async()=>{
      const current=Math.floor(time/60000)*60000;
      const rows=Array.from({length:24},(_,n)=>{const t=current-(23-n)*60000;return [t,100,101,99,n%2?100.01:100,1,t+59999];});
      const bars=Array.from({length:20},(_,n)=>({openTime:current-(20-n)*60000,closeTime:current-(19-n)*60000-1,open:100+n*.1,close:100+n*.1+.08,high:100+n*.1+.09,low:100+n*.1-.01}));
      return {dataTimestamp:time,indicatorCandleCloseTime:current-1,price:99.7,raw:{klines:rows},candles:{intervalMinutes:1,targetMinutes:5,bars}};
    }},decisionProvider:{describe:provider.describe,decide:i=>time<now?{round_id:i.market.round_id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:50,risk_mode:'WAIT',reason:'wait fixture',factors:[],warnings:[],data_fresh:true}:provider.decide(i)}});
  await sim.tick();time=slot;await sim.tick();time=now;await sim.tick();
  const snapshot=sim.snapshot(),order=snapshot.agents[0].orders[0];
  assert.ok(order);assert.equal(order.direction,'DOWN');assert.equal(order.decision.directionCorrection.from,'UP');
  const event=snapshot.auditTrail.find(e=>e.id===order.intent.inputEventId);
  assert.equal(event.input.market.round_context.start_price,100);
  assert.equal(event.input.market.round_context.observed_price,99.7);
  assert.equal(snapshot.agents[0].reconciliation.matched,true);
});
