const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPublicPracticeSource, createSimulationMarketSource, normalizeOfficialQuote, estimatePredictionQuote } = require('../simulation-market-source');
const { createPredictionSimulation, ROUND } = require('../prediction-sim');
const { createSimulationBattles } = require('../simulation-battles');
const { createExecutionBridge } = require('../execution-bridge');
const { createWarriorServer } = require('../server');
const { fixture } = require('./fixtures/simulation-market.cjs');
const simulation = (f, extra = {}) => createPredictionSimulation({ source: f.source, indicatorSource: f.indicatorSource,
  decisionProvider: f.decisionProvider, policyFor: () => f.policy, agentPolicies: [f.policy], now: f.now, ...extra });

test('no-wallet practice completes virtual entry and settlement using credential-free public candles', async () => {
  const f = fixture(), sim = simulation(f);
  await sim.tick(); f.setTime(f.slot); await sim.tick();
  let state = sim.snapshot(), order = state.agents[0].orders[0];
  assert.ok(order, JSON.stringify(state)); assert.equal(state.marketSource, 'public-spot');
  assert.equal(order.quote.odds, 2); assert.equal(state.agents[0].cash, 99);
  assert.equal(order.intent.marketSource, 'public-spot');
  f.setTime(f.slot + ROUND + 16000); await sim.tick();
  state = sim.snapshot(); order = state.agents[0].orders[0];
  assert.equal(order.status, 'WON'); assert.equal(order.payout, 2); assert.equal(state.agents[0].cash, 101);
  assert.equal(order.settlement.source, 'public-spot-practice');
  assert.ok(state.agents[0].reconciliation.matched);
  assert.ok(f.calls.every(args => args.join(' ') === 'wallet status'));
  assert.ok(f.fetches.length >= 2);
  for (const { address, options } of f.fetches) {
    assert.equal(new URL(address).hostname, 'data-api.binance.vision');
    assert.deepEqual(options.headers, { accept: 'application/json' });
  }
});

test('practice tie refunds stake; missing or incomplete closing evidence never settles', async () => {
  const f = fixture(), sim = simulation(f); f.closePrice(100);
  await sim.tick(); f.setTime(f.slot); await sim.tick();
  f.unavailable(true); f.setTime(f.slot + ROUND + 16000); await sim.tick();
  assert.equal(sim.snapshot().agents[0].orders[0].status, 'OPEN');
  f.unavailable(false); f.setTime(f.now() + 16000); await sim.tick();
  assert.equal(sim.snapshot().agents[0].orders[0].status, 'SPLIT');
  assert.equal(sim.snapshot().agents[0].cash, 100);
  const source = createPublicPracticeSource({ now: f.now, fetchImpl: async () => ({ ok: true, json: async () => [[f.slot + 60000, '100', '101', '99', '101', '1', f.slot + 119999]] }) });
  const topic = await source.marketFor(f.slot, 'BTCUSDT', ROUND);
  await assert.rejects(source.detail(topic.marketTopicId), /PRACTICE_PRICE_UNAVAILABLE/);
});

test('connection at boundary upgrades practice; paper uses real book and live executes the same saved decision', async () => {
  const f = fixture(), sim = simulation(f); await sim.tick();
  f.connect(true); f.setTime(f.slot); await sim.tick();
  const battle = { ...sim.snapshot(), id: 'battle' }, agent = battle.agents[0], intent = agent.latest.intent;
  assert.equal(battle.marketSource, 'binance-prediction');
  assert.equal(agent.latest.quote.source, 'real-book-fee-estimate');
  assert.equal(agent.latest.quote.shares, 2.45); assert.ok(Math.abs(agent.latest.quote.feeShares - .05) < 1e-10);
  assert.equal(agent.cash, 99); // no second deduction of a fee denominated in shares
  assert.ok(!JSON.stringify(battle).includes('official-private'));
  const quoteCalls = f.calls.filter(args => args[2] === 'quote').length;
  assert.equal(quoteCalls, 0);
  let submitted = 0, usedQuote;
  const bridge = createExecutionBridge({ now: f.now, getIntent: () => ({ battle, agent, intent }),
    quotesEnabled: true, tradingEnabled: true, requestQuote: async (value, slippage) => f.source.executionQuote(value, slippage),
    submitOrder: async id => { submitted++; usedQuote = id; return { orderId: 'TEST_ONLY' }; } });
  const quoted = await bridge.quote('battle', intent.id);
  assert.equal(submitted, 0); assert.equal(Number(quoted.quote.amountOut), 2.4);
  assert.deepEqual(quoted.intent, intent);
  assert.equal(quoted.intent.paperEstimate.shares, 2.45);
  assert.equal(f.calls.filter(args => args[2] === 'quote').length, quoteCalls + 1);
  await assert.rejects(bridge.submit(quoted.id, false), /HUMAN_CONFIRMATION_REQUIRED/);
  await bridge.submit(quoted.id, true);
  assert.equal(submitted, 1); assert.match(usedQuote, /^official-private-/);
  await assert.rejects(bridge.submit(quoted.id, true), /EXECUTION_ALREADY_CONSUMED/);
  assert.ok(!f.calls.some(args => args.includes('place-order')));
});

