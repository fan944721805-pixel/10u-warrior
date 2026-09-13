const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSimulationBattles } = require('../simulation-battles');
const { createOfflineSimulation, STORAGE_KEY } = require('../public/offline-simulation');

test('reset archives only paper records, preserves strategies, persists an empty paused placeholder', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-reset-'));
  const options = { file: path.join(dir, 'ledger.json'), source: {}, leaseEnabled: true };
  try {
    const sim = createSimulationBattles(options);
    const agents = sim.getStrategies().agents;
    agents[0].name = 'Retained Agent';
    sim.setStrategies(agents);
    const old = sim.create('old battle');
    fs.writeFileSync(path.join(dir, 'wallet.json'), 'untouched');
    const fresh = await sim.reset();
    assert.equal(fresh.placeholder, true);
    assert.equal(fresh.enabled, false);
    assert.equal(fresh.roundCount, 0);
    assert.deepEqual(sim.leaderboard(), []);
    assert.equal(sim.getStrategies().agents[0].name, 'Retained Agent');
    assert.ok(fresh.agents.every(a => a.orders.length === 0 && a.wins === 0 && a.losses === 0));
    assert.equal(fs.readFileSync(path.join(dir, 'wallet.json'), 'utf8'), 'untouched');
    const archive = path.join(dir, 'simulation-archives', fs.readdirSync(path.join(dir, 'simulation-archives'))[0]);
    assert.ok(fs.existsSync(path.join(archive, `battle-${old.id}.json`)));
    assert.throws(() => sim.setEnabled(true), /CREATE_BATTLE_FIRST/);
    const restored = createSimulationBattles(options);
    assert.equal(restored.snapshot().placeholder, true);
    assert.deepEqual(restored.leaderboard(), []);
    restored.create('第一局');
    assert.equal(restored.list().filter(b => !b.placeholder).length, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('offline reset preserves policies and backup; next created battle is the first counted battle', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const sim = createOfflineSimulation({ storage });
  const agents = sim.getStrategies().agents;
  agents[0].name = 'Kept'; sim.setStrategies(agents);
  sim.create('old');
  const fresh = sim.reset();
  assert.equal(fresh.placeholder, true);
  assert.equal(fresh.enabled, false);
  assert.equal(fresh.agents[0].policy.name, 'Kept');
  assert.equal(sim.leaderboard().length, 0);
  assert.ok([...values.keys()].some(k => k.startsWith(STORAGE_KEY + '-archive-')));
  const restored = createOfflineSimulation({ storage });
  assert.equal(restored.snapshot().placeholder, true);
  restored.create('第一局');
  assert.equal(restored.list().filter(b => !b.placeholder).length, 1);
});

test('offline backup failure leaves old records intact', () => {
  const sim = createOfflineSimulation({ storage: { getItem: () => null, setItem: key => { if (key.includes('-archive-')) throw new Error('full'); } } });
  sim.create('keep');
  assert.throws(() => sim.reset(), /full/);
  assert.equal(sim.list().length, 2);
});
