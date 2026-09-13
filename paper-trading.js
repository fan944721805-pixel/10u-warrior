const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SOURCE = 'Binance Spot · data-api.binance.vision';
function fail(code, statusCode = 409) {
  return Object.assign(new Error(code), { code, statusCode });
}

function createPaperTrading({ file, fetchImpl = fetch, now = Date.now } = {}) {
  let state = { version: 1, balanceCents: 10000, orders: [] };
  if (file && fs.existsSync(file)) {
    state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (state.version !== 1 || !Number.isSafeInteger(state.balanceCents) || state.balanceCents < 0 || !Array.isArray(state.orders)) {
      throw new Error('Invalid paper ledger. Refusing to reset balances.');
    }
  }
  let queue = Promise.resolve();
  const cache = new Map();
  const inflight = new Map();
  function serial(task) {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  }
  function save(next) {
    if (file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temp = `${file}.tmp`;
      fs.writeFileSync(temp, JSON.stringify(next), { mode: 0o600 });
      fs.renameSync(temp, file);
    }
    state = next;
  }
  function symbolCheck(symbol) {
    if (!['BTCUSDT', 'ETHUSDT', 'BNBUSDT'].includes(symbol)) throw fail('PAPER_INVALID_SYMBOL', 400);
  }
  async function get(endpoint, params) {
    try {
      const response = await fetchImpl(`https://data-api.binance.vision/api/v3/${endpoint}?${new URLSearchParams(params)}`, {
        signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch { throw fail('MARKET_UNAVAILABLE', 503); }
  }
  function fresh(quote) {
    return quote && now() - quote.tradeTime <= 15000 && quote.tradeTime <= now() + 2000;
  }
  async function price(symbol) {
    symbolCheck(symbol);
    const cached = cache.get(symbol);
    if (cached && now() - cached.receivedAt < 2000 && fresh(cached)) return cached;
    if (inflight.has(symbol)) return inflight.get(symbol);
    const pending = (async () => {
      const rows = await get('aggTrades', { symbol, limit: '1' });
      const row = rows?.[0];
      const quote = { symbol, price: Number(row?.p), tradeTime: Number(row?.T), receivedAt: now(), source: SOURCE };
      if (!Number.isFinite(quote.price) || quote.price <= 0 || !fresh(quote)) throw fail('MARKET_STALE', 503);
      cache.set(symbol, quote);
      return quote;
    })();
    inflight.set(symbol, pending);
    try { return await pending; } finally { inflight.delete(symbol); }
  }
  async function closingPrice(order) {
    const start = order.expiresAt - 1000;
    const rows = await get('klines', { symbol: order.symbol, interval: '1s', startTime: String(start), endTime: String(order.expiresAt - 1), limit: '1' });
    const row = rows?.[0];
    const close = Number(row?.[4]);
    if (Number(row?.[0]) !== start || Number(row?.[6]) !== order.expiresAt - 1 || !Number.isFinite(close) || close <= 0) {
      throw fail('SETTLEMENT_UNAVAILABLE', 503);
    }
    return close;
  }
  async function settle() {
    const next = structuredClone(state);
    let changed = false;
    let waiting = false;
    const closes = new Map();
    for (const order of next.orders) {
      if (order.status !== 'OPEN' || now() < order.expiresAt + 2000) continue;
      try {
        const key = `${order.symbol}:${order.expiresAt}`;
        if (!closes.has(key)) closes.set(key, await closingPrice(order));
        const close = closes.get(key);
        const won = order.direction === 'UP' ? close > order.entryPrice : close < order.entryPrice;
        order.status = close === order.entryPrice ? 'TIE' : won ? 'WON' : 'LOST';
        order.exitPrice = close;
        order.payoutCents = order.status === 'TIE' ? order.amountCents : won ? order.amountCents * 2 : 0;
        order.settledAt = now();
        next.balanceCents += order.payoutCents;
        changed = true;
      } catch { waiting = true; }
    }
    if (changed) save(next);
    return waiting;
  }
  function snapshot(waiting) {
    return { mode: 'paper', source: SOURCE, balance: state.balanceCents / 100,
      reserved: state.orders.filter(o => o.status === 'OPEN').reduce((sum, o) => sum + o.amountCents, 0) / 100,
      settlementPending: waiting, orders: state.orders.slice().reverse(), serverTime: now() };
  }
  return {
    price,
    account: () => serial(async () => snapshot(await settle())),
    place: body => serial(async () => {
      const { symbol, direction, clientOrderId } = body;
      symbolCheck(symbol);
      if (!['UP', 'DOWN'].includes(direction)) throw fail('PAPER_INVALID_DIRECTION', 400);
      if (typeof clientOrderId !== 'string' || !/^[\w-]{8,80}$/.test(clientOrderId)) throw fail('PAPER_INVALID_ID', 400);
      if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(body.amount))) throw fail('PAPER_INVALID_AMOUNT', 400);
      const cents = Math.round(Number(body.amount) * 100);
      if (cents < 100 || cents > 1000) throw fail('PAPER_INVALID_AMOUNT', 400);
      const existing = state.orders.find(o => o.clientOrderId === clientOrderId);
      if (existing) {
        if (existing.symbol !== symbol || existing.direction !== direction || existing.amountCents !== cents) throw fail('PAPER_ID_CONFLICT');
        return { mode: 'paper', order: existing, duplicate: true };
      }
      if (state.orders.length >= 10000) throw fail('PAPER_LEDGER_FULL');
      await settle();
      if (state.balanceCents < cents) throw fail('PAPER_INSUFFICIENT_BALANCE');
      const quote = await price(symbol);
      if (!fresh(quote)) throw fail('MARKET_STALE', 503);
      const order = { id: crypto.randomUUID(), clientOrderId, symbol, direction, amountCents: cents,
        entryPrice: quote.price, entryTradeTime: quote.tradeTime, openedAt: now(),
        expiresAt: Math.ceil(now() / 1000) * 1000 + 300000, status: 'OPEN', source: SOURCE };
      save({ ...state, balanceCents: state.balanceCents - cents, orders: [...state.orders, order] });
      return { mode: 'paper', order, duplicate: false };
    }),
  };
}
module.exports = { createPaperTrading };