test('practice and official positions keep their original settlement sources across connection changes and restart', async () => {
  const f = fixture(), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-source-'));
  const file = path.join(dir, 'ledger.json'); let sim = simulation(f, { file });
  await sim.tick(); f.setTime(f.slot); await sim.tick();
  f.connect(true); f.setTime(f.slot + 16000); await sim.tick();
  f.setTime(f.slot + ROUND); await sim.tick();
  let orders = sim.snapshot().agents[0].orders;
  assert.equal(orders[0].marketSource, 'public-spot'); assert.equal(orders[1].marketSource, 'binance-prediction');
  f.connect(false); f.setTime(f.slot + ROUND + 16000); await sim.tick();
  orders = sim.snapshot().agents[0].orders;
  assert.equal(orders[0].status, 'WON'); assert.equal(orders[1].status, 'OPEN');
  sim.end(); f.setTime(f.slot + ROUND * 2 + 16000); await sim.tick();
  assert.equal(sim.snapshot().agents[0].orders[1].status, 'OPEN');
  sim = simulation(f, { file }); f.connect(true); f.setTime(f.now() + 16000); await sim.tick();
  orders = sim.snapshot().agents[0].orders;
  assert.equal(orders[1].status, 'WON'); assert.equal(orders[1].payout, 2.45);
  assert.equal(orders[1].settlement.source, 'official-market'); assert.equal(sim.snapshot().status, 'ended');
});

test('official failure never falls back, and practice intents cannot be sent to live bridge', async () => {
  const f = fixture(); f.connect(true); f.unavailable(true);
  await assert.rejects(f.source.marketFor(f.slot, 'BTCUSDT', ROUND), /MARKET_UNAVAILABLE/);
  assert.equal(f.fetches.length, 0);
  const unknown = createSimulationMarketSource({ official: f.official, walletStatus: async () => { throw Error('status unavailable'); }, run: f.run, fetchImpl: f.fetchImpl, now: f.now });
  await assert.rejects(unknown.marketFor(f.slot, 'BTCUSDT', ROUND), /status unavailable/);
  assert.equal(f.fetches.length, 0);
  f.connect(false); f.unavailable(false); const sim = simulation(f);
  await sim.tick();
  assert.equal(sim.snapshot().recovery.code, 'MARKET_UNAVAILABLE');
  f.setTime(sim.snapshot().recovery.nextRetryAt); await sim.tick();
  assert.equal(sim.snapshot().recovery, null);
  f.setTime(f.slot); await sim.tick();
  const battle = { ...sim.snapshot(), id: 'b' }, agent = battle.agents[0], intent = agent.latest.intent;
  const bridge = createExecutionBridge({ getIntent: () => ({ battle, agent, intent }), now: f.now, quotesEnabled: true, requestQuote: () => assert.fail('must not quote') });
  await assert.rejects(bridge.quote('b', intent.id), /PRACTICE_INTENT_NOT_EXECUTABLE/);
});

test('expired decisions cannot request an official quote', async () => {
  const f = fixture(); f.connect(true); const sim = simulation(f);
  await sim.tick(); f.setTime(f.slot); await sim.tick();
  const intent = sim.snapshot().agents[0].latest.intent;
  f.setTime(f.now() + 61000);
  await assert.rejects(f.source.executionQuote(intent, 1000), /INTENT_EXPIRED/);
  assert.equal(f.calls.filter(args => args[2] === 'quote').length, 0);
});

test('slow official quote expiring the saved decision cannot be submitted or change paper cash', async () => {
  const f = fixture(); f.connect(true); const sim = simulation(f);
  await sim.tick(); f.setTime(f.slot); await sim.tick();
  const battle = { ...sim.snapshot(), id: 'b' }, agent = battle.agents[0], intent = agent.latest.intent;
  f.quoteDelay(61000);
  const bridge = createExecutionBridge({ now: f.now, getIntent: () => ({ battle, agent, intent }), quotesEnabled: true,
    requestQuote: (value, slippage) => f.source.executionQuote(value, slippage) });
  await assert.rejects(bridge.quote('b', intent.id), /INTENT_EXPIRED/);
  assert.equal(sim.snapshot().agents[0].cash, 99); assert.equal(sim.snapshot().agents[0].orders.length, 1);
  assert.equal(bridge.list()[0].status, 'QUOTE_FAILED');
});

