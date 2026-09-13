const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildDecisionContext,
  createDeepSeekDecisionProvider,
  createMockDecisionProvider,
  decisionPrompt,
  normalizePolicy,
  validateDecision,
} = require('../ai-decision');

function fixture(strategy = 'aggressive') {
  const now = 1800000000000;
  const policy = normalizePolicy({ strategy, maxStakePct: 100, allowAllIn: true, decisionVariance: 82 }, 'A');
  const indicators = {
    dataTimestamp: now,
    priceChangePct: { oneMinute: 0.4, fiveMinutes: 1.2 },
    rsi14: 62,
    ema: { ema5: 105, ema20: 100 },
    volumeRatio: 1.2,
    spotOrderBookImbalance: 0.2,
    macd: { line: 1, signal: 0.5, histogram: 0.5 },
    bollinger: { middle: 100, upper: 103, lower: 97, percentB: 0.7, bandwidthPct: 6 },
    atr: { value: 0.2, percent: 0.2 },
    adx: { adx: 28, plusDI: 30, minusDI: 10 },
    roc: { tenMinutes: 0.8, twentyMinutes: 1.2 },
    longReturns: { fifteenMinutes: 0.9, sixtyMinutes: 2.1 },
    momentum: 2,
    volatility: { perMinutePct: 0.1 },
    takerFlow: { buyRatio: 0.65, netBase: 30, totalBase: 100 },
    spread: { basisPoints: 1, mid: 100, microprice: 100.001, micropriceBiasBps: 0.1 },
  };
  const input = buildDecisionContext({
    market: { roundId: 'round-1', secondsToClose: 300, upOdds: 2, downOdds: 2, dataTimestamp: now },
    indicators,
    account: { balance: 100, wins: 2, losses: 0, winStreak: 2, lossStreak: 0, openStake: 0 },
    policy,
  });
  return { now, policy, indicators, input };
}

test('recovery accepts cent balances without floating point truncation', async () => {
  for(const balance of [0.01,1.15,2]) {
    const f=fixture('conservative');
    Object.assign(f.input.account,{balance,initial_balance:10,capital_recovery:true});
    const raw=await createMockDecisionProvider().decide(f.input);
    assert.equal(validateDecision(raw,{...f,now:f.now}).stake,balance);
  }
});

test('capital recovery overrides cautious amount caps but keeps direction, freshness and edge checks', async () => {
  const f=fixture('conservative');
  Object.assign(f.input.account,{balance:2,initial_balance:10,capital_recovery:true});
  const provider=createMockDecisionProvider(),raw=await provider.decide(f.input);
  assert.equal(raw.risk_mode,'ALL_IN');assert.equal(raw.stake_usdt,2);
  const plan=validateDecision(raw,{...f,now:f.now});
  assert.equal(plan.stake,2);assert.match(plan.reason,/搏命梭哈/);
  assert.throws(()=>validateDecision({...raw,stake_usdt:1,stake_pct:50},{...f,now:f.now}),/AI_ALL_IN_REJECTED/);
  assert.throws(()=>validateDecision({...raw,direction:'DOWN'},{...f,now:f.now}),/AI_STRATEGY_CONDITION_NOT_MET/);
  assert.throws(()=>validateDecision(raw,{...f,now:f.now+120000}),/STALE|ROUND/);
  const badOdds=structuredClone(f.input);badOdds.market.up_odds=1.01;
  assert.throws(()=>validateDecision(raw,{...f,input:badOdds,now:f.now}),/AI_EDGE_NOT_POSITIVE/);
  const text=decisionPrompt(f.input);assert.match(text,/RECOVERY_ALL_IN is active/);assert.doesNotMatch(text,/ALL_IN is disabled/);
});

test('profit protection uses the same reduced amount in prompt choices, local model and gate', async () => {
  const f=fixture('conservative');Object.assign(f.input.account,{balance:200,initial_balance:100});
  const raw=await createMockDecisionProvider().decide(f.input);
  const plan=validateDecision(raw,{...f,now:f.now});
  assert.equal(plan.action,'BET');assert.ok(plan.stake<=14);assert.match(plan.reason,/减少下注/);
  assert.throws(()=>validateDecision({...raw,stake_usdt:20,stake_pct:10},{...f,now:f.now}),/AI_STAKE_OVER_CAP/);
});

