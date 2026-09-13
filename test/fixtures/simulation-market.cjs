const { createSimulationMarketSource } = require('../../simulation-market-source');
const { normalizePolicy } = require('../../ai-decision');
const { ROUND } = require('../../prediction-sim');

function fixture() {
  const slot = 1800000000000;
  let time = slot - 20000, connected = false, unavailable = false, close = 101, quoteDelay = 0;
  const calls = [], fetches = [];
  const now = () => time;
  const walletStatus = async () => { calls.push(['wallet', 'status']); return connected ? 'CONNECTED' : 'UNCONNECTED'; };
  const topic = start => ({ marketTopicId: String(start), symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', vendor: 'PREDICT_FUN', feeRateBps: 200,
    startDate: start, endDate: start + ROUND, markets: [{ marketId: String(start), status: time >= start + ROUND ? 'RESOLVED' : 'REGISTERED',
      tradingStatus: 'OPEN', outcomes: [{ name: 'Up', tokenId: `${start}-up`, winner: time >= start + ROUND }, { name: 'Down', tokenId: `${start}-down`, winner: false }] }] });
  const official = {
    async marketFor(start) { calls.push(['official', 'marketFor']); if (unavailable || !connected) throw Object.assign(new Error('MARKET_UNAVAILABLE'), { code: 'MARKET_UNAVAILABLE' }); return topic(start); },
    async detail(id) { calls.push(['official', 'detail']); if (unavailable || !connected) throw Error('unavailable'); return topic(Number(id)); },
    async book(market, direction) { calls.push(['official', 'book']); if (unavailable || !connected) throw Error('unavailable'); return {
      tokenId: `${market.startDate}-${direction.toLowerCase()}`, timestamp: time, asks: [{ price: .4, size: 1000 }], bids: [{ price: .39, size: 1000 }],
    }; },
  };
  const fetchImpl = async (address, options) => {
    fetches.push({ address, options });
    if (unavailable) throw Error('network unavailable');
    const url = new URL(address), start = Number(url.searchParams.get('startTime'));
    return { ok: true, json: async () => [[start, '100', '102', '99', String(close), '100', start + 59999]] };
  };
  const run = async args => {
    calls.push(args);
    const val = key => args[args.indexOf(key) + 1];
    if (args.join(' ') === 'wallet status') return { data: { status: connected ? 'CONNECTED' : 'UNCONNECTED' } };
    if (args.join(' ') === 'wallet settings') return { data: { predictionEnabled: true, predictionQuotaLeft: 1000 } };
    if (args[1] === 'tx-lock') return { data: { status: 'UNLOCKED' } };
    if (args[2] !== 'quote' || !connected) throw Error('unexpected wallet call');
    time += quoteDelay;
    const amount = Number(val('--amount'));
    return { data: { quoteId: `official-private-${calls.length}`, tokenId: val('--tokenId'), side: 'BUY', orderType: 'MARKET',
      chainId: '56', slippageBps: 1000, amountIn: String(amount), amountOut: String(amount * 2.4),
      feeAmount: '0.1', minReceive: String(amount * 2.16), expireAt: new Date(time + 60000).toISOString() } };
  };
  const source = createSimulationMarketSource({ official, walletStatus, run, fetchImpl, now });
  const policy = normalizePolicy({ id: 'flow', strategy: 'orderFlow', indicators: ['takerFlow','orderbook','spread','priceChange','longReturns','odds'], maxStakePct: 15 }, 'flow');
  const indicatorSource = { snapshot: async () => ({ symbol: 'BTCUSDT', dataTimestamp: time, source: 'TEST_FIXTURE',
    price: 100, indicatorCandleCloseTime: Math.floor(time / 60000) * 60000 - 1,
    priceChangePct: { oneMinute: .1, fiveMinutes: .3 }, takerFlow: { buyRatio: .7, netBase: 40, totalBase: 100 },
    spotOrderBookImbalance: .3, spread: { basisPoints: 1 }, longReturns: { fifteenMinutes: .3, sixtyMinutes: 1 },
  }) };
  const decisionProvider = { describe: () => ({ mode: 'mock', simulated: true }), decide: async input => ({
    round_id: input.market.round_id, action: 'BET', direction: 'UP', stake_usdt: 1, stake_pct: 100 / input.account.balance,
    confidence: 90, risk_mode: 'NORMAL', factors: [], reason: 'TEST_FIXTURE', data_fresh: true, warnings: [],
  }) };
  return { slot, now, calls, fetches, source, run, fetchImpl, official, policy, indicatorSource, decisionProvider,
    setTime: value => { time = value; }, connect: value => { connected = value; }, unavailable: value => { unavailable = value; },
    closePrice: value => { close = value; }, quoteDelay: value => { quoteDelay = value; } };
}
module.exports = { fixture };
