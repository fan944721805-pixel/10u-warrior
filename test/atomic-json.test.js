const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { atomicWriteJson } = require('../atomic-json');
const { createPredictionSimulation } = require('../prediction-sim');

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-storage-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, file: path.join(dir, 'ledger.json') };
}

test('atomic ledger uses unique temp files and does not disturb a pre-existing legacy .tmp', t => {
  const { dir, file } = workspace(t), temps = [];
  fs.writeFileSync(file + '.tmp', 'another writer');
  const fsImpl = { ...fs, renameSync(from, to) { temps.push(from); fs.renameSync(from, to); } };
  atomicWriteJson(file, { counter: 1 }, { fsImpl }); atomicWriteJson(file, { counter: 2 }, { fsImpl });
  assert.notEqual(temps[0], temps[1]); assert.equal(fs.readFileSync(file + '.tmp', 'utf8'), 'another writer');
  assert.deepEqual(JSON.parse(fs.readFileSync(file)), { counter: 2 });
  assert.equal(fs.readdirSync(dir).length, 2);
});

test('atomic ledger retries transient rename locks without exposing a partial target', t => {
  const { file } = workspace(t); atomicWriteJson(file, { counter: 1 });
  const delays = []; let attempts = 0;
  const fsImpl = { ...fs, renameSync(from, to) {
    assert.deepEqual(JSON.parse(fs.readFileSync(file)), { counter: 1 });
    if (++attempts < 3) throw Object.assign(new Error('sharing lock'), { code: 'EPERM' });
    fs.renameSync(from, to);
  } };
  atomicWriteJson(file, { counter: 2 }, { fsImpl, sleep: ms => delays.push(ms) });
  assert.deepEqual(delays, [20, 40]); assert.equal(attempts, 3);
  assert.deepEqual(JSON.parse(fs.readFileSync(file)), { counter: 2 });
});

test('persistent rename or disk-full failures keep the previous ledger and expose the failed operation', t => {
  const { dir, file } = workspace(t); atomicWriteJson(file, { counter: 1 });
  for (const code of ['EBUSY', 'ENOSPC']) {
    let attempts = 0;
    assert.throws(() => atomicWriteJson(file, { counter: 2 }, { fsImpl: { ...fs, renameSync() {
      attempts++; throw Object.assign(new Error('write failed'), { code });
    } }, sleep() {} }), error => error.code === code && error.storageOperation === 'rename');
    assert.equal(attempts, code === 'EBUSY' ? 3 : 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(file)), { counter: 1 });
    assert.deepEqual(fs.readdirSync(dir), ['ledger.json']);
  }
});

test('storage failure remains latched and visible; later ticks cannot resume or overwrite the last good ledger', async t => {
  const { file } = workspace(t); let calls = 0;
  const sim = createPredictionSimulation({ file, enabled: false, source: { marketFor: async () => { calls++; } } });
  sim.setEnabled(false); const before = fs.readFileSync(file, 'utf8');
  const rename = fs.renameSync;
  const mock = t.mock.method(fs, 'renameSync', (from, to) => {
    if (to === file) throw Object.assign(new Error('locked'), { code: 'EACCES', syscall: 'rename' });
    return rename(from, to);
  });
  assert.throws(() => sim.setEnabled(true), { code: 'STORAGE_ERROR' }); mock.mock.restore();
  await sim.tick(); const result = sim.snapshot();
  assert.equal(result.error, 'STORAGE_ERROR'); assert.equal(result.enabled, false); assert.equal(result.status, 'paused');
  assert.equal(result.storageIssue.code, 'EACCES'); assert.equal(result.storageIssue.operation, 'rename');
  assert.equal(result.storageIssue.file, 'ledger.json'); assert.equal(calls, 0);
  assert.throws(() => sim.setEnabled(true), { code: 'STORAGE_ERROR' });
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});
