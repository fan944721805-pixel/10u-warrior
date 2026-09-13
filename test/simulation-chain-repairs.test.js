const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSimulationBattles } = require('../simulation-battles');
const { createOfflineSimulation, STORAGE_KEY } = require('../public/offline-simulation');
const { createWarriorServer } = require('../server');
const backupKey = `${STORAGE_KEY}-backup`;
const config = { initialBalance: 10, rounds: 10, agents: [{ id: 'A', strategy: 'conservative', coin: 'BTC' }] };
const now = () => 1800000010000;
const source = { marketFor: async () => { throw Object.assign(Error('FIXTURE'), { code: 'NETWORK_ERROR' }); } };
function storage() {
  const values = new Map(); let failedKey = null;
  return { values, getItem: key => values.get(key) ?? null,
    setItem(key, value) { if (key === failedKey || failedKey === '*') throw Error('quota'); values.set(key, value); },
    fail(key) { failedKey = key; } };
}
function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-chain-repair-'));
  t.after(() => { assert.equal(path.dirname(dir), os.tmpdir()); fs.rmSync(dir, { recursive: true, force: true }); });
  return dir;
}

test('new server and offline battles require at least 10U without rewriting legacy low balances', t => {
  const dir = temp(t), file = path.join(dir, 'ledger.json');
  const manager = createSimulationBattles({ source, file, now, leaseEnabled: false });
  const memory = storage(), offline = createOfflineSimulation({ storage: memory, now });
  for (const amount of [1, 9.99, 9.999, 0, 1001]) for (const runtime of [manager, offline]) {
    assert.throws(() => runtime.create('invalid', { ...config, initialBalance: amount }), /INVALID_BATTLE_BUDGET/);
  }
  const created = manager.create('10U', config), local = offline.create('10U', config);
  assert.equal(created.agents[0].cash, 10); assert.equal(local.agents[0].cash, 10);
  const registryPath = path.join(dir, 'simulation-battles.json'), ledgerPath = path.join(dir, `battle-${created.id}.json`);
  const registry = JSON.parse(fs.readFileSync(registryPath)), ledger = JSON.parse(fs.readFileSync(ledgerPath));
  registry.battles.find(b => b.id === created.id).config.initialBalance = 5;
  ledger.config.initialBalance = 5; ledger.agents[0].cash = 5;
  fs.writeFileSync(registryPath, JSON.stringify(registry)); fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
  assert.equal(createSimulationBattles({ source, file, now }).snapshot(created.id).agents[0].cash, 5);
  const saved = JSON.parse(memory.getItem(STORAGE_KEY)); saved.battles[1].config.initialBalance = 5; saved.battles[1].agents[0].cash = 5;
  memory.setItem(STORAGE_KEY, JSON.stringify(saved));
  assert.equal(createOfflineSimulation({ storage: memory, now }).snapshot(local.id).agents[0].cash, 5);
});

test('creation IDs survive server restart and deletion; retries cannot change config or resurrect a deleted battle', async t => {
  const dir = temp(t), file = path.join(dir, 'ledger.json'), requestId = 'create-request-123';
  let manager = createSimulationBattles({ source, file, now, leaseEnabled: false });
  const first = manager.create('original', config, 'client-one', requestId);
  manager.setEnabled(false, first.id); manager.topUp(first.id, 'A', 20, 'top-up-request-123');
  manager = createSimulationBattles({ source, file, now, leaseEnabled: false });
  const retry = manager.create('original', { agents: config.agents, rounds: 10, initialBalance: 10 }, 'other-client', requestId);
  assert.equal(retry.id, first.id); assert.equal(retry.agents[0].cash, 30); assert.equal(retry.enabled, false);
  assert.equal(manager.list().length, 2);
  assert.throws(() => manager.create('original', { ...config, initialBalance: 100 }, null, requestId), { code: 'CREATION_REQUEST_CONFLICT' });
  await manager.remove(first.id);
  manager = createSimulationBattles({ source, file, now, leaseEnabled: false });
  assert.throws(() => manager.create('original', config, null, requestId), { code: 'BATTLE_CREATION_RETIRED' });
});