test('offline model uses strategy, indicators and streaks to produce a bounded paper decision', async () => {
  const f = fixture();
  const provider = createMockDecisionProvider();
  const raw = await provider.decide(f.input);
  const plan = validateDecision(raw, { ...f, now: f.now });
  assert.equal(plan.action, 'BET');
  assert.equal(plan.direction, 'UP');
  assert.equal(plan.riskMode, 'ADD_ON');
  assert.equal(plan.stake, 60);
  assert.ok(plan.expectedEdge > 0);
  assert.match(decisionPrompt(f.input), /action_urge=85\/100/);
  assert.match(decisionPrompt(f.input), /state=win; streak=2; personality_stake_multiplier=2\.000; shared_tilt_multiplier=1\.000; normal_stake_multiplier=2\.000; effective_minimum_confidence=50\.00/);
});
test('decision context and prompt keep the selected BNB timeframe', () => {
  const f=fixture();
  const policy=normalizePolicy({...f.policy,coin:'BNB'},'A');
  const input=buildDecisionContext({market:{roundId:'bnb-hour',timeframe:'1h',roundDurationSeconds:3600,secondsToClose:3590,upOdds:2,downOdds:2,dataTimestamp:f.now},indicators:f.indicators,account:{balance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0},policy});
  assert.equal(input.market.asset,'BNBUSDT');assert.equal(input.market.timeframe,'1h');assert.equal(input.market.round_duration_seconds,3600);
  assert.match(decisionPrompt(input),/one-hour Up\/Down paper-betting decision engine for BNBUSDT/);
});

test('Candlestick Bro sees only closed OHLC candles and odds, can bet or skip, and rejects the wrong direction', async () => {
  const now=1800000000000,minute=60000;
  const bars=Array.from({length:20},(_,index)=>{
    const open=100+index*.1,close=index<17?open+.02:open+.8;
    return {openTime:now-(20-index)*minute,open,high:Math.max(open,close)+.1,low:Math.min(open,close)-.1,close,closeTime:now-(19-index)*minute-1};
  });
  const policy=normalizePolicy({strategy:'priceAction'},'P');
  const indicators={dataTimestamp:now,candles:{intervalMinutes:1,targetMinutes:5,bars}};
  const input=buildDecisionContext({market:{roundId:'raw-k',timeframe:'5m',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},indicators,account:{balance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0},policy});
  assert.deepEqual(policy.indicators,['candles','odds']);
  assert.deepEqual(Object.keys(input.indicators),['raw_candles','market_odds']);
  assert.ok(input.indicators.raw_candles.bars.every(bar=>!Object.hasOwn(bar,'volume')));
  const prompt=decisionPrompt(input);
  assert.match(prompt,/latest 20 fully closed OHLC bars/i);
  assert.match(prompt,/Do not infer or use RSI, MACD, moving averages, order book, volume, news/i);
  const decision=await createMockDecisionProvider().decide(input);
  assert.equal(decision.action,'BET');assert.equal(decision.direction,'UP');
  const wrong={...decision,direction:'DOWN'};
  assert.throws(()=>validateDecision(wrong,{input,indicators,policy,now}),{code:'AI_STRATEGY_CONDITION_NOT_MET'});
  const flatBars=bars.map((bar,index)=>({...bar,open:100,high:100.1,low:99.9,close:100+(index%2?.01:-.01)}));
  const flatInput=buildDecisionContext({market:{roundId:'raw-k-flat',timeframe:'5m',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},indicators:{...indicators,candles:{...indicators.candles,bars:flatBars}},account:{balance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0},policy});
  assert.equal((await createMockDecisionProvider().decide(flatInput)).action,'SKIP');
});

test('arena tilt is frozen into the AI context and prompt, then raises a cautious streak bet without changing caps', async () => {
  const f=fixture('conservative');
  f.input=buildDecisionContext({
    market:{roundId:'round-1',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:f.now},indicators:f.indicators,
    account:{balance:100,initialBalance:100,wins:0,losses:3,winStreak:0,lossStreak:3,openStake:0},
    policy:f.policy,battleEmotion:100,
  });
  assert.equal(f.input.policy.battle_emotion,100);
  assert.ok(f.input.policy.shared_tilt_multiplier>1);
  assert.match(decisionPrompt(f.input),/battle_emotion=100\/100/);
  const raw=await createMockDecisionProvider().decide(f.input);
  assert.equal(raw.direction,'UP');
  assert.equal(raw.risk_mode,'ADD_ON');
  assert.ok(raw.stake_pct>5&&raw.stake_pct<=10);
});

