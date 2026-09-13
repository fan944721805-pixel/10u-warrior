const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createExecutionBridge } = require('../execution-bridge');
const { createWarriorServer } = require('../server');

function fixture() {
  let time = 1800000000000;
  const intent = { id: 'intent-1', agentId: 'fox', mode: 'paper', side: 'BUY', orderType: 'MARKET',
    amount: 2, expiresAt: time + 10000, tokenId: 'up', marketTopicId: 'topic-1' };
  const agent = { id: 'fox', policy: { name: 'Fox' }, orders: [{ status: 'OPEN', intent }] };
  const battle = { id: 'battle-1', name: 'Paper only', status: 'running', enabled: true, config: { initialBalance: 10 }, agents: [agent] };
  const hash = '0x' + 'a'.repeat(64);
  const calls = [];
  const options = { now: () => time, quotesEnabled: true, tradingEnabled: true,
    getIntent: () => ({ battle, agent, intent }),
    requestQuote: async () => { calls.push('quote'); return { quoteId: 'private-quote', amountIn: '2', expireAt: time + 5000, expectedShares: '4' }; },
    submitOrder: async (_, __, ___, guard) => { guard(); calls.push('submit'); return { orderId: 'official-1', status: 'SUBMITTED', txHash: hash }; },
    readOrders: async () => [{ orderId: 'official-1', status: 'FILLED', txHash: hash, shares: '4' }],
    readTransaction: async () => ({ txHash: hash, status: 'confirmed' }),
  };
  return { options, battle, intent, calls, hash, now: options.now, time: value => { time = value; } };
}

