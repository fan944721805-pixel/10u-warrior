const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PERIODS, nextRoundSlot, quoteFromBook, createPredictionSource, createPredictionSimulation } = require('../prediction-sim');
const ROUND = 300000;
function fixture(file) {
  let time = 1800000000000 + 10000;
  let resolved = false, badBook = false;
  const slot = Math.floor(time / ROUND) * ROUND + ROUND;
  const topic = start => ({ marketTopicId: start, symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: start, status: resolved ? 'RESOLVED' : 'REGISTERED', tradingStatus: 'OPEN', outcomes: [{ name: 'Up', tokenId: 'up', winner: resolved ? true : null }, { name: 'Down', tokenId: 'down', winner: resolved ? false : null }] }] });
  const source = { marketFor: async s => topic(s), detail: async id => topic(id), book: async (m, d) => ({ tokenId: d === 'UP' ? 'up' : 'down', timestamp: badBook ? 0 : time, asks: [{ price: d === 'UP' ? .4 : .6, size: 100 }] }) };
  const sim = createPredictionSimulation({ source, file, now: () => time, random: () => 0 });
  return { sim, source, now: () => time, slot, setTime: t => { time = t; }, resolve: () => { resolved = true; }, bad: () => { badBook = true; } };
}
test('real asks produce weighted fills, stale/insufficient depth never gets invented odds', () => {
  const q = quoteFromBook({ tokenId: 'up', timestamp: 10000, asks: [{ price: .5, size: 20 }, { price: .4, size: 5 }] }, 'up', 10000);
  assert.equal(q.shares, 11); assert.equal(q.odds, 2.2);
  assert.throws(() => quoteFromBook({ tokenId: 'up', timestamp: 0, asks: [] }, 'up', 20000));
  assert.throws(() => quoteFromBook({ tokenId: 'up', timestamp: 10000, asks: [{ price: .5, size: 1 }] }, 'up', 10000));
});
test('market discovery selects the exact five-minute candidate instead of trusting result order', async () => {
  const slot = 1800000300000;
  const topic = start => ({ marketTopicId: String(start), symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: String(start), outcomes: [{ name: 'Up', tokenId: 'up' }, { name: 'Down', tokenId: 'down' }] }] });
  const seen = [];
  const source = createPredictionSource(async args => {
    seen.push(args);
    if (args[2] === 'search') return { data: [topic(slot - ROUND), topic(slot)] };
    if (args[2] === 'detail') return { data: topic(Number(args.at(-1))) };
    throw new Error('unexpected command');
  });
  const selected = await source.marketFor(slot);
  assert.equal(selected.startDate, slot);
  assert.deepEqual(seen.filter(args => args[2] === 'detail').map(args => args.at(-1)), [String(slot)]);
});
test('market discovery supports BNB and all configured Binance Up/Down durations', async () => {
  const slot = Date.UTC(2026,8,12,16);
  for (const [period, duration] of Object.entries(PERIODS)) {
    const topic = { marketTopicId: `${period}-bnb`, symbol: 'BNBUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: slot, endDate: slot + duration,
      markets: [{ marketId: `${period}-market`, outcomes: [{ name: 'Up', tokenId: `${period}-up` }, { name: 'Down', tokenId: `${period}-down` }] }] };
    const seen = [];
    const source = createPredictionSource(async args => {
      seen.push(args);
      if (args[2] === 'search') return { data: [topic] };
      if (args[2] === 'detail') return { data: topic };
      throw new Error('unexpected command');
    });
    const selected = await source.marketFor(slot, 'BNBUSDT', duration);
    assert.equal(selected.endDate - selected.startDate, duration);
    assert.deepEqual(seen[0], ['prediction','market','search','--query','BNB','--limit','50']);
  }
});
test('daily rounds follow Binance daily noon ET boundaries in summer and winter', () => {
  assert.equal(nextRoundSlot(Date.UTC(2026,8,12,4),PERIODS['1d']),Date.UTC(2026,8,12,16));
  assert.equal(nextRoundSlot(Date.UTC(2027,0,12,4),PERIODS['1d']),Date.UTC(2027,0,12,17));
});
test('a configured one-hour battle schedules and records one-hour BNB orders', async () => {
  let time = 1800000010000;
  const duration = PERIODS['1h'];
  const slot = (Math.floor(time / duration) + 1) * duration;
  const topic = start => ({ marketTopicId: String(start), symbol: 'BNBUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + duration,
    markets: [{ marketId: String(start), status: 'REGISTERED', tradingStatus: 'OPEN', outcomes: [{ name: 'Up', tokenId: 'up' }, { name: 'Down', tokenId: 'down' }] }] });
  const source = { marketFor: async (start,symbol,roundMs) => { assert.equal(symbol,'BNBUSDT');assert.equal(roundMs,duration);return topic(start); }, detail: async id => topic(Number(id)), book: async (market,direction) => ({ tokenId:direction==='UP'?'up':'down',timestamp:time,asks:[{price:.5,size:100}] }) };
  const simulation = createPredictionSimulation({ source, asset:'BNBUSDT', period:'1h', now:()=>time, random:()=>0 });
  await simulation.tick(); time=slot; await simulation.tick();
  const snapshot=simulation.snapshot();
  assert.equal(snapshot.config.asset,'BNBUSDT');assert.equal(snapshot.config.period,'1h');assert.equal(snapshot.config.roundMs,duration);
  assert.ok(snapshot.agents.every(agent=>agent.latest.end===slot+duration));
});
test('waits for aligned node, uses three independent 100U accounts, freezes 5U only once', async () => {
  const f = fixture(); await f.sim.tick();
  assert.equal(f.sim.snapshot().agents[0].cash, 100);
  f.setTime(f.slot); await f.sim.tick(); await f.sim.tick();
  const agents = f.sim.snapshot().agents;
  assert.deepEqual(agents.map(a => a.latest.direction), ['UP', 'DOWN', 'UP']);
  for (const a of agents) { assert.equal(a.cash, 95); assert.equal(a.reserved, 5); assert.equal(a.equity, 100); assert.equal(a.orders.length, 1); assert.equal(a.latest.end, f.slot + ROUND); }
});
test('cannot settle early or use missing official winners; settles official result once', async () => {
  const f = fixture(); await f.sim.tick(); f.setTime(f.slot); await f.sim.tick();
  f.resolve(); f.setTime(f.slot + 20000); await f.sim.tick();
  assert.equal(f.sim.snapshot().agents[0].cash, 95);
  f.setTime(f.slot + ROUND + 20000); await f.sim.tick();
  assert.equal(f.sim.snapshot().agents[0].cash, 107.5);
  assert.equal(f.sim.snapshot().agents[1].cash, 95);
  await f.sim.tick(); assert.equal(f.sim.snapshot().agents[0].cash, 107.5);
  assert.equal(f.sim.snapshot().agents[0].winRate, 1);
  const agent = f.sim.snapshot().agents[0];
  assert.equal(agent.latest.settlement.officialOutcome, 'Up');
  assert.equal(agent.latest.settlement.payoutPerShare, 1);
  assert.equal(agent.latest.settlement.payout, 12.5);
  assert.equal(agent.latest.settlement.cashAfter - agent.latest.settlement.cashBefore, 12.5);
  assert.equal(agent.reconciliation.matched, true);
  assert.equal(agent.reconciliation.expectedCash, agent.cash);
  const full = f.sim.snapshot();
  const evidence = full.auditTrail.filter(event => event.type === 'SETTLEMENT_EVIDENCE');
  assert.equal(full.auditTrail.filter(event => event.type === 'SETTLEMENT').length, 3);
  assert.equal(evidence.length, 1);
  assert.ok(full.agents.every(item => item.latest.settlement.evidenceEventId === evidence[0].id));
  assert.ok(full.agents.every(item => !Object.hasOwn(item.latest.settlement, 'evidence')));
  const live = f.sim.liveSnapshot();
  const summary = f.sim.summary();
  assert.deepEqual(live.auditTrail, []);
  assert.ok(live.agents.every(item => !Object.hasOwn(item.latest, 'decision') && !Object.hasOwn(item.latest.quote, 'fills')));
  assert.ok(summary.agents.every(item => !Object.hasOwn(item, 'orders') && !Object.hasOwn(item, 'latest')));
  assert.ok(JSON.stringify(live).length < JSON.stringify(full).length);
});
test('late node, stale quotes and paused simulation skip without debits', async () => {
  for (const kind of ['late', 'stale', 'paused']) {
    const f = fixture(); await f.sim.tick();
    if (kind === 'stale') f.bad();
    if (kind === 'paused') f.sim.setEnabled(false);
    f.setTime(f.slot + (kind === 'late' ? 2000 : 0)); await f.sim.tick();
    assert.equal(f.sim.snapshot().agents[0].cash, 100);
    assert.equal(f.sim.snapshot().agents[0].orders.length, 0);
  }
});
test('restart preserves open positions and never retries a consumed boundary', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rule-ai-test-'));
  try {
    const file = path.join(dir, 'ledger.json');
    const f = fixture(file); await f.sim.tick(); f.setTime(f.slot); await f.sim.tick();
    const restored = createPredictionSimulation({ file, source: f.source, now: f.now });
    await restored.tick();
    assert.equal(restored.snapshot().agents[0].cash, 95);
    assert.equal(restored.snapshot().agents[0].orders.length, 1);
    f.setTime(f.slot + ROUND + 20000); await restored.tick();
    assert.equal(restored.snapshot().agents[0].latest.status, 'OPEN');
    f.resolve(); f.setTime(f.slot + ROUND + 40000); await restored.tick();
    assert.equal(restored.snapshot().agents[0].cash, 107.5);
    assert.equal(restored.snapshot().agents[0].wins, 1);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('a 50-50 official result pays half the shares, not a fabricated stake refund', async () => {
  const f = fixture(); await f.sim.tick(); f.setTime(f.slot); await f.sim.tick();
  const original = f.source.detail;
  f.source.detail = async id => {
    const t = await original(id); t.markets[0].status = 'RESOLVED';
    t.variantData = { startPrice: 100, endPrice: 100 };
    t.markets[0].outcomes.forEach(o => { o.price = .5; }); return t;
  };
  f.setTime(f.slot + ROUND + 20000); await f.sim.tick();
  const a = f.sim.snapshot().agents[0];
  assert.equal(a.latest.status, 'SPLIT'); assert.equal(a.cash, 101.25); assert.equal(a.winRate, null);
  assert.equal(a.latest.settlement.officialOutcome, 'SPLIT');
  assert.equal(a.latest.settlement.payoutPerShare, 0.5);
  assert.equal(a.latest.settlement.payout, 6.25);
  assert.equal(a.reconciliation.matched, true);
});
test('unresolved expired stakes stop further bets instead of accumulating twenty open orders', async () => {
  const f = fixture(); await f.sim.tick();
  for (let n = 0; n < 21; n++) {
    f.setTime(f.slot + n * ROUND); await f.sim.tick();
  }
  const a = f.sim.snapshot().agents[0];
  assert.equal(a.cash, 95); assert.equal(a.orders.length, 1); assert.equal(a.reserved, 5);
  assert.equal(f.sim.snapshot().recovery.status, 'exhausted');
});
