const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSimulationBattles, normalizeBattleConfig } = require('../simulation-battles');
const { createPredictionSimulation, ROUND } = require('../prediction-sim');
const { createOfflineSimulation } = require('../public/offline-simulation');

const indicatorFixture = time => ({ dataTimestamp: time, priceChangePct: { oneMinute: 0.4, fiveMinutes: 1.1 }, rsi14: 60,
  ema: { ema5: 105, ema20: 100 }, macd: { line: 1, signal: 0.5, histogram: 0.5 },
  bollinger: { middle: 100, upper: 103, lower: 97, percentB: 0.7, bandwidthPct: 6 }, atr: { value: 0.2, percent: 0.2 },
  adx: { adx: 28, plusDI: 30, minusDI: 10 }, roc: { tenMinutes: 0.8, twentyMinutes: 1.2 }, longReturns: { fifteenMinutes: 0.9, sixtyMinutes: 2.1 }, momentum: 2,
  volatility: { perMinutePct: 0.1 }, volumeRatio: 1.2, takerFlow: { buyRatio: 0.65, netBase: 30, totalBase: 100 },
  spotOrderBookImbalance: 0.2, spread: { basisPoints: 1, mid: 100, microprice: 100.001, micropriceBiasBps: 0.1 } });

const config = () => ({ initialBalance: 10, rounds: 10, agents: [
  { id: 'fox', name: 'Original Fox', strategy: 'smart', coin: 'BTC', maxStakePct: 20 },
  { id: 'robot', name: 'Original Robot', strategy: 'smart', coin: 'BTC', maxStakePct: 20 },
] });
function fixture() {
  let time = 1800000010000;
  const topic = start => ({ marketTopicId: start, symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: start, tradingStatus: 'OPEN', status: time >= start + ROUND ? 'RESOLVED' : 'REGISTERED', outcomes: [
      { name: 'Up', tokenId: 'up', winner: time >= start + ROUND ? true : null },
      { name: 'Down', tokenId: 'down', winner: time >= start + ROUND ? false : null },
    ] }] });
  return {
    now: () => time, setTime: value => { time = value; },
    source: { marketFor: async start => topic(start), detail: async start => topic(start), book: async (_, direction) => ({ tokenId: direction === 'UP' ? 'up' : 'down', timestamp: time, asks: [{ price: .4, size: 1000 }] }) },
    indicatorSource: { snapshot: async () => indicatorFixture(time) },
    decisionProvider: { describe: () => ({ mode: 'mock', simulated: true }), decide: async input => ({ round_id: input.market.round_id, action: 'BET', direction: 'UP', stake_usdt: 1, stake_pct: 100 / input.account.balance, confidence: 90, risk_mode: 'NORMAL', factors: [], reason: 'test-only fixed decision', data_fresh: true, warnings: [] }) },
  };
}
function memoryStorage() { const data = new Map(); return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) }; }

