// Uses an existing wallet session only. No sign-in, transfer, or order submission.
const { createBawRunner } = require('../server');
const { createPredictionSource, ROUND, quoteFromBook } = require('../prediction-sim');
const { createSimulationMarketSource } = require('../simulation-market-source');
(async () => {
  const runner = createBawRunner();
  const commands = [];
  const run = async args => {
    const prefix = args.slice(0, 3).join(' ');
    if (!(args.join(' ') === 'wallet status' || ['prediction market search', 'prediction market detail', 'prediction market order-book'].includes(prefix))) throw Error('READ_ONLY_PROBE_BLOCKED_COMMAND');
    commands.push(prefix);
    try { return await runner(args); } catch (error) { error.operation = prefix; throw error; }
  };
  const source = createSimulationMarketSource({ official: createPredictionSource(run), run,
    walletStatus: async () => (await run(['wallet', 'status'])).data.status });
  const slot = Math.floor(Date.now() / ROUND) * ROUND;
  const topic = await source.marketFor(slot, 'BTCUSDT', ROUND);
  if (topic.marketSource !== 'binance-prediction') throw Error('CONNECTED_WALLET_REQUIRED_FOR_OFFICIAL_READ_PROBE');
  const book = await source.book(topic, 'UP');
  const token = topic.markets[0].outcomes.find(o => o.name === 'Up');
  const preview = quoteFromBook(book, token.tokenId, Date.now(), 1);
  console.log(JSON.stringify({ stage: 'market-and-book', result: 'PASS', marketTopicId: topic.marketTopicId,
    start: topic.startDate, end: topic.endDate, tokenId: token.tokenId, estimatedShares: preview.shares, ordersSubmitted: 0 }));
  const quote = await source.quote(topic, 'UP', 1, book);
  console.log(JSON.stringify({ result: 'PASS', observedAt: new Date().toISOString(), marketTopicId: topic.marketTopicId,
    marketSource: topic.marketSource, start: topic.startDate, end: topic.endDate,
    bookAgeMs: Date.now() - preview.bookTime, quote: { amount: quote.amount, shares: quote.shares, feeShares: quote.feeShares,
      minReceive: quote.minReceive, expiresAt: quote.expiresAt, source: quote.source }, commands, ordersSubmitted: 0 }));
})().catch(error => { console.error(JSON.stringify({ result: 'FAILED', operation: error.operation, code: error.code || error.message, message: error.message, ordersSubmitted: 0 })); process.exitCode = 1; });
