const test=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../public/strategy-catalog');
const {normalizePolicy,buildDecisionContext,createMockDecisionProvider,validateDecision,decisionPrompt}=require('../ai-decision');
const now=1800000000000;
function fixture({sign=1,balance=100,winStreak=0,lossStreak=0,patch={}}={}) {
  const policy=normalizePolicy({strategy:'liangXi'},'liangXi');
  const indicators={dataTimestamp:now,priceChangePct:{oneMinute:sign*.1,fiveMinutes:sign*.3},rsi14:sign>0?58:42,
    ema:{ema5:100+sign,ema20:100},macd:{histogram:sign*.2},adx:{adx:28,plusDI:sign>0?28:10,minusDI:sign>0?10:28},
    bollinger:{percentB:.5},atr:{percent:.2},volatility:{perMinutePct:.1},volumeRatio:1.2,
    takerFlow:{buyRatio:sign>0?.7:.3},spotOrderBookImbalance:sign*.3,spread:{basisPoints:1},
    longReturns:{fifteenMinutes:sign*.4,sixtyMinutes:sign*.8},...patch};
  const input=buildDecisionContext({policy,indicators,account:{balance,initialBalance:balance,wins:winStreak,losses:lossStreak,winStreak,lossStreak,openStake:0},market:{roundId:'liangxi-test',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now}});
  return {policy,indicators,input,now};
}
test('Liang Xi makes real simulated decisions in both directions with exactly half or full balance',async()=>{
  for(const sign of [1,-1]) {
    const f=fixture({sign,balance:101.01}),raw=await createMockDecisionProvider().decide(f.input);
    assert.equal(raw.action,'BET');assert.equal(raw.direction,sign>0?'UP':'DOWN');
    const plan=validateDecision(raw,f);assert.equal(plan.stake,101.01);assert.equal(plan.riskMode,'ALL_IN');
    const half={...raw,stake_usdt:50.5,stake_pct:50.5/101.01*100,risk_mode:'NORMAL',confidence:85};
    assert.equal(validateDecision(half,f).stake,50.5);
    for(const pct of [5,20,49,51,75]) {
      const amount=Math.floor(101.01*pct)/100;
      assert.throws(()=>validateDecision({...half,stake_usdt:amount,stake_pct:amount/101.01*100},f));
    }
    assert.throws(()=>validateDecision({...half,risk_mode:'ADD_ON'},f),/AI_LIANGXI_STAKE_INVALID/);
    assert.throws(()=>validateDecision({...raw,confidence:85},f),/AI_ALL_IN_REJECTED/);
  }
});
test('Liang Xi gets more eager after either result, while emotion never invents a stake size or direction',async()=>{
  const base=catalog.emotionAdjustment({strategy:'liangXi'}).minimumConfidence;
  for(const streak of [{winStreak:1},{lossStreak:1}]) {
    assert.ok(catalog.emotionAdjustment({strategy:'liangXi',...streak}).minimumConfidence<base-5);
    for(const battleEmotion of [0,50,100])assert.equal(catalog.normalStakePercent({strategy:'liangXi',balance:100,initialBalance:100,...streak,battleEmotion}),50);
    const f=fixture({...streak,patch:{spotOrderBookImbalance:-.3,takerFlow:{buyRatio:.3}}});
    assert.equal((await createMockDecisionProvider().decide(f.input)).action,'SKIP');
  }
  const missing=fixture({patch:{ema:null}});
  await assert.rejects(createMockDecisionProvider().decide(missing.input),/AI_INDICATOR_MISSING/);
  const unsafe=fixture({lossStreak:4,patch:{spread:{basisPoints:12}}});
  assert.equal((await createMockDecisionProvider().decide(unsafe.input)).action,'SKIP');
});
test('Liang Xi normalizes the two choices and exposes their exact contract to the model',()=>{
  const p=normalizePolicy({strategy:'liangXi',maxStakePct:25,allowAllIn:false},'liangXi');
  assert.equal(p.maxStakePct,100);assert.equal(p.allowAllIn,true);
  const prompt=decisionPrompt(fixture().input);
  assert.match(prompt,/LIANG_XI sizing/);assert.match(prompt,/not documented rules used by the real person/);
});
test('a marginal turning-point setup is skipped cold but entered at half balance after the first result',async()=>{
  const patch={adx:{adx:18,plusDI:20,minusDI:15},rsi14:30,bollinger:{percentB:.1},longReturns:{fifteenMinutes:0,sixtyMinutes:0}};
  const cold=fixture({patch});
  assert.equal((await createMockDecisionProvider().decide(cold.input)).action,'SKIP');
  for(const streak of [{winStreak:1},{lossStreak:1}]){
    const f=fixture({patch,...streak}),raw=await createMockDecisionProvider().decide(f.input);
    assert.equal(raw.action,'BET');assert.equal(raw.stake_usdt,50);assert.equal(raw.risk_mode,'NORMAL');
    assert.equal(validateDecision(raw,f).stake,50);
  }
});
