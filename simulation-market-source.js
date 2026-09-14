const { PERIODS, validateMarket, quoteFromBook } = require('./prediction-sim');

const fail = code => Object.assign(new Error(code), { code, statusCode: 409 });
const PRACTICE = 'public-spot';
const OFFICIAL = 'binance-prediction';
const practiceId = (slot, symbol, duration) => `practice-v1:${symbol}:${slot}:${duration}`;
const isPractice = id => String(id).startsWith('practice-v1:');

// No account credentials: fixed 2x gross payout, ties return the stake. Only the
// opening and closing spot candles decide the outcome; these are our own rules.
function createPublicPracticeSource({ fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  async function candle(symbol, openTime, completed) {
    const key = `${symbol}:${openTime}:${completed}`;
    if (cache.has(key)) return cache.get(key);
    if (pending.has(key)) return pending.get(key);
    const task = (async () => {
      const params = new URLSearchParams({ symbol, interval: '1m', startTime: String(openTime), limit: '1' });
      const response = await fetchImpl(`https://data-api.binance.vision/api/v3/klines?${params}`, {
        signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' },
      });
      if (!response.ok) throw fail('PRACTICE_PRICE_UNAVAILABLE');
      const rows = await response.json(), row = rows?.[0];
      if (!Array.isArray(rows) || rows.length !== 1 || !Array.isArray(row) ||
          Number(row[0]) !== openTime || Number(row[6]) !== openTime + 59999 ||
          !Number.isFinite(Number(row[1])) || Number(row[1]) <= 0 ||
          !Number.isFinite(Number(row[4])) || Number(row[4]) <= 0 ||
          openTime > now() || (completed && Number(row[6]) >= now())) throw fail('PRACTICE_PRICE_UNAVAILABLE');
      const result = { open: Number(row[1]), close: Number(row[4]), openTime, closeTime: Number(row[6]) };
      // An open candle's close is never cached as a final settlement price.
      cache.set(key, result);
      if (cache.size > 500) cache.delete(cache.keys().next().value);
      return result;
    })();
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  }
  function topic(slot, symbol, duration) {
    const id = practiceId(slot, symbol, duration);
    return validateMarket({ marketTopicId: id, marketSource: PRACTICE, simulated: true,
      title: `${symbol} · Practice`, symbol, marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT',
      startDate: slot, endDate: slot + duration, rules: 'spot-1m-open-to-final-close;2x;tie-refund;no-fee',
      markets: [{ marketId: id, status: 'REGISTERED', tradingStatus: 'OPEN', outcomes: [
        { name: 'Up', tokenId: `${id}:UP`, price: .5 }, { name: 'Down', tokenId: `${id}:DOWN`, price: .5 },
      ] }],
    }, slot, symbol, duration);
  }
  function parse(id) {
    const match = /^practice-v1:(BTCUSDT|ETHUSDT|BNBUSDT):(\d+):(\d+)$/.exec(String(id));
    if (!match || !Object.values(PERIODS).includes(Number(match[3]))) throw fail('INVALID_MARKET');
    return topic(Number(match[2]), match[1], Number(match[3]));
  }
  return {
    async marketFor(slot, symbol, duration) { return topic(slot, symbol, duration); },
    async previewBook(market, direction) {
      const checked=parse(market.marketTopicId);
      return {tokenId:`${checked.marketTopicId}:${direction}`,timestamp:now(),source:PRACTICE,simulated:true,
        asks:[{price:.5,size:1e12}],bids:[{price:.5,size:1e12}]};
    },
    async detail(id) {
      const market = parse(id);
      if (now() < market.startDate) return market;
      const first = await candle(market.symbol, market.startDate, false);
      market.variantData = { startPrice: first.open };
      if (now() >= market.endDate) {
        const last = await candle(market.symbol, market.endDate - 60000, true);
        market.variantData.endPrice = last.close;
        market.settlementEvidence = { source: 'binance-spot-1m', first, last };
        market.markets[0].status = 'RESOLVED'; market.markets[0].tradingStatus = 'CLOSED';
        for (const outcome of market.markets[0].outcomes) {
          outcome.winner = outcome.name === 'Up' ? last.close > first.open : last.close < first.open;
          outcome.price = last.close === first.open ? .5 : outcome.winner ? 1 : 0;
        }
      }
      return market;
    },
    async book(market, direction) {
      const checked = parse(market.marketTopicId);
      if (now() < checked.startDate || now() >= checked.endDate) throw fail('QUOTE_WINDOW_MISSED');
      // Require a real opening candle before accepting any practice entry.
      await candle(checked.symbol, checked.startDate, false);
      return { tokenId: `${checked.marketTopicId}:${direction}`, timestamp: now(), source: PRACTICE, simulated: true,
        asks: [{ price: .5, size: 1e12 }], bids: [{ price: .5, size: 1e12 }] };
    },
  };
}

function normalizeOfficialQuote(raw, { tokenId, amount, chainId, slippageBps, now }) {
  const amountIn = Number(raw?.amountIn), shares = Number(raw?.amountOut), fee = Number(raw?.feeAmount);
  const minReceive = Number(raw?.minReceive);
  const numericExpiry = Number(raw?.expireAt);
  const expiresAt = Number.isFinite(numericExpiry) ? (numericExpiry < 1e10 ? numericExpiry * 1000 : numericExpiry) : Date.parse(raw?.expireAt);
  if (!raw?.quoteId || String(raw.tokenId) !== String(tokenId) || raw.side !== 'BUY' || raw.orderType !== 'MARKET' ||
      String(raw.chainId) !== String(chainId) || Number(raw.slippageBps) !== slippageBps ||
      !Number.isFinite(amountIn) || Math.abs(amountIn - amount) > 1e-8 ||
      !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(fee) || fee < 0 ||
      !Number.isFinite(minReceive) || minReceive <= 0 || minReceive > shares ||
      !Number.isFinite(expiresAt) || expiresAt <= now) throw fail('UNSAFE_LIVE_QUOTE');
  // BUY amountOut is shares received; feeAmount is reported in shares. Do not
  // subtract the service fee a second time, or treat it as an extra USDT debit.
  return { amount: amountIn, shares, averagePrice: amountIn / shares, odds: shares / amountIn,
    bookTime: now, expiresAt, minReceive, feeShares: fee, feesIncluded: true, gasIncluded: false,
    source: 'official-quote', slippageBps, fills: [] };
}

// Predict's published taker schedule: fee USDT = rate * min(p, 1-p) * shares.
// BUY fees are converted to shares at each fill price. This is a book estimate,
// without account discounts, rebates or network costs, never an executable quote.
// https://docs.predict.fun/the-basics/predict-fees-and-limits
function estimatePredictionQuote(market, book, tokenId, amount, now) {
  const feeRateBps = Number(market.feeRateBps);
  if (market.vendor !== 'PREDICT_FUN' || market.feeRateBps == null || market.feeRateBps === '' ||
      !Number.isInteger(feeRateBps) || feeRateBps < 0 || feeRateBps > 10000) throw fail('UNSUPPORTED_MARKET_FEES');
  const gross = quoteFromBook(book, tokenId, now, amount);
  const feeShares = gross.fills.reduce((sum, fill) => sum + feeRateBps / 10000 *
    Math.min(fill.price, 1 - fill.price) * fill.shares / fill.price, 0);
  const shares = gross.shares - feeShares;
  if (!Number.isFinite(shares) || shares <= 0) throw fail('INVALID_BOOK');
  return { ...gross, shares, grossShares: gross.shares, feeShares, feeRateBps,
    averagePrice: amount / shares, odds: shares / amount, feesIncluded: true, gasIncluded: false,
    source: 'real-book-fee-estimate', estimated: true, feeModel: 'predict-taker-no-discount-v1',
    // Saved decision lifetime; an official execution quote is requested separately.
    expiresAt: now + 60000 };
}

function createSimulationMarketSource({ official, walletStatus, run, chainId = '56', fetchImpl, now = Date.now }) {
  const practice = createPublicPracticeSource({ fetchImpl, now });
  let status = 'unknown', lastStatusAt = -Infinity, statusPending;
  async function connection(force = false) {
    if (!force && now() - lastStatusAt < 2000) return status;
    if (!statusPending) statusPending = Promise.resolve().then(walletStatus).then(value => {
      if (!['CONNECTED', 'UNCONNECTED', 'CREATING'].includes(value)) throw fail('WALLET_STATUS_UNAVAILABLE');
      status = value === 'CONNECTED' ? 'connected' : 'unconnected'; lastStatusAt = now(); return status;
    }).catch(error => { status = 'unknown'; lastStatusAt = -Infinity; throw error; }).finally(() => { statusPending = null; });
    return statusPending;
  }
  const sourceFor = id => isPractice(id) ? practice : official;
  async function marketFor(slot, symbol, duration) {
    const connected = await connection();
    if (connected === 'unconnected') return practice.marketFor(slot, symbol, duration);
    // A failed official market read never changes the rules to practice.
    return { ...await official.marketFor(slot, symbol, duration), marketSource: OFFICIAL, simulated: false };
  }
  return {
    marketFor,
    describe: () => ({ connection: status, nextMarketSource: status === 'connected' ? OFFICIAL : status === 'unconnected' ? PRACTICE : 'unknown' }),
    async refreshMarket(market, slot, symbol, duration) {
      await connection(true);
      const expected = status === 'connected' ? OFFICIAL : PRACTICE;
      if (market?.marketSource !== expected) return marketFor(slot, symbol, duration);
      return market;
    },
    detail: id => sourceFor(id).detail(id),
    book: (market, direction) => sourceFor(market.marketTopicId).book(market, direction),
    previewBook: (market,direction) => isPractice(market.marketTopicId) ? practice.previewBook(market,direction) : official.book(market,direction),
    async quote(market, direction, amount, observedBook) {
      const tokenId = String(market.markets[0].outcomes.find(o => o.name === (direction === 'UP' ? 'Up' : 'Down')).tokenId);
      if (isPractice(market.marketTopicId)) {
        const quote = quoteFromBook(await practice.book(market, direction), tokenId, now(), amount);
        return { ...quote, source: 'practice-fixed', feesIncluded: true, feeShares: 0, gasIncluded: false };
      }
      if (await connection(true) !== 'connected') throw fail('WALLET_NOT_CONNECTED');
      const book = observedBook || await official.book(market, direction);
      return estimatePredictionQuote(market, book, tokenId, amount, now());
    },
    // Called only by the gated execution bridge using its persisted decision.
    // Paper play never requests a balance-dependent trading quote.
    async executionQuote(intent, slippageBps) {
      if (intent.marketSource !== OFFICIAL) throw fail('PRACTICE_INTENT_NOT_EXECUTABLE');
      if (!Number.isFinite(intent.expiresAt) || intent.expiresAt <= now()) throw fail('INTENT_EXPIRED');
      if (await connection(true) !== 'connected') throw fail('WALLET_NOT_CONNECTED');
      const raw = (await run(['prediction', 'trade', 'quote', '--binanceChainId', chainId,
        '--tokenId', String(intent.tokenId), '--marketTopicId', String(intent.marketTopicId), '--side', 'BUY',
        '--amount', String(intent.amount), '--orderType', 'MARKET', '--slippageBps', String(slippageBps)])).data;
      normalizeOfficialQuote(raw, { tokenId: intent.tokenId, amount: intent.amount, chainId, slippageBps, now: now() });
      return raw;
    },
  };
}

module.exports = { createPublicPracticeSource, createSimulationMarketSource, normalizeOfficialQuote, estimatePredictionQuote };
