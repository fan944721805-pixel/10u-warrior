const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPaperTrading } = require('../paper-trading');
const { createWarriorServer } = require('../server');

function fixture(file) {
  let time = 1800000000123, stale = false, offline = false, close = 110;
  const fetchImpl = async address => {
    if (offline) throw new Error('offline');
    const url = new URL(address);
    const start = Number(url.searchParams.get('startTime'));
    return { ok: true, json: async () => url.pathname.endsWith('aggTrades')
      ? [{ p: '100', T: time - (stale ? 16000 : 0) }]
      : [[start, '100', '110', '90', String(close), '5', start + 999]] };
  };
  return { paper: createPaperTrading({ file, fetchImpl, now: () => time }), fetchImpl, now: () => time,
    advance: () => { time += 310000; }, stale: () => { stale = true; }, offline: value => { offline = value; }, close: value => { close = value; } };
}
const bet = (id = 'paper-test-0001') => ({ symbol: 'BTCUSDT', direction: 'UP', amount: '10', clientOrderId: id });

test('DOWN wins on a lower expiry price', async () => {
  const f = fixture();
  await f.paper.place({ ...bet(), direction: 'DOWN', symbol: 'ETHUSDT' });
  f.advance(); f.close(90);
  assert.equal((await f.paper.account()).balance, 110);
});

test('a candle for the wrong expiry cannot settle an order', async () => {
  let time = 1800000000123;
  const paper = createPaperTrading({ now: () => time, fetchImpl: async url => ({ ok: true, json: async () =>
    url.includes('aggTrades') ? [{ p: '100', T: time }] : [[0, 100, 100, 100, 200, 10, 999]] }) });
  await paper.place(bet()); time += 310000;
  const result = await paper.account();
  assert.equal(result.settlementPending, true);
  assert.equal(result.balance, 90);
  assert.equal(result.orders[0].status, 'OPEN');
});

test('paper funds reserve immediately, settle once, persist and replay idempotently', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-test-'));
  try {
    const file = path.join(dir, 'ledger.json');
    const f = fixture(file);
    const results = await Promise.all([f.paper.place(bet()), f.paper.place(bet())]);
    assert.equal(results[0].order.id, results[1].order.id);
    assert.equal((await f.paper.account()).balance, 90);
    f.advance();
    const resumed = createPaperTrading({ file, fetchImpl: f.fetchImpl, now: f.now });
    assert.equal((await resumed.account()).balance, 110);
    assert.equal((await resumed.account()).balance, 110);
    assert.equal((await resumed.account()).reserved, 0);
    assert.equal((await resumed.account()).orders[0].status, 'WON');
    assert.equal((await resumed.place(bet())).duplicate, true);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('paper rejects stale data, invalid input and changed idempotency parameters', async () => {
  const f = fixture(); f.stale();
  await assert.rejects(f.paper.place(bet()), { code: 'MARKET_STALE' });
  assert.equal((await f.paper.account()).balance, 100);
  for (const patch of [{ symbol: 'SOLUSDT' }, { direction: 'BUY' }, { amount: '0' }, { amount: '10.001' }, { amount: '11' }, { amount: null }]) {
    await assert.rejects(f.paper.place({ ...bet(), ...patch }));
  }
  const g = fixture(); await g.paper.place(bet());
  await assert.rejects(g.paper.place({ ...bet(), direction: 'DOWN' }), { code: 'PAPER_ID_CONFLICT' });
});
test('concurrent bets cannot overdraw the shared paper account', async () => {
  const f = fixture();
  const results = await Promise.allSettled(Array.from({ length: 11 }, (_, n) => f.paper.place(bet(`paper-order-${n}`))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 10);
  assert.equal((await f.paper.account()).balance, 0);
});
test('missing settlement data keeps stake reserved, then loss and tie settle correctly', async () => {
  for (const [close, balance, status] of [[90, 90, 'LOST'], [100, 100, 'TIE']]) {
    const f = fixture(); await f.paper.place(bet()); f.advance(); f.offline(true);
    const pending = await f.paper.account();
    assert.equal(pending.settlementPending, true); assert.equal(pending.reserved, 10);
    f.offline(false); f.close(close);
    const settled = await f.paper.account();
    assert.equal(settled.balance, balance); assert.equal(settled.orders[0].status, status);
  }
});
test('default HTTP mode blocks live orders before CLI and paper endpoints never invoke wallet', async () => {
  let cliCalls = 0;
  const f = fixture();
  const server = createWarriorServer({ paperFile: null, liveTradingEnabled: false, marketFetch: f.fetchImpl, now: f.now,
    walletCli: async () => { cliCalls++; throw new Error('No wallet expected'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/api/prediction/quotes', '/api/prediction/orders']) {
      const response = await fetch(origin + route, { method: 'POST', body: '{}' });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, 'LIVE_TRADING_DISABLED');
    }
    assert.equal((await (await fetch(origin + '/api/config')).json()).tradingMode, 'paper');
    assert.equal((await fetch(origin + '/api/market/prices')).status, 200);
    const quote = await (await fetch(origin + '/api/market/prices?symbol=ETHUSDT')).json();
    assert.deepEqual(quote.prices.map(p => p.symbol), ['ETHUSDT']);
    assert.equal(quote.prices[0].price, 100);
    assert.equal(quote.prices[0].tradeTime, f.now());
    assert.equal((await fetch(origin + '/api/market/prices?symbol=SOLUSDT')).status, 400);
    const options = { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(bet()) };
    assert.equal((await fetch(origin + '/api/paper/orders', options)).status, 410);
    assert.equal((await fetch(origin + '/api/paper/orders', { ...options, headers: { origin: 'https://example.com' } })).status, 403);
    assert.equal((await (await fetch(origin + '/api/paper/account')).json()).balance, 100);
    assert.equal(cliCalls, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