test('turning emotion to zero preserves direction while a strong signal still uses the personality ladder', async () => {
  const f = fixture();
  const calmPolicy = normalizePolicy({ strategy:'aggressive', maxStakePct:100, allowAllIn:true, decisionVariance:82, emotionSensitivity:0 }, 'A');
  const input = buildDecisionContext({
    market:{ roundId:'round-1', secondsToClose:300, upOdds:2, downOdds:2, dataTimestamp:f.now },
    indicators:f.indicators,
    account:{ balance:100, wins:2, losses:0, winStreak:2, lossStreak:0, openStake:0 },
    policy:calmPolicy,
  });
  const raw = await createMockDecisionProvider().decide(input);
  assert.equal(raw.direction,'UP');assert.equal(raw.stake_pct,60);assert.equal(raw.risk_mode,'NORMAL');
  assert.equal(input.policy.emotion_stake_multiplier,1);assert.equal(input.policy.effective_minimum_confidence,51.2);
});

test('local risk gate rejects wrong rounds, stale data, over-cap stakes and unsafe all-in', () => {
  const f = fixture('conservative');
  const valid = { round_id: 'round-1', action: 'BET', direction: 'UP', stake_usdt: 5, stake_pct: 5,
    confidence: 90, risk_mode: 'NORMAL', factors: [], reason: 'test', data_fresh: true, warnings: [] };
  assert.throws(() => validateDecision({ ...valid, round_id: 'old' }, { ...f, now: f.now }), error => error.code === 'AI_ROUND_MISMATCH');
  assert.throws(() => validateDecision({ ...valid, stake_usdt: 11, stake_pct: 11 }, { ...f, now: f.now }), error => error.code === 'AI_STAKE_OVER_CAP');
  assert.throws(() => validateDecision({ ...valid, risk_mode: 'ALL_IN' }, { ...f, now: f.now }), error => error.code === 'AI_ALL_IN_REJECTED');
  assert.throws(() => validateDecision(valid, { ...f, now: f.now + 10001 }), error => error.code === 'AI_DATA_STALE');
});

test('DeepSeek adapter sends one tool-free JSON request and parses the mocked response', async () => {
  const f = fixture();
  let captured;
  const expected = { round_id: 'round-1', action: 'SKIP', direction: null, stake_usdt: 0, stake_pct: 0,
    confidence: 60, risk_mode: 'WAIT', factors: [], reason: 'no edge', data_fresh: true, warnings: [] };
  const provider = createDeepSeekDecisionProvider({ apiKey: 'test-only-key', model: 'test-model', fetchImpl: async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(expected) } }] }) };
  } });
  assert.deepEqual(await provider.decide(f.input), expected);
  assert.equal(captured.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(captured.body.model, 'test-model');
  assert.equal(captured.body.messages.length, 2);
  assert.equal(captured.body.messages[0].content, decisionPrompt(f.input));
  assert.equal(captured.body.tools, undefined);
  assert.equal(captured.options.headers.authorization, 'Bearer test-only-key');
});

test('DeepSeek adapter fails closed on tool-call shaped and Markdown-wrapped responses', async () => {
  const f = fixture();
  const responses = [
    { choices: [{ message: { tool_calls: [{ function: { name: 'place_order', arguments: '{}' } }] } }] },
    { choices: [{ message: { content: '```json\n{"round_id":"round-1","action":"SKIP"}\n```' } }] },
  ];
  for (const payload of responses) {
    const provider = createDeepSeekDecisionProvider({
      apiKey: 'test-only-key',
      fetchImpl: async () => ({ ok: true, json: async () => payload }),
    });
    await assert.rejects(provider.decide(f.input), error => error.code === 'AI_RESPONSE_INVALID');
  }
});

test('AI provider metadata never exposes its API key', () => {
  const secret = 'deepseek-secret-must-not-leak';
  const provider = createDeepSeekDecisionProvider({ apiKey: secret });
  assert.equal(provider.describe().configured, true);
  assert.equal(JSON.stringify(provider.describe()).includes(secret), false);
});

