const SOURCE = 'Binance Spot · data-api.binance.vision';
const { extendedIndicators } = require('./technical-indicators');
const { indicators: indicatorCatalog } = require('./public/strategy-catalog');
const ALLOWED_SYMBOLS = new Set(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']);
const PRICE_ACTION_INTERVALS = Object.freeze({ '5m': ['1m',1], '15m': ['3m',3], '1h': ['15m',15], '1d': ['4h',240] });

function indicatorError(code, statusCode = 503) {
  return Object.assign(new Error(code), { code, statusCode });
}

function finite(value, code = 'INDICATOR_DATA_INVALID') {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw indicatorError(code);
  const number = Number(value);
  if (!Number.isFinite(number)) throw indicatorError(code);
  return number;
}

function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) throw indicatorError('INDICATOR_DATA_INCOMPLETE');
  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const multiplier = 2 / (period + 1);
  return values.slice(period).reduce((result, value) => value * multiplier + result * (1 - multiplier), seed);
}

function rsi(values, period = 14) {
  if (!Array.isArray(values) || values.length < period + 1) throw indicatorError('INDICATOR_DATA_INCOMPLETE');
  const changes = values.slice(1).map((value, index) => value - values[index]);
  let gain = changes.slice(0, period).reduce((sum, value) => sum + Math.max(0, value), 0) / period;
  let loss = changes.slice(0, period).reduce((sum, value) => sum + Math.max(0, -value), 0) / period;
  for (const change of changes.slice(period)) {
    gain = (gain * (period - 1) + Math.max(0, change)) / period;
    loss = (loss * (period - 1) + Math.max(0, -change)) / period;
  }
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

function parseKline(row) {
  if (!Array.isArray(row) || row.length < 7) throw indicatorError('INDICATOR_DATA_INVALID');
  const parsed = {
    openTime: finite(row[0]),
    open: finite(row[1]),
    high: finite(row[2]),
    low: finite(row[3]),
    close: finite(row[4]),
    volume: finite(row[5]),
    closeTime: finite(row[6]),
    quoteVolume: row.length > 7 ? finite(row[7]) : null,
    takerBuyVolume: row.length > 9 ? finite(row[9]) : null,
  };
  if (parsed.open <= 0 || parsed.close <= 0 || parsed.volume < 0 || parsed.openTime % 60000 !== 0 || parsed.closeTime - parsed.openTime !== 59999) {
    throw indicatorError('INDICATOR_DATA_INVALID');
  }
  if (parsed.low <= 0 || parsed.high < Math.max(parsed.open, parsed.close) || parsed.low > Math.min(parsed.open, parsed.close) ||
      (parsed.quoteVolume !== null && parsed.quoteVolume < 0) ||
      (parsed.takerBuyVolume !== null && (parsed.takerBuyVolume < 0 || parsed.takerBuyVolume > parsed.volume))) throw indicatorError('INDICATOR_DATA_INVALID');
  return parsed;
}

function priceActionWindow(klines, receivedAt, timeframe = '5m', intervalMinutes = 1) {
  const timestamp = finite(receivedAt);
  const expectedMs = intervalMinutes * 60000;
  const rows = Array.isArray(klines) ? klines.map(row => {
    if (!Array.isArray(row) || row.length < 7) throw indicatorError('INDICATOR_DATA_INVALID');
    const candle = { openTime:finite(row[0]),open:finite(row[1]),high:finite(row[2]),low:finite(row[3]),close:finite(row[4]),closeTime:finite(row[6]) };
    if (candle.open<=0||candle.close<=0||candle.low<=0||candle.high<Math.max(candle.open,candle.close)||candle.low>Math.min(candle.open,candle.close)||
        candle.openTime%expectedMs!==0||candle.closeTime-candle.openTime!==expectedMs-1) throw indicatorError('INDICATOR_DATA_INVALID');
    return candle;
  }) : [];
  const completed=rows.filter(row=>row.closeTime<timestamp);
  if(completed.length<20)throw indicatorError('INDICATOR_DATA_INCOMPLETE');
  return { intervalMinutes, targetMinutes:({ '5m':5,'15m':15,'1h':60,'1d':1440 })[timeframe]||5, bars:completed.slice(-20) };
}

function depthTotal(rows) {
  if (!Array.isArray(rows) || !rows.length) throw indicatorError('INDICATOR_DATA_INCOMPLETE');
  return rows.reduce((sum, row) => {
    if (!Array.isArray(row) || row.length < 2) throw indicatorError('INDICATOR_DATA_INVALID');
    const price = finite(row[0]);
    const quantity = finite(row[1]);
    if (price <= 0 || quantity <= 0) throw indicatorError('INDICATOR_DATA_INVALID');
    return sum + price * quantity;
  }, 0);
}

function calculateIndicatorSnapshot({ symbol, klines, depth, receivedAt }) {
  const normalizedSymbol = String(symbol || '').toUpperCase();
  if (!ALLOWED_SYMBOLS.has(normalizedSymbol)) throw indicatorError('INDICATOR_SYMBOL_UNSUPPORTED', 400);
  const rows = Array.isArray(klines) ? klines.map(parseKline) : [];
  if (rows.length < 21) throw indicatorError('INDICATOR_DATA_INCOMPLETE');
  if (rows.some((row, index) => index && row.openTime - rows[index - 1].openTime !== 60000)) throw indicatorError('INDICATOR_DATA_INVALID');
  const timestamp = finite(receivedAt);
  const latest = rows.at(-1);
  if (latest.openTime > timestamp + 2000 || timestamp - latest.openTime > 90000) throw indicatorError('INDICATOR_DATA_STALE');
  const completed = rows.filter(row => row.closeTime < timestamp);
  if (completed.length < 21) throw indicatorError('INDICATOR_DATA_INCOMPLETE');
  const volumeRow = completed.at(-1);
  if (volumeRow.closeTime < Math.floor(timestamp / 60000) * 60000 - 1) throw indicatorError('INDICATOR_DATA_STALE');
  const closes = completed.map(row => row.close);
  const volumeIndex = rows.indexOf(volumeRow);
  const priorVolumes = rows.slice(Math.max(0, volumeIndex - 20), volumeIndex).map(row => row.volume);
  if (!priorVolumes.length) throw indicatorError('INDICATOR_DATA_INCOMPLETE');
  const averageVolume = priorVolumes.reduce((sum, value) => sum + value, 0) / priorVolumes.length;
  const bidNotional = depthTotal(depth?.bids);
  const askNotional = depthTotal(depth?.asks);
  const depthNotional = bidNotional + askNotional;
  if (Number(depth.bids[0][0]) >= Number(depth.asks[0][0]) ||
      depth.bids.some((row,i) => i && Number(row[0]) >= Number(depth.bids[i-1][0])) ||
      depth.asks.some((row,i) => i && Number(row[0]) <= Number(depth.asks[i-1][0]))) throw indicatorError('INDICATOR_DATA_INVALID');
  if (averageVolume <= 0 || depthNotional <= 0) throw indicatorError('INDICATOR_DATA_INVALID');
  const fiveMinuteBase = completed.at(-6)?.close;
  if (!fiveMinuteBase) throw indicatorError('INDICATOR_DATA_INCOMPLETE');
  const result = {
    symbol: normalizedSymbol,
    source: SOURCE,
    dataTimestamp: timestamp,
    candleOpenTime: latest.openTime,
    indicatorCandleCloseTime: volumeRow.closeTime,
    priceChangeBasis: 'completed-1m-close-to-close',
    rsiMethod: 'Wilder',
    volumeCandleTime: volumeRow.openTime,
    price: latest.close,
    candles: priceActionWindow(klines, timestamp, '5m', 1),
    priceChangePct: {
      oneMinute: (volumeRow.close / completed.at(-2).close - 1) * 100,
      fiveMinutes: (volumeRow.close / fiveMinuteBase - 1) * 100,
    },
    rsi14: rsi(closes, 14),
    ema: { ema5: ema(closes, 5), ema20: ema(closes, 20) },
    volumeRatio: volumeRow.volume / averageVolume,
    spotOrderBookImbalance: (bidNotional - askNotional) / depthNotional,
    ...extendedIndicators(completed, depth),
    calculationVersion: 2,
    completedCandles: completed.length,
    indicatorBasis: 'completed-1m; SMA-seeded EMA; Wilder RSI/ATR/DMI/ADX; population stdev; rolling VWAP; prior-range Donchian',
  };
  result.availability = Object.fromEntries(Object.values(indicatorCatalog).filter(item=>item.key!=='odds').map(item=>[item.key,
    result[item.snapshotKey] == null ? 'UNAVAILABLE_HISTORY_OR_DENOMINATOR' : 'READY']));
  return result;
}

function createBinanceIndicatorSource({ fetchImpl = fetch, now = Date.now, baseUrl = 'https://data-api.binance.vision/api/v3' } = {}) {
  const cache = new Map();
  const pending = new Map();
  async function get(endpoint, params) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/${endpoint}?${new URLSearchParams(params)}`, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: 'application/json' },
      });
    } catch { throw indicatorError('INDICATOR_SOURCE_UNAVAILABLE'); }
    if (!response?.ok) throw indicatorError('INDICATOR_SOURCE_UNAVAILABLE');
    try { return await response.json(); } catch { throw indicatorError('INDICATOR_DATA_INVALID'); }
  }
  async function snapshot(symbol = 'BTCUSDT', timeframe = '5m') {
    const normalizedSymbol = String(symbol || '').toUpperCase();
    if (!ALLOWED_SYMBOLS.has(normalizedSymbol)) throw indicatorError('INDICATOR_SYMBOL_UNSUPPORTED', 400);
    const normalizedTimeframe=Object.hasOwn(PRICE_ACTION_INTERVALS,String(timeframe).toLowerCase())?String(timeframe).toLowerCase():'5m';
    const [priceActionInterval,intervalMinutes]=PRICE_ACTION_INTERVALS[normalizedTimeframe];
    const cacheKey=`${normalizedSymbol}:${normalizedTimeframe}`;
    const cached = cache.get(cacheKey);
    if (cached && now() - cached.dataTimestamp < 1500) return structuredClone(cached);
    if (pending.has(cacheKey)) return structuredClone(await pending.get(cacheKey));
    const request = (async () => {
      const requestStartedAt = now();
      const [klines, depth, timeframeKlines] = await Promise.all([
        get('klines', { symbol: normalizedSymbol, interval: '1m', limit: '200' }),
        get('depth', { symbol: normalizedSymbol, limit: '20' }),
        priceActionInterval==='1m' ? Promise.resolve(null) : get('klines',{symbol:normalizedSymbol,interval:priceActionInterval,limit:'30'}),
      ]);
      const result = calculateIndicatorSnapshot({ symbol: normalizedSymbol, klines, depth, receivedAt: now() });
      if(timeframeKlines)result.candles=priceActionWindow(timeframeKlines,now(),normalizedTimeframe,intervalMinutes);
      result.availability.candles='READY';
      // REST depth has no exchange timestamp. Request start is a conservative age bound,
      // not proof of source freshness; do not reset the age after a slow HTTP response.
      result.dataTimestamp = requestStartedAt;
      result.receivedAt = now();
      result.freshnessBasis = 'request-start-and-latest-completed-candle';
      result.raw = { klines: structuredClone(klines), depth: structuredClone(depth), ...(timeframeKlines?{priceActionKlines:structuredClone(timeframeKlines)}:{}) };
      cache.set(cacheKey, result);
      return result;
    })();
    pending.set(cacheKey, request);
    try { return structuredClone(await request); } finally { pending.delete(cacheKey); }
  }
  return { snapshot };
}

module.exports = { SOURCE, PRICE_ACTION_INTERVALS, calculateIndicatorSnapshot, createBinanceIndicatorSource, priceActionWindow, ema, rsi };
