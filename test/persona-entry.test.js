const test=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../public/strategy-catalog');
const {normalizePolicy,buildDecisionContext,createMockDecisionProvider,validateDecision,decisionPrompt}=require('../ai-decision');
const now=1800000000000;
const account={balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0};
function context(strategy,indicators,roundId='persona') {
  const policy=normalizePolicy({strategy},strategy);
  const input=buildDecisionContext({policy,indicators,account,market:{roundId,secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now}});
  return {policy,input,indicators,now};
}

test('Candlestick Bro can enter on one strong body in either direction without other indicators',async()=>{
  const bars=Array.from({length:20},(_,i)=>({openTime:now-(20-i)*60000,closeTime:now-(19-i)*60000-1,open:100,close:100+(i%2?.03:-.03),high:101,low:99}));
  for(const sign of [1,-1]) {
    const sample=structuredClone(bars);Object.assign(sample.at(-1),{open:100,close:100+sign*.6,high:sign>0?100.65:100.05,low:sign>0?99.95:99.35});
    const f=context('priceAction',{dataTimestamp:now,candles:{intervalMinutes:1,targetMinutes:5,bars:sample}});
    const raw=await createMockDecisionProvider().decide(f.input),plan=validateDecision(raw,f);
    assert.equal(plan.action,'BET');assert.equal(plan.direction,sign>0?'UP':'DOWN');
    assert.ok(raw.factors.some(f=>f.name==='body_drive'&&f.impact===(sign>0?'UP':'DOWN')));
    assert.deepEqual(Object.keys(f.input.indicators),['raw_candles','market_odds']);
    assert.ok(plan.stakePct<=20);assert.equal(f.policy.allowAllIn,false);
    assert.equal(f.policy.actionUrge,catalog.profiles.aggressive.actionUrge);
    assert.match(decisionPrompt(f.input),/raw-candle Gambler/);
  }
  const flat=context('priceAction',{dataTimestamp:now,candles:{intervalMinutes:1,targetMinutes:5,bars}});
  assert.equal((await createMockDecisionProvider().decide(flat.input)).action,'SKIP');
});

test('reversion enters on two early extremes, but conflicting extremes and strong opposing trends skip',async()=>{
  const data={dataTimestamp:now,bollinger:{middle:100,upper:102,lower:98,percentB:.2,bandwidthPct:4},rsi14:42,stochastic:{k:50,d:50},adx:{adx:30,plusDI:10,minusDI:20},longReturns:{fifteenMinutes:-.3,sixtyMinutes:-.8}};
  const f=context('meanReversion',data),raw=await createMockDecisionProvider().decide(f.input);
  assert.equal(raw.action,'BET');assert.equal(raw.direction,'UP');assert.ok(validateDecision(raw,f).stakePct<=15);
  const opposing=context('meanReversion',{...data,adx:{...data.adx,adx:36}});
  assert.equal((await createMockDecisionProvider().decide(opposing.input)).action,'SKIP');
  const conflict=context('meanReversion',{...data,stochastic:{k:90,d:85}});
  assert.equal((await createMockDecisionProvider().decide(conflict.input)).action,'SKIP');
  const missing=context('meanReversion',{...data,stochastic:null});
  await assert.rejects(createMockDecisionProvider().decide(missing.input),{code:'AI_INDICATOR_MISSING'});
});

test('oracles can bet with one supporting market vote, keep small caps, and skip unsafe markets',async()=>{
  const data={dataTimestamp:now,priceChangePct:{oneMinute:.05,fiveMinutes:.1},rsi14:50,ema:{ema5:100,ema20:100},spotOrderBookImbalance:0,atr:{percent:.2},spread:{basisPoints:1},longReturns:{fifteenMinutes:0,sixtyMinutes:0}};
  for(const strategy of ['fengShui','diviner']) {
    let accepted;
    for(let i=0;i<100&&!accepted;i++) {
      const f=context(strategy,data,`single-vote-${i}`),raw=await createMockDecisionProvider().decide(f.input);
      if(raw.action==='BET')accepted={f,raw};
    }
    assert.ok(accepted,strategy);const {f,raw}=accepted,plan=validateDecision(raw,f);
    assert.equal(f.input.divination.support,1);assert.equal(plan.direction,'UP');assert.ok(plan.stakePct<=10);
    const unsafe=context(strategy,{...data,spread:{basisPoints:20}});
    assert.equal((await createMockDecisionProvider().decide(unsafe.input)).action,'SKIP');
    assert.throws(()=>validateDecision({...raw,stake_usdt:11,stake_pct:11},f),{code:'AI_STAKE_OVER_CAP'});
  }
});

test('Diviner reads a one-vote card tilt instead of requiring a two-vote supermajority',()=>{
  const data={priceChangePct:{oneMinute:.1,fiveMinutes:.3},rsi14:60,ema:{ema5:105,ema20:100},spotOrderBookImbalance:.3,atr:{percent:.2},spread:{basisPoints:1},longReturns:{fifteenMinutes:.5,sixtyMinutes:1},marketOdds:{up:2,down:2}};
  let reading;
  for(let i=0;i<1000&&!reading;i++) {
    const d=catalog.evaluateDivination('diviner',data,{roundId:`tilt-${i}`}).divination;
    const net=d.draw.cards.reduce((sum,c)=>sum+[1,-1,-1,1,1,0,1,0][c.card]*(c.reversed?-1:1),0);
    if(net===1)reading=d;
  }
  assert.ok(reading);assert.equal(reading.omen,'UP');assert.equal(reading.verdict,'UP');
});