test('decision contract rejects numeric coercion and individually future-dated sources', () => {
  const f = fixture();
  const raw = { round_id: 'round-1', action: 'BET', direction: 'UP', stake_usdt: 20, stake_pct: 20,
    confidence: 80, risk_mode: 'NORMAL', factors: [], reason: 'review', data_fresh: true, warnings: [] };
  for (const [field, value] of [['stake_usdt', '20'], ['stake_pct', [20]], ['confidence', '80'], ['stake_usdt', true]]) {
    assert.throws(() => validateDecision({ ...raw, [field]: value }, { ...f, now: f.now }), { code: 'AI_RESPONSE_INVALID' });
  }
  assert.throws(() => validateDecision(raw, { ...f, indicators: { ...f.indicators, dataTimestamp: f.now + 60000 }, now: f.now }), { code: 'AI_DATA_STALE' });
});

test('ALL_IN means full balance and aggressive losses are only an eligibility condition', () => {
  const f = fixture();
  const raw = { round_id: 'round-1', action: 'BET', direction: 'UP', stake_usdt: 100, stake_pct: 100,
    confidence: 90, risk_mode: 'ALL_IN', factors: [], reason: 'aligned', data_fresh: true, warnings: [] };
  assert.throws(() => validateDecision(raw, { ...f, now: f.now }), { code: 'AI_ALL_IN_REJECTED' });
  f.input.account.loss_streak = 2;
  assert.equal(validateDecision(raw, { ...f, now: f.now }).stake, 100);
  assert.throws(() => validateDecision({ ...raw, stake_usdt: 20, stake_pct: 20 }, { ...f, now: f.now }), { code: 'AI_ALL_IN_REJECTED' });
});

test('model-generated explanation is rendered as text instead of executable HTML', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const appSource = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
  const paperSource = fs.readFileSync(path.join(publicDir, 'paper.js'), 'utf8');
  assert.match(appSource, /reason\.textContent=decision\?\.reason/);
  assert.match(paperSource, /window\.openModelDetail\(agent\.id\)/); // Summary cards now use the same text-only detail view.
  assert.doesNotMatch(`${appSource}\n${paperSource}`, /innerHTML\s*=.*decision(?:\?\.)?\.reason/);
});

test('replays the three ChatGPT web review responses through the provider parser and local risk gate', async () => {
  const responses = require('./fixtures/chatgpt-review-responses.json');
  const strategies = ['aggressive', 'smart', 'conservative'];
  for (let index = 0; index < responses.length; index++) {
    const f = fixture(strategies[index]);
    f.input.market.round_id = 'offline-review-round';
    const provider = createDeepSeekDecisionProvider({ apiKey: 'offline-only', fetchImpl: async () => ({ ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(responses[index]) } }] }) }) });
    const raw = await provider.decide(f.input);
    if (index === 2) assert.throws(() => validateDecision(raw, { ...f, now: f.now }), { code: 'AI_STAKE_OVER_CAP' });
    else {
      if(index===1)assert.throws(()=>validateDecision(raw,{...f,now:f.now}),{code:'AI_REASON_CONTRADICTS_INPUT'});
      // Historical outputs remain readable; current network SKIPs require a reason code.
      const plan = validateDecision(index===1?responses[index]:raw, { ...f, now: f.now });
      assert.equal(plan.action, index === 0 ? 'BET' : 'SKIP');
      assert.equal(plan.stake, index === 0 ? 20 : 0);
    }
  }
});

test('expired round budget prevents a provider request and shortened budget aborts a slow request', async () => {
  const f = fixture();
  let calls = 0;
  const provider = createDeepSeekDecisionProvider({ apiKey: 'offline-only', fetchImpl: async (_, options) => {
    calls++;
    // The timer is deliberately kept alive in this isolated fake transport.
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 500);
      options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(options.signal.reason); }, { once: true });
    });
  } });
  await assert.rejects(provider.decide(f.input, { deadlineMs: f.now + 200, now: () => f.now }), { code: 'AI_DEADLINE_EXPIRED' });
  assert.equal(calls, 0);
  await assert.rejects(provider.decide(f.input, { deadlineMs: f.now + 270, now: () => f.now }), { code: 'AI_REQUEST_FAILED' });
  assert.equal(calls, 1);
});
