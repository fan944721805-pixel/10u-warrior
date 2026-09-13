const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPredictionSimulation, ROUND } = require('../prediction-sim');
const { createSimulationBattles } = require('../simulation-battles');

test('multiple battles preserve legacy ledger, isolate pause/balances, settle paused bets, rank and restore', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'battles-test-'));
  const file = path.join(dir, 'rule-ai-ledger.json');
  let time = 1800000010000, resolved = false;
  const slot = (Math.floor(time / ROUND) + 1) * ROUND;
  const topic = start => ({ marketTopicId: start, symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: start, status: resolved ? 'RESOLVED' : 'REGISTERED', tradingStatus: 'OPEN', outcomes: [{ name: 'Up', tokenId: 'up', winner: resolved ? true : null }, { name: 'Down', tokenId: 'down', winner: resolved ? false : null }] }] });
  const source = { marketFor: async s => topic(s), detail: async id => topic(id), book: async (m, d) => ({ tokenId: d === 'UP' ? 'up' : 'down', timestamp: time, asks: [{ price: .5, size: 100 }] }) };
  try {
    const legacy = createPredictionSimulation({ source, file, now: () => time });
    legacy.setEnabled(true);
    const before = fs.readFileSync(file, 'utf8');
    const manager = createSimulationBattles({ source, file, now: () => time, leaseEnabled: false });
    const second = manager.create('<第二局>');
    assert.equal(fs.readFileSync(file, 'utf8'), before);
    assert.equal(manager.list().length, 2);
    assert.equal(manager.snapshot().config.emotionLevel, 0);
    assert.equal(manager.setEmotion(95, second.id).config.emotionLevel, 95);
    assert.equal(manager.snapshot().config.actionUrgeLevel, 0);
    assert.equal(manager.setActionUrge(65, second.id).config.actionUrgeLevel, 65);
    assert.equal(manager.snapshot().config.emotionLevel, 0);
    assert.throws(() => manager.create('  '));
    assert.throws(() => manager.snapshot('../x'));
    await manager.tick(); time = slot; await manager.tick();
    for (const b of manager.list()) assert.deepEqual(b.agents.map(a => a.cash), [95,95,95]);
    const originalOrders = manager.snapshot().agents.map(a => a.orders);
    await assert.rejects(manager.remove(second.id), { code: 'BATTLE_HAS_PENDING_ORDERS' });
    assert.equal(manager.snapshot(second.id).enabled, true);
    manager.setEnabled(false, second.id);
    assert.equal(manager.snapshot().enabled, true);
    assert.equal(manager.snapshot(second.id).enabled, false);
    time = slot + 20000; await manager.tick();
    time = slot + ROUND; resolved = true; await manager.tick();
    assert.equal(manager.snapshot().agents[0].orders.length, 2);
    assert.equal(manager.snapshot(second.id).agents[0].orders.length, 1);
    assert.equal(manager.snapshot(second.id).agents[0].cash, 105);
    assert.equal(manager.snapshot(second.id).agents[1].cash, 95);
    const board = manager.leaderboard();
    assert.equal(board.length, 6); assert.equal(board[0].profit, 5);
    assert.equal(board.find(r => r.battleId === second.id && r.agentId === 'A').winRate, 1);
    assert.equal(board.find(r => r.battleId === second.id && r.agentId === 'B').winRate, 0);
    const snapshots = manager.list();
    const restored = createSimulationBattles({ source, file, now: () => time, leaseEnabled: false });
    assert.deepEqual(restored.list().map(b => b.agents), snapshots.map(b => b.agents));
    assert.equal(restored.snapshot(second.id).enabled, false);
    assert.equal(restored.snapshot(second.id).config.emotionLevel, 95);
    assert.equal(restored.snapshot(second.id).config.actionUrgeLevel, 65);
    assert.equal(restored.snapshot().agents[0].orders[0].id, originalOrders[0][0].id);
    await restored.tick();
    assert.equal(restored.snapshot().agents[0].orders.length, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a slow market lookup blocks only its own battle tick', async () => {
  let time = 1800000010000;
  const slot = (Math.floor(time / ROUND) + 1) * ROUND;
  let releaseBtc;
  let ethPrepared;
  const ethReady = new Promise(resolve => { ethPrepared = resolve; });
  const btcGate = new Promise(resolve => { releaseBtc = resolve; });
  const topic = (start, symbol) => ({ marketTopicId: `${symbol}-${start}`, symbol, marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: `${symbol}-${start}`, status: 'REGISTERED', tradingStatus: 'OPEN', outcomes: [{ name: 'Up', tokenId: `${symbol}-up` }, { name: 'Down', tokenId: `${symbol}-down` }] }] });
  const source = {
    marketFor: async (start, symbol) => {
      if (symbol === 'BTCUSDT') return btcGate;
      ethPrepared();
      return topic(start, symbol);
    },
    detail: async id => topic(Number(String(id).split('-').at(-1)), String(id).startsWith('ETH') ? 'ETHUSDT' : 'BTCUSDT'),
    book: async (market, direction) => ({ tokenId: `${market.symbol}-${direction === 'UP' ? 'up' : 'down'}`, timestamp: time, asks: [{ price: .5, size: 100 }] }),
  };
  const manager = createSimulationBattles({ source, now: () => time, leaseEnabled: false });
  const eth = manager.create('ETH battle', { agents: [{ id: 'eth', coin: 'ETH' }] });
  const firstTick = manager.tick();
  await ethReady;
  await new Promise(resolve => setImmediate(resolve));
  time = slot;
  await manager.tick();
  assert.equal(manager.snapshot(eth.id).roundCount, 1);
  assert.equal(manager.snapshot(eth.id).agents[0].orders.length, 1);
  assert.equal(manager.snapshot().roundCount, 0);
  releaseBtc(topic(slot, 'BTCUSDT'));
  await firstTick;
});