test('HTTP retries return the already-created battle and reject an under-10U request', async t => {
  const simulation = createSimulationBattles({ source, now, leaseEnabled: false });
  const server = createWarriorServer({ simulation, now, paperFile: null, predictionSource: source, walletCli: async () => { throw Error('NO_EXTERNAL_CALLS'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const post = body => fetch(`http://127.0.0.1:${server.address().port}/api/simulation/battles`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const body = { name: 'HTTP retry', config, requestId: 'http-create-123' };
  const capabilities = await (await fetch(`http://127.0.0.1:${server.address().port}/api/simulation/strategies`)).json();
  assert.equal(capabilities.capabilities.idempotentCreation, true);
  assert.equal(capabilities.capabilities.minInitialBalance, 10);
  assert.equal((await post({ ...body, config: { ...config, initialBalance: 5 } })).status, 400);
  const first = await post(body); assert.equal(first.status, 201); const id = (await first.json()).id;
  const repeats = await Promise.all(Array.from({ length: 3 }, () => post(body)));
  for (const result of repeats) { assert.equal(result.status, 200); assert.equal((await result.json()).id, id); }
  assert.equal(simulation.list().length, 2);
});

test('offline creation retries survive reload and roll back a failed write', () => {
  const memory = storage(); let runtime = createOfflineSimulation({ storage: memory, now });
  const first = runtime.create('offline retry', config, 'offline-create-123');
  runtime = createOfflineSimulation({ storage: memory, now });
  assert.equal(runtime.create('offline retry', config, 'offline-create-123').id, first.id);
  assert.equal(runtime.list().length, 2);
  assert.throws(() => runtime.create('different', config, 'offline-create-123'), { code: 'CREATION_REQUEST_CONFLICT' });
  memory.fail(STORAGE_KEY);
  assert.throws(() => runtime.create('failed', config, 'offline-create-456'), /STORAGE_ERROR/);
  memory.fail(null);
  assert.equal(runtime.list().length, 2);
  runtime.create('failed', config, 'offline-create-456');
  assert.equal(runtime.list().length, 3);
});

test('damaged or unsupported offline saves never become fresh balances or allow implicit writes', () => {
  for (const raw of ['{broken', 'null', '{"version":999,"battles":[]}']) {
    const memory = storage(); memory.setItem(STORAGE_KEY, raw);
    const runtime = createOfflineSimulation({ storage: memory, now });
    for (let n = 0; n < 3; n++) {
      assert.equal(runtime.snapshot().error, 'OFFLINE_STORAGE_INVALID');
      assert.deepEqual(runtime.snapshot().agents, []); assert.deepEqual(runtime.leaderboard(), []);
    }
    for (const mutation of [() => runtime.create('blocked', config), () => runtime.reset(), () => runtime.clear(), () => runtime.setEnabled('default', true), () => runtime.setStrategies([])]) assert.throws(mutation, /OFFLINE_STORAGE_INVALID/);
    assert.equal(memory.getItem(STORAGE_KEY), raw);
    memory.fail('*'); assert.throws(() => runtime.recoverStorage('reset'));
    assert.equal(memory.getItem(STORAGE_KEY), raw);
    memory.fail(null); runtime.recoverStorage('reset');
    assert.equal(runtime.snapshot().error, null); assert.equal(runtime.snapshot().placeholder, true);
    assert.ok([...memory.values].some(([key, value]) => key.includes('-damaged-') && value === raw));
  }
});

test('offline backup restore preserves the damaged bytes and pauses the restored battle', () => {
  const memory = storage(); let runtime = createOfflineSimulation({ storage: memory, now });
  const first = runtime.create('recover me', config); runtime.setEnabled(first.id, false);
  runtime.topUp(first.id, 'A', 20, 'backup-topup-123'); runtime.setEnabled(first.id, true);
  assert.ok(memory.getItem(backupKey));
  const expected = JSON.parse(memory.getItem(backupKey)).battles.find(b => b.id === first.id).agents[0].cash;
  memory.setItem(STORAGE_KEY, 'damaged original');
  runtime = createOfflineSimulation({ storage: memory, now });
  assert.equal(runtime.storageStatus().backupAvailable, true);
  memory.fail(STORAGE_KEY); assert.throws(() => runtime.recoverStorage('backup'));
  assert.equal(memory.getItem(STORAGE_KEY), 'damaged original'); assert.ok(runtime.storageStatus());
  memory.fail(null); runtime.recoverStorage('backup');
  assert.equal(runtime.snapshot(first.id).agents[0].cash, expected); assert.equal(runtime.snapshot(first.id).enabled, false);
  assert.ok([...memory.values].some(([key, value]) => key.includes('-damaged-') && value === 'damaged original'));
});

test('offline read errors cannot overwrite unreadable storage; retry can recover after access returns', () => {
  const memory = storage(); let runtime = createOfflineSimulation({ storage: memory, now });
  const first = runtime.create('read me', config), raw = memory.getItem(STORAGE_KEY);
  const get = memory.getItem; memory.getItem = () => { throw Error('read denied'); };
  runtime = createOfflineSimulation({ storage: memory, now });
  assert.equal(runtime.snapshot().error, 'OFFLINE_STORAGE_INVALID');
  assert.throws(() => runtime.recoverStorage('reset'));
  memory.getItem = get; assert.equal(memory.getItem(STORAGE_KEY), raw);
  runtime.recoverStorage('retry'); assert.equal(runtime.snapshot(first.id).agents[0].cash, 10);
});