test('quote schema validates units, identity, expiry and finite service fees', () => {
  const args = { tokenId: 'up', amount: 1, chainId: '56', slippageBps: 1000, now: 1800000000000 };
  const raw = { quoteId: 'q', tokenId: 'up', side: 'BUY', orderType: 'MARKET', chainId: '56', slippageBps: 1000,
    amountIn: '1', amountOut: '2.4', feeAmount: '.1', minReceive: '2.16', expireAt: args.now + 60000 };
  assert.equal(normalizeOfficialQuote(raw, args).shares, 2.4);
  for (const change of [{ tokenId: 'other' }, { amountOut: 'NaN' }, { feeAmount: undefined }, { amountIn: 2 }, { minReceive: 5 }, { expireAt: 0 }, { chainId: '1' }]) {
    assert.throws(() => normalizeOfficialQuote({ ...raw, ...change }, args), /UNSAFE_LIVE_QUOTE/);
  }
});

test('an empty connected wallet can paper trade; rejected real quote does not change the paper ledger', async () => {
  const f = fixture(); f.connect(true);
  const source = createSimulationMarketSource({ official: f.official, walletStatus: async () => 'CONNECTED', now: f.now,
    run: async () => { throw Object.assign(new Error('TRADE_INSUFFICIENT_BALANCE'), { code: 'UNKNOWN_ERROR' }); } });
  const sim = simulation(f, { source }); await sim.tick(); f.setTime(f.slot); await sim.tick();
  const data = sim.snapshot();
  assert.equal(data.agents[0].cash, 99); assert.equal(data.agents[0].orders.length, 1);
  assert.equal(data.agents[0].latest.quote.shares, 2.45);
  await assert.rejects(source.executionQuote(data.agents[0].latest.intent, 1000), /TRADE_INSUFFICIENT_BALANCE/);
  assert.deepEqual(sim.snapshot().agents[0].orders, data.agents[0].orders);
});

test('shared source survives battle wrapper; HTTP execution requests an official quote for the saved decision', async () => {
  const f = fixture(); f.connect(true);
  const sim = createSimulationBattles({ source: f.source, indicatorSource: f.indicatorSource, decisionProvider: f.decisionProvider, now: f.now, leaseEnabled: false });
  const created = sim.create('shared', { initialBalance: 10, agents: [f.policy] });
  await sim.tick(); f.setTime(f.slot); await sim.tick();
  const order = sim.snapshot(created.id).agents[0].latest;
  assert.equal(order.quote.source, 'real-book-fee-estimate');
  const server = createWarriorServer({ simulation: sim, predictionSource: f.source, walletCli: f.run, marketFetch: f.fetchImpl,
    paperFile: null, liveQuotesEnabled: true, liveTradingEnabled: false, now: f.now });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const before = f.calls.filter(args => args[2] === 'quote').length;
    const response = await fetch(origin + '/api/executions/quote', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ battleId: created.id, intentId: order.intent.id }) });
    const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(Number(body.quote.amountOut), 2.4);
    assert.equal(body.intent.paperEstimate.shares, order.quote.shares);
    assert.equal(before, 0);
    assert.equal(f.calls.filter(args => args[2] === 'quote').length, before + 1);
    assert.ok(!JSON.stringify(body).includes('official-private'));
    assert.ok(!f.calls.some(args => args.includes('place-order')));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('fee estimates use each consumed price level and reject unknown fees or stale depth', () => {
  const f = fixture(), market = { vendor: 'PREDICT_FUN', feeRateBps: 200 };
  const book = { tokenId: 't', timestamp: f.now(), asks: [{ price: .4, size: 1 }, { price: .8, size: 10 }] };
  const quote = estimatePredictionQuote(market, book, 't', 1.2, f.now());
  assert.ok(Math.abs(quote.grossShares - 2) < 1e-10);
  assert.ok(Math.abs(quote.feeShares - .025) < 1e-10);
  assert.ok(Math.abs(quote.shares - 1.975) < 1e-10);
  assert.equal(quote.feesIncluded, true); assert.equal(quote.estimated, true);
  for (const change of [{ feeRateBps: undefined }, { feeRateBps: -1 }, { feeRateBps: 'NaN' }, { vendor: 'OTHER' }]) {
    assert.throws(() => estimatePredictionQuote({ ...market, ...change }, book, 't', 1, f.now()), /UNSUPPORTED_MARKET_FEES/);
  }
  assert.throws(() => estimatePredictionQuote(market, book, 't', 1, f.now() + 10001), /STALE_BOOK/);
});
