const test = require('node:test');
const assert = require('node:assert/strict');
const { createPredictionSimulation, ROUND } = require('../prediction-sim');
const { normalizeAgentPolicies } = require('../ai-decision');

const indicatorFixture = time => ({ symbol: 'BTCUSDT', dataTimestamp: time,
  priceChangePct: { oneMinute: 0.4, fiveMinutes: 1.1 }, rsi14: 60, ema: { ema5: 105, ema20: 100 },
  macd: { line: 1, signal: 0.5, histogram: 0.5 }, bollinger: { middle: 100, upper: 103, lower: 97, percentB: 0.7, bandwidthPct: 6 },
  atr: { value: 0.2, percent: 0.2 }, adx: { adx: 28, plusDI: 30, minusDI: 10 },
  roc: { tenMinutes: 0.8, twentyMinutes: 1.2 }, longReturns: { fifteenMinutes: 0.9, sixtyMinutes: 2.1 }, momentum: 2, volatility: { perMinutePct: 0.1 }, volumeRatio: 1.2,
  takerFlow: { buyRatio: 0.65, netBase: 30, totalBase: 100 }, spotOrderBookImbalance: 0.2,
  spread: { basisPoints: 1, mid: 100, microprice: 100.001, micropriceBiasBps: 0.1 } });

test('fresh indicators flow through AI validation into one audited paper order', async () => {
  let time = 1800000010000;
  const slot = (Math.floor(time / ROUND) + 1) * ROUND;
  const topic = start => ({ marketTopicId: start, symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: start, status: 'REGISTERED', tradingStatus: 'OPEN', outcomes: [{ name: 'Up', tokenId: 'up' }, { name: 'Down', tokenId: 'down' }] }] });
  const source = {
    marketFor: async start => topic(start),
    detail: async id => topic(id),
    book: async (market, direction) => ({ tokenId: direction === 'UP' ? 'up' : 'down', timestamp: time, asks: [{ price: 0.4, size: 1000 }] }),
  };
  const indicatorSource = { snapshot: async () => indicatorFixture(time) };
  const policies = normalizeAgentPolicies();
  const decisionProvider = {
    describe: () => ({ mode: 'mock', configured: true, simulated: true }),
    decide: async input => input.policy.strategy === 'aggressive'
      ? { round_id: input.market.round_id, action: 'BET', direction: 'UP', stake_usdt: 10, stake_pct: 10, confidence: 90, risk_mode: 'NORMAL', factors: [], reason: 'fresh edge', data_fresh: true, warnings: [] }
      : input.policy.strategy === 'smart'
        ? { round_id: input.market.round_id, action: 'SKIP', direction: null, stake_usdt: 0, stake_pct: 0, confidence: 60, risk_mode: 'WAIT', factors: [], reason: 'no edge', data_fresh: true, warnings: [] }
        : { round_id: input.market.round_id, action: 'BET', direction: 'UP', stake_usdt: 100, stake_pct: 100, confidence: 99, risk_mode: 'ALL_IN', factors: [], reason: 'unsafe', data_fresh: true, warnings: [] },
  };
  const sim = createPredictionSimulation({ source, indicatorSource, decisionProvider, policyFor: id => policies[id], now: () => time });
  await sim.tick();
  time = slot;
  await sim.tick();
  const [aggressive, smart, conservative] = sim.snapshot().agents;
  assert.equal(aggressive.cash, 90);
  assert.equal(aggressive.latest.amount, 10);
  assert.equal(aggressive.latest.decision.action, 'BET');
  assert.match(aggressive.latest.decision.inputHash, /^[a-f0-9]{64}$/);
  assert.equal(smart.cash, 100);
  assert.equal(smart.lastDecision.action, 'SKIP');
  assert.equal(conservative.cash, 100);
  assert.equal(conservative.reason, 'AI_STAKE_OVER_CAP');
  assert.equal(conservative.lastDecision.action, 'REJECTED');
  assert.match(conservative.lastDecision.inputHash, /^[a-f0-9]{64}$/);
  const history = sim.snapshot().auditTrail;
  const snapshot = history.find(event => event.type === 'MARKET_SNAPSHOT');
  assert.equal(snapshot.books.up.asks[0].price, 0.4);
  assert.equal(snapshot.market.marketTopicId, slot);
  assert.equal(history.filter(event => event.type === 'DECISION_INPUT').length, 3);
  assert.equal(history.filter(event => event.type === 'MODEL_RESPONSE').length, 3);
  assert.deepEqual(history.filter(event => event.type === 'DECISION').map(event => event.risk).sort(), ['ACCEPTED_BET', 'ACCEPTED_SKIP', 'REJECTED']);
  assert.equal(history.filter(event => event.type === 'ORDER_INTENT').length, 1);
  const intent = aggressive.latest.intent;
  assert.equal(intent.amount, 10); assert.equal(intent.tokenId, 'up'); assert.equal(intent.mode, 'paper');
  assert.equal(history.find(event => event.id === intent.inputEventId).input.account.initial_balance, 100);
  for (const event of history) {
    const { hash, ...content } = event;
    assert.equal(hash, require('node:crypto').createHash('sha256').update(JSON.stringify(content)).digest('hex'));
  }
  snapshot.books.up.asks[0].price = 0.99;
  assert.equal(sim.snapshot().auditTrail.find(event => event.id === snapshot.id).books.up.asks[0].price, 0.4);
});

test('pause then resume while a model request is pending cancels that attempt', async () => {
  let time = 1800000010000;
  const slot = (Math.floor(time / ROUND) + 1) * ROUND;
  const topic = start => ({ marketTopicId: start, symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: start, status: 'REGISTERED', tradingStatus: 'OPEN', outcomes: [{ name: 'Up', tokenId: 'up' }, { name: 'Down', tokenId: 'down' }] }] });
  const policies = normalizeAgentPolicies();
  let started, release;
  const pending = new Promise(resolve => { release = resolve; });
  const called = new Promise(resolve => { started = resolve; });
  const sim = createPredictionSimulation({
    now: () => time, policyFor: id => policies[id],
    source: { marketFor: async start => topic(start), detail: async id => topic(id), book: async (_, direction) => ({ tokenId: direction === 'UP' ? 'up' : 'down', timestamp: time, asks: [{ price: 0.4, size: 1000 }] }) },
    indicatorSource: { snapshot: async () => indicatorFixture(time) },
    decisionProvider: { describe: () => ({ mode: 'mock' }), decide: async input => {
      started(); await pending;
      return { round_id: input.market.round_id, action: 'BET', direction: 'UP', stake_usdt: 5, stake_pct: 5, confidence: 90, risk_mode: 'NORMAL', factors: [], reason: 'delayed', data_fresh: true, warnings: [] };
    } },
  });
  await sim.tick(); time = slot;
  const running = sim.tick(); await called;
  sim.setEnabled(false); sim.setEnabled(true); release(); await running;
  for (const agent of sim.snapshot().agents) {
    assert.equal(agent.cash, 100);
    assert.equal(agent.orders.length, 0);
    assert.equal(agent.reason, 'QUOTE_WINDOW_MISSED');
  }
});
