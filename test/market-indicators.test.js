const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateIndicatorSnapshot, createBinanceIndicatorSource, priceActionWindow, ema, rsi } = require('../market-indicators');

function rows(now) {
  return Array.from({ length: 30 }, (_, index) => {
    const openTime = Math.floor(now / 60000) * 60000 - (29 - index) * 60000;
    const open = 100 + index;
    const close = open + 1;
    return [openTime, String(open), String(close + 1), String(open - 1), String(close), String(100 + index), openTime + 59999];
  });
}

function intervalRows(now, intervalMinutes, count = 30) {
  const duration = intervalMinutes * 60000;
  const current = Math.floor(now / duration) * duration;
  return Array.from({ length: count }, (_, index) => {
    const openTime = current - (count - 1 - index) * duration;
    const open = 200 + index;
    const close = open + 1;
    return [openTime, String(open), String(close + 1), String(open - 1), String(close), '10', openTime + duration - 1];
  });
}

const depth = { bids: [['130', '4'], ['129', '3']], asks: [['131', '1'], ['132', '1']] };

test('calculates fresh price, RSI, EMA, volume and spot order-book indicators', () => {
  const now = 1800000000000;
  const snapshot = calculateIndicatorSnapshot({ symbol: 'BTCUSDT', klines: rows(now), depth, receivedAt: now });
  assert.equal(snapshot.symbol, 'BTCUSDT');
  assert.equal(snapshot.dataTimestamp, now);
  assert.equal(snapshot.priceChangePct.oneMinute, (129 / 128 - 1) * 100);
  assert.equal(snapshot.priceChangePct.fiveMinutes, (129 / 124 - 1) * 100);
  assert.equal(snapshot.rsi14, 100);
  assert.ok(snapshot.ema.ema5 > snapshot.ema.ema20);
  assert.ok(snapshot.volumeRatio > 1);
  assert.ok(snapshot.spotOrderBookImbalance > 0);
  assert.equal(snapshot.candles.bars.length, 20);
  assert.equal(snapshot.candles.intervalMinutes, 1);
  assert.ok(snapshot.candles.bars.every(bar => !Object.hasOwn(bar, 'volume') && bar.closeTime < now));
  assert.ok(ema([1, 2, 3, 4, 5], 5) > 0);
  assert.equal(rsi(Array(15).fill(100)), 50);
});

test('open candles cannot alter completed-window indicators, missing minutes are rejected', () => {
  const now = 1800000000000;
  const klines = rows(now);
  const before = calculateIndicatorSnapshot({ symbol: 'BTCUSDT', klines, depth, receivedAt: now });
  klines.at(-1)[4] = '9000';
  klines.at(-1)[2] = '9001'; // Keep the unfinished candle's OHLC internally valid.
  const after = calculateIndicatorSnapshot({ symbol: 'BTCUSDT', klines, depth, receivedAt: now });
  assert.deepEqual(after.priceChangePct, before.priceChangePct);
  assert.deepEqual(after.ema, before.ema);
  assert.equal(after.rsi14, before.rsi14);
  assert.deepEqual(after.candles, before.candles);
  klines.splice(25, 1);
  assert.throws(() => calculateIndicatorSnapshot({ symbol: 'BTCUSDT', klines, depth, receivedAt: now }), { code: 'INDICATOR_DATA_INVALID' });
});

test('indicator source uses only public market reads and caches a coherent snapshot', async () => {
  const now = 1800000000000;
  const calls = [];
  const source = createBinanceIndicatorSource({ now: () => now, fetchImpl: async url => {
    calls.push(url);
    return { ok: true, json: async () => url.includes('/klines?') ? rows(now) : depth };
  } });
  const first = await source.snapshot('BTCUSDT');
  const second = await source.snapshot('BTCUSDT');
  assert.equal(first.price, second.price);
  assert.deepEqual(first.raw.klines, rows(now));
  assert.deepEqual(first.raw.depth, depth);
  first.raw.klines[0][4] = 'changed';
  assert.notEqual((await source.snapshot('BTCUSDT')).raw.klines[0][4], 'changed');
  assert.equal(calls.length, 2);
  assert.match(calls[0] + calls[1], /klines/);
  assert.match(calls[0] + calls[1], /depth/);
  await assert.rejects(() => source.snapshot('DOGEUSDT'), error => error.code === 'INDICATOR_SYMBOL_UNSUPPORTED');
});

test('raw-candle view adapts to the game period and still excludes the open candle', async () => {
  const now = 1800000000000;
  const fifteenMinuteRows = intervalRows(now, 15);
  const source = createBinanceIndicatorSource({ now: () => now, fetchImpl: async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/depth')) return { ok:true, json:async()=>depth };
    const interval = parsed.searchParams.get('interval');
    return { ok:true, json:async()=>interval==='15m' ? fifteenMinuteRows : rows(now) };
  } });
  const snapshot = await source.snapshot('BTCUSDT', '1h');
  assert.equal(snapshot.candles.intervalMinutes, 15);
  assert.equal(snapshot.candles.targetMinutes, 60);
  assert.equal(snapshot.candles.bars.length, 20);
  assert.equal(snapshot.candles.bars.at(-1).openTime, fifteenMinuteRows.at(-2)[0]);
  assert.ok(snapshot.raw.priceActionKlines);
  const direct = priceActionWindow(fifteenMinuteRows, now, '1h', 15);
  assert.deepEqual(direct, snapshot.candles);
});