test('bridge: preview -> real quote -> explicit confirmation -> exact order and wallet evidence, with persistent identity', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-bridge-'));
  try {
    const f = fixture(), options = { ...f.options, file: path.join(dir, 'executions.json') };
    let bridge = createExecutionBridge(options);
    assert.equal(bridge.preview('battle-1', 'intent-1').mode, 'preview-only');
    assert.deepEqual(f.calls, []);
    const quote = await bridge.quote('battle-1', 'intent-1');
    assert.equal(quote.status, 'QUOTED'); assert.equal(quote.intent.amount, 2);
    assert.ok(!JSON.stringify(quote).includes('private-quote'));
    await assert.rejects(bridge.submit(quote.id, false), { code: 'HUMAN_CONFIRMATION_REQUIRED' });
    bridge = createExecutionBridge(options);
    const submitted = await bridge.submit(quote.id, true);
    assert.equal(submitted.status, 'SUBMITTED');
    await assert.rejects(bridge.submit(quote.id, true), { code: 'EXECUTION_ALREADY_CONSUMED' });
    const linked = await bridge.reconcile(quote.id);
    assert.equal(linked.reconciliation.officialOrder.status, 'FILLED');
    assert.equal(linked.reconciliation.status, 'EVIDENCE_LINKED');
    assert.equal(linked.reconciliation.walletReceiptVerified, false);
    assert.equal(linked.reconciliation.transactionHash, f.hash);
    assert.deepEqual(createExecutionBridge(options).get(quote.id), linked);
    assert.deepEqual(f.calls, ['quote', 'submit']);
    assert.equal(f.battle.agents[0].orders[0].status, 'OPEN'); // Paper ledger is untouched.
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('bridge: quote-only mode cannot submit; default mode cannot even request a quote', async () => {
  const f = fixture();
  const off = createExecutionBridge({ ...f.options, quotesEnabled: false, tradingEnabled: false });
  await assert.rejects(off.quote('battle-1', 'intent-1'), { code: 'LIVE_QUOTES_DISABLED' });
  const quotes = createExecutionBridge({ ...f.options, tradingEnabled: false });
  const row = await quotes.quote('battle-1', 'intent-1');
  await assert.rejects(quotes.submit(row.id, true), { code: 'LIVE_TRADING_DISABLED' });
  assert.deepEqual(f.calls, ['quote']);
});

test('bridge: malformed/changed amounts and expired quotes are rejected without invented expiry', async () => {
  for (const bad of [{ amountIn: undefined }, { amountIn: 'NaN' }, { amountIn: 3 }, { expireAt: null }, { expireAt: 'yesterday' }, { expireAt: 100 }, { quoteId: null }]) {
    const f = fixture();
    const bridge = createExecutionBridge({ ...f.options, requestQuote: async () => ({ quoteId: 'q', amountIn: 2, expireAt: f.now() + 1000, ...bad }) });
    await assert.rejects(bridge.quote('battle-1', 'intent-1'), { code: 'UNSAFE_LIVE_QUOTE' });
    assert.equal(bridge.list()[0].status, 'QUOTE_FAILED');
    assert.equal(f.calls.length, 0);
  }
});

test('bridge: quote in flight is deduplicated; pause invalidates it', async () => {
  const f = fixture(); let release;
  const pending = new Promise(resolve => { release = resolve; });
  const bridge = createExecutionBridge({ ...f.options, requestQuote: async () => { await pending; return f.options.requestQuote(); } });
  const quoting = bridge.quote('battle-1', 'intent-1');
  await assert.rejects(bridge.quote('battle-1', 'intent-1'), { code: 'INTENT_ALREADY_BRIDGED' });
  f.battle.enabled = false; release();
  await assert.rejects(quoting, { code: 'BATTLE_NOT_RUNNING' });
});

test('bridge: pause during preflight and uncertain submission never permit a late or duplicate order', async () => {
  const f = fixture();
  const bridge = createExecutionBridge({ ...f.options, submitOrder: async (_, __, ___, guard) => {
    f.battle.enabled = false; guard(); f.calls.push('must-not-submit');
  } });
  const q = await bridge.quote('battle-1', 'intent-1');
  await assert.rejects(bridge.submit(q.id, true), { code: 'BATTLE_NOT_RUNNING' });
  assert.equal(bridge.get(q.id).status, 'UNKNOWN');
  f.battle.enabled = true;
  await assert.rejects(bridge.submit(q.id, true), { code: 'EXECUTION_ALREADY_CONSUMED' });
  assert.equal((await bridge.reconcile(q.id)).reconciliation.reason, 'MISSING_OFFICIAL_ORDER_ID');
  assert.deepEqual(f.calls, ['quote']);
});

test('bridge: exact order and exact transaction hash are required; unrelated wallet entries cannot be linked', async () => {
  const f = fixture();
  const bridge = createExecutionBridge({ ...f.options, readTransaction: async () => ({ txHash: '0x' + 'b'.repeat(64), amount: 999 }) });
  const q = await bridge.quote('battle-1', 'intent-1'); await bridge.submit(q.id, true);
  const result = await bridge.reconcile(q.id);
  assert.equal(result.reconciliation.status, 'ORDER_ONLY'); assert.equal(result.reconciliation.walletEvidence, null);
});

test('bridge: per-Agent real allocation cap is separate from profitable paper balances', async () => {
  const f = fixture(), bridge = createExecutionBridge(f.options);
  f.battle.config.initialBalance = 3;
  await bridge.quote('battle-1', 'intent-1');
  f.intent.id = 'intent-2';
  await assert.rejects(bridge.quote('battle-1', 'intent-2'), { code: 'LIVE_BATTLE_BUDGET_EXCEEDED' });
});

test('bridge: storage failure prevents external quotation', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-bridge-storage-'));
  try {
    const f = fixture(), file = path.join(dir, 'executions.json');
    const bridge = createExecutionBridge({ ...f.options, file });
    fs.mkdirSync(file + '.tmp');
    await assert.rejects(bridge.quote('battle-1', 'intent-1'), { code: 'EXECUTION_STORAGE_ERROR' });
    assert.deepEqual(f.calls, []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('HTTP bridge derives trade fields from saved intent and keeps real-submit disabled', async () => {
  const f = fixture(), calls = [];
  const server = createWarriorServer({ paperFile: null, liveTradingEnabled: false, liveQuotesEnabled: true, now: f.now,
    simulation: { snapshot: () => structuredClone(f.battle) }, walletCli: async args => {
      calls.push(args);
      if (args.join(' ') === 'wallet status') return { data: { status: 'CONNECTED' } };
      if (args.join(' ') === 'wallet settings') return { data: { predictionEnabled: true, predictionQuotaLeft: 10 } };
      if (args[1] === 'tx-lock') return { data: { status: 'UNLOCKED' } };
      if (args[2] === 'quote') return { data: { quoteId: 'private', amountIn: 2, expireAt: f.now() + 5000, accessToken: 'secret-test' } };
      throw new Error('Unexpected external command');
    } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (route, data, originHeader = origin) => fetch(origin + route, { method: 'POST', headers: { origin: originHeader, 'content-type': 'application/json' }, body: JSON.stringify(data) });
  try {
    assert.equal((await post('/api/executions/quote', { battleId: 'battle-1', intentId: 'intent-1', amount: 9 })).status, 400);
    assert.equal(calls.length, 0);
    assert.equal((await post('/api/executions/quote', { battleId: 'battle-1', intentId: 'intent-1' }, 'https://example.com')).status, 403);
    const response = await post('/api/executions/quote', { battleId: 'battle-1', intentId: 'intent-1' });
    assert.equal(response.status, 200); const quoted = await response.json();
    assert.ok(!JSON.stringify(quoted).includes('secret-test'));
    assert.equal(quoted.intent.tokenId, 'up');
    assert.equal((await post('/api/executions/submit', { executionId: quoted.id, confirmed: true })).status, 409);
    assert.ok(!calls.some(args => args.includes('place-order')));
    assert.ok(calls.find(args => args.includes('quote')).join(' ').includes('--tokenId up --marketTopicId topic-1 --side BUY --amount 2'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});
