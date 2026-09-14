const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCharacter } = require('../public/strategy-catalog');
const cards = require('../public/card-lab-data');
const { normalizePolicy, buildDecisionContext, createMockDecisionProvider, validateDecision, decisionPrompt } = require('../ai-decision');
const now = 1800000000000;
const snapshot = () => ({
  dataTimestamp: now, ema:{ema5:105,ema20:100},macd:{histogram:.5},rsi14:60,
  adx:{adx:30,plusDI:30,minusDI:10},volumeRatio:1.5,atr:{percent:.2},
  spread:{basisPoints:1},longReturns:{fifteenMinutes:.3,sixtyMinutes:.8},
  takerFlow:{buyRatio:.7},spotOrderBookImbalance:.2,
  candles:{intervalMinutes:1,targetMinutes:5,bars:Array.from({length:20},(_,i)=>({open:100,high:102,low:99,close:101,openTime:now-60000*(21-i),closeTime:now-60000*(20-i)-1}))},
  donchian:{upper:102,lower:98,close:104,breakout:1,previous:{upper:102,lower:98,close:103}},
});

test('Sun inverts technical consensus symmetrically and never turns conflicting or missing inputs into bets', () => {
  const up=snapshot();
  assert.ok(evaluateCharacter('sunBrother',up).score<0);
  const down={...up,ema:{ema5:99,ema20:100},macd:{histogram:-.5},rsi14:40,adx:{adx:30,plusDI:10,minusDI:30},longReturns:{fifteenMinutes:-.3,sixtyMinutes:-.8}};
  assert.ok(evaluateCharacter('sunBrother',down).score>0);
  for(const changes of [{rsi14:40},{ema:null},{volumeRatio:.5},{atr:{percent:2}}]) assert.equal(evaluateCharacter('sunBrother',{...up,...changes},100).score,0);
});

test('KZG style gates require structure, flow and confirmation without borrowing peer orders', () => {
  const base=snapshot(),run=(data,styleId)=>evaluateCharacter('kzgMask',data,100,{styleId});
  assert.ok(run(base,'sniper').score>0);
  const firstBreak={...base,donchian:{...base.donchian,previous:{upper:102,lower:98,close:101}}};
  assert.equal(run(firstBreak,'sniper').score,0);
  assert.ok(run(firstBreak,'chase').score>0);
  for(const changes of [{donchian:null},{volumeRatio:.4},{takerFlow:{buyRatio:.3},spotOrderBookImbalance:-.2},{ema:{ema5:99,ema20:100}}]) assert.equal(run({...base,...changes},'wild').score,0);
  assert.equal(run({...base,longReturns:{fifteenMinutes:.3,sixtyMinutes:-.3}},'trend').score,0);
});

test('all nineteen card personas normalize without a default-strategy fallback', () => {
  for(const id of cards.order){const card=cards.makeCard(id,cards.personas[id].styles[0],123);const policy=normalizePolicy({cardSnapshot:card},id);assert.equal(policy.strategy,id);assert.deepEqual(policy.cardSnapshot.stats,card.stats);}
});

test('new characters use provider and risk gate with a frozen card style and reject reversed model orders', async () => {
  for(const [strategy,style,direction] of [['sunBrother','inverse','DOWN'],['kzgMask','sniper','UP']]){
    const policy=normalizePolicy({cardSnapshot:cards.makeCard(strategy,style,123)},'A');
    const indicators=snapshot();
    const input=buildDecisionContext({policy,indicators,market:{roundId:'test-round',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0}});
    const raw=await createMockDecisionProvider().decide(input);
    assert.equal(raw.direction,direction);
    const plan=validateDecision(raw,{input,policy,indicators,now});
    assert.ok(plan.stake>0&&plan.stake<=policy.maxStakePct);
    assert.throws(()=>validateDecision({...raw,direction:direction==='UP'?'DOWN':'UP'},{input,policy,indicators,now}));
    assert.doesNotMatch(decisionPrompt(input),/Use only actual same-round non-Contrarian orders/);
  }
});