test('server: selected 2 Agents receive 10U each; frozen config survives draft changes and restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-lifecycle-'));
  try {
    const f = fixture(), options = { ...f, file: path.join(dir, 'ledger.json'), leaseEnabled: false };
    const manager = createSimulationBattles(options), input = config();
    const battle = manager.create('Never translate my name', input);
    assert.equal(battle.initialTotal, 20);
    assert.deepEqual(battle.agents.map(a => [a.id, a.cash]), [['fox', 10], ['robot', 10]]);
    input.agents[0].name = 'Changed input';
    manager.setStrategies([{ id: 'A', name: 'Changed draft', maxStakePct: 100 }]);
    battle.config.agents[0].name = 'Changed returned snapshot';
    const original = manager.snapshot(battle.id);
    assert.equal(original.agents[0].policy.name, 'Original Fox');
    assert.equal(original.config.agents[0].maxStakePct, 20);
    const restored = createSimulationBattles(options);
    assert.deepEqual(restored.snapshot(battle.id).config, original.config);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('server: round 10 stops new orders, settles final stakes, freezes the full report across restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-rounds-'));
  try {
    const f = fixture(), options = { ...f, file: path.join(dir, 'ledger.json'), leaseEnabled: false };
    const manager = createSimulationBattles(options), battle = manager.create('Ten rounds', config());
    await manager.tick();
    for (let round = 1; round <= 10; round++) {
      f.setTime(manager.snapshot(battle.id).nextSlot);
      await manager.tick();
      const current = manager.snapshot(battle.id);
      assert.equal(current.roundCount, round);
      assert.ok(current.agents.every(a => a.orders.length === round), JSON.stringify(current.agents.map(a => a.lastDecision)));
    }
    const pending = manager.snapshot(battle.id);
    assert.equal(pending.status, 'settling');
    assert.ok(pending.agents.every(a => a.reserved === 1 && a.latest.status === 'OPEN'));
    assert.throws(() => manager.setEnabled(true, battle.id), /BATTLE_ENDED/);
    f.setTime(pending.nextSlot); await manager.tick();
    const report = manager.snapshot(battle.id);
    assert.equal(report.status, 'ended');
    assert.equal(report.endReason, 'ROUND_LIMIT');
    assert.ok(report.agents.every(a => a.orders.length === 10 && a.reserved === 0));
    manager.setStrategies([{ id: 'A', name: 'Later strategy' }]);
    manager.touch(battle.id); manager.setEnabled(false, battle.id); manager.end(battle.id);
    f.setTime(f.now() + ROUND * 20); await manager.tick();
    assert.deepEqual(manager.snapshot(battle.id), report);
    assert.deepEqual(createSimulationBattles(options).snapshot(battle.id), report);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('server: manual end keeps open stakes, remains terminal on restart, and settles without new bets', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-end-'));
  try {
    const f = fixture(), options = { ...f, file: path.join(dir, 'ledger.json'), leaseEnabled: false };
    let manager = createSimulationBattles(options);
    const battle = manager.create('Manual', config());
    await manager.tick(); f.setTime(battle.nextSlot); await manager.tick();
    const before = manager.snapshot(battle.id), stopped = manager.end(battle.id);
    assert.equal(stopped.status, 'settling');
    assert.deepEqual(stopped.agents, before.agents);
    manager = createSimulationBattles(options);
    assert.equal(manager.snapshot(battle.id).status, 'settling');
    f.setTime(f.now() + ROUND); await manager.tick();
    const report = manager.snapshot(battle.id);
    assert.equal(report.status, 'ended'); assert.equal(report.roundCount, 1);
    assert.ok(report.agents.every(a => a.cash === 11.5 && a.reserved === 0));
    assert.deepEqual(manager.end(battle.id), report);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('server-owned battles run without browser heartbeats, stop manually, and pause on restart while settling open orders', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-background-'));
  try {
    const f = fixture();
    const options = { ...f, file: path.join(dir, 'ledger.json'), leaseEnabled: false, pauseOnRestore: true, pauseOnError: true };
    const manager = createSimulationBattles(options);
    assert.equal(manager.snapshot().enabled, false);
    const battle = manager.create('Background', config());
    await manager.tick();
    f.setTime(f.now() + 60000); await manager.tick();
    assert.equal(manager.snapshot(battle.id).enabled, true);
    // Opening another battle does not pause the first one.
    manager.create('Another', config());
    assert.equal(manager.snapshot(battle.id).enabled, true);
    f.setTime(battle.nextSlot); await manager.tick();
    const placed = manager.snapshot(battle.id);
    assert.equal(placed.roundCount, 1);
    assert.ok(placed.agents.every(a => a.orders.length === 1 && a.reserved === 1));
    const restarted = createSimulationBattles(options);
    const paused = restarted.snapshot(battle.id);
    assert.equal(paused.enabled, false);
    assert.equal(paused.endReason, 'SERVER_RESTARTED');
    assert.deepEqual(paused.agents, placed.agents);
    f.setTime(paused.nextSlot + 16000); await restarted.tick();
    assert.equal(restarted.snapshot(battle.id).roundCount, 1);
    assert.ok(restarted.snapshot(battle.id).agents.every(a => a.reserved === 0));
    restarted.setEnabled(true, battle.id);
    assert.equal(restarted.snapshot(battle.id).enabled, true);
    restarted.setEnabled(false, battle.id);
    f.setTime(f.now() + ROUND * 2); await restarted.tick();
    assert.equal(restarted.snapshot(battle.id).enabled, false);
    assert.equal(restarted.snapshot(battle.id).roundCount, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('server-owned simulation pauses on unexpected runtime failure and stays paused', async () => {
  const f = fixture(); let fail = false;
  const sim = createPredictionSimulation({ ...f, pauseOnError: true, now: () => { if (fail) { fail = false; throw new Error('unexpected'); } return f.now(); } });
  fail = true; await sim.tick();
  assert.equal(sim.snapshot().enabled, false);
  assert.equal(sim.snapshot().endReason, 'SIMULATION_ERROR');
  await sim.tick();
  assert.equal(sim.snapshot().enabled, false);
});

test('server: optional browser lease still pauses within 30 seconds, read-only list cannot renew the lease', async () => {
  const f = fixture(), manager = createSimulationBattles(f);
  assert.equal(manager.snapshot().enabled, false);
  const battle = manager.create('Lease', config());
  await manager.tick(); f.setTime(f.now() + 30001);
  manager.list(); await manager.tick();
  assert.equal(manager.snapshot(battle.id).endReason, 'CLIENT_DISCONNECTED');
  f.setTime(battle.nextSlot); await manager.tick();
  assert.equal(manager.snapshot(battle.id).roundCount, 0);
  manager.touch(battle.id);
  assert.equal(manager.snapshot(battle.id).enabled, false);
});

test('server: ending during a pending AI request never places a late order', async () => {
  const f = fixture(); let release, entered;
  const waiting = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; });
  const base = f.decisionProvider.decide;
  f.decisionProvider.decide = async input => { entered(); await waiting; return base(input); };
  const policies = config().agents;
  const sim = createPredictionSimulation({ ...f, initialBalance: 10, agentPolicies: policies, policyFor: id => policies.find(a => a.id === id) });
  await sim.tick(); f.setTime(sim.snapshot().nextSlot);
  const tick = sim.tick(); await started;
  assert.equal(sim.end().status, 'settling'); release(); await tick;
  const report = sim.snapshot();
  assert.equal(report.status, 'ended');
  assert.ok(report.agents.every(a => a.cash === 10 && a.orders.length === 0 && a.lastStatus !== 'QUOTING'));
  await sim.tick(); assert.deepEqual(sim.snapshot(), report);
});

test('offline: 2 x 10U, ten aligned rounds, frozen policies and final report survive reopening', () => {
  let time = 1800000010000;
  const storage = memoryStorage(), options = { storage, now: () => time, randomUUID: () => 'offline-ten' };
  const runtime = createOfflineSimulation(options), input = config(), battle = runtime.create('Custom name', input);
  assert.equal(battle.initialTotal, 20); assert.equal(battle.roundCount, 0);
  assert.deepEqual(battle.agents.map(a => a.cash), [10, 10]);
  input.agents[0].name = 'Mutated'; runtime.setStrategies([{ name: 'New draft' }]);
  for (let i = 1; i <= 10; i++) {
    time = runtime.snapshot(battle.id).nextSlot;
    const current = runtime.snapshot(battle.id);
    assert.equal(current.roundCount, i);
    assert.equal(runtime.snapshot(battle.id).roundCount, i);
    assert.equal(current.agents[0].policy.name, 'Original Fox');
  }
  assert.equal(runtime.snapshot(battle.id).enabled, false);
  time += ROUND;
  const report = runtime.snapshot(battle.id);
  assert.equal(report.status, 'ended'); assert.equal(report.roundCount, 10);
  assert.ok(report.agents.every(a => a.reserved === 0));
  assert.throws(() => runtime.setEnabled(battle.id, true), /BATTLE_ENDED/);
  runtime.setEnabled(battle.id, false); time += ROUND * 20;
  assert.deepEqual(runtime.snapshot(battle.id), report);
  assert.deepEqual(createOfflineSimulation(options).snapshot(battle.id), report);
});

test('offline: reopening a running battle pauses it; manual end persists; storage failures are reported', () => {
  let time = 1800000010000;
  const storage = memoryStorage(), options = { storage, now: () => time, randomUUID: () => 'offline-manual' };
  const runtime = createOfflineSimulation(options), battle = runtime.create('Manual', config());
  const restored = createOfflineSimulation(options);
  assert.equal(restored.snapshot(battle.id).enabled, false);
  time += ROUND * 3; assert.equal(restored.snapshot(battle.id).roundCount, 0);
  const ended = restored.end(battle.id);
  assert.equal(ended.status, 'ended');
  assert.deepEqual(createOfflineSimulation(options).snapshot(battle.id), ended);
  const broken = createOfflineSimulation({ storage: { getItem: () => null, setItem: () => { throw new Error('quota'); } } });
  assert.throws(() => broken.create('No storage', config()), /STORAGE_ERROR/);
});

test('creation rejects invalid budgets, Agent counts and round limits instead of changing them silently', () => {
  for (const invalid of [{ initialBalance: 0 }, { initialBalance: '10' }, { agents: [] }, { rounds: 1.5 }, { rounds: '10' }, { rounds: -1 }]) {
    assert.throws(() => normalizeBattleConfig(invalid), /INVALID_BATTLE/);
    assert.throws(() => createOfflineSimulation().create('Invalid', invalid), /INVALID_BATTLE/);
  }
});
