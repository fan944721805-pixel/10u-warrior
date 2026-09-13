const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPredictionSimulation, ROUND } = require('../prediction-sim');
const { createPositionValuation } = require('../position-valuation');
const { equityEstimate, valuationKey } = require('../public/market-values');
const { RETRY_DELAYS } = require('../recovery-policy');
const { createWarriorServer } = require('../server');

function fixture(file) {
  let time = 1800000010000, broken = false, resolved = false, thin = false;
  const calls = [];
  const topic = start => ({ marketTopicId: String(start), symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT',
    startDate: start, endDate: start + ROUND, markets: [{ marketId: String(start), status: resolved && time >= start + ROUND ? 'RESOLVED' : 'REGISTERED', tradingStatus: 'OPEN', outcomes: [
      { name: 'Up', tokenId: 'up', winner: resolved ? true : null }, { name: 'Down', tokenId: 'down', winner: resolved ? false : null },
    ] }] });
  const check = method => { calls.push(method); if (broken) throw Object.assign(Error('connection reset'), { code: broken === true ? 'NETWORK_ERROR' : broken }); };
  const source = {
    marketFor: async start => { check('market'); return topic(start); },
    detail: async id => { check('detail'); return topic(Number(id)); },
    book: async (_, direction) => { check('book'); return { tokenId: direction === 'UP' ? 'up' : 'down', timestamp: time,
      asks: [{ price: .5, size: 10000 }], bids: thin ? [] : [{ price: .5, size: 10000 }] }; },
  };
  const options = { source, file, now: () => time, random: () => 0 };
  const sim = createPredictionSimulation(options);
  return { sim, source, options, calls, now: () => time, setTime: t => { time = t; },
    break: (v = true) => { broken = v; }, resolve: () => { resolved = true; }, thin: v => { thin = v; } };
}
async function exhaust(f) {
  for (let attempt = 1; attempt <= RETRY_DELAYS.length; attempt++) {
    const before = f.sim.snapshot().recovery;
    f.setTime(before.nextRetryAt - 1);
    const count = f.calls.length; await f.sim.tick(); assert.equal(f.calls.length, count);
    f.setTime(before.nextRetryAt); await f.sim.tick();
    assert.equal(f.sim.snapshot().recovery.attempts, attempt);
  }
}
async function enter(f) {
  await f.sim.tick(); f.setTime(f.sim.snapshot().nextSlot); await f.sim.tick();
  assert.equal(f.sim.snapshot().agents[0].orders.length, 1);
}

test('network outage uses exactly five scheduled retries, then stops across ticks and restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-recovery-'));
  try {
    const f = fixture(path.join(dir, 'ledger.json'));
    f.break(); await f.sim.tick();
    assert.equal(f.sim.snapshot().status, 'reconnecting');
    assert.equal(f.sim.snapshot().recovery.kind, 'network');
    assert.equal(f.sim.snapshot().recovery.nextRetryAt - f.now(), 5000);
    await exhaust(f);
    const snap = f.sim.snapshot(), count = f.calls.length;
    assert.equal(count, 6); // initial read plus five retries
    assert.equal(snap.status, 'retry-paused'); assert.equal(snap.recovery.nextRetryAt, null);
    for (let n = 0; n < 20; n++) { f.setTime(f.now() + ROUND); await f.sim.tick(); }
    const restored = createPredictionSimulation({ ...f.options, pauseOnRestore: true });
    await restored.tick(); restored.setEnabled(true); await restored.tick();
    assert.equal(f.calls.length, count);
    assert.equal(restored.snapshot().recovery.attempts, 5);
    assert.ok(restored.snapshot().agents.every(a => a.cash === 100 && a.orders.length === 0));
    f.break(false); restored.retryConnection(); await restored.tick();
    assert.equal(restored.snapshot().recovery, null); assert.equal(restored.snapshot().status, 'running');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('restore during retry backoff preserves remaining attempts and the deadline', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-recovery-'));
  try {
    const f = fixture(path.join(dir, 'ledger.json')); f.break(); await f.sim.tick();
    f.setTime(f.sim.snapshot().recovery.nextRetryAt); await f.sim.tick();
    const saved = f.sim.snapshot().recovery, count = f.calls.length;
    const restored = createPredictionSimulation(f.options); await restored.tick();
    assert.deepEqual(restored.snapshot().recovery, saved); assert.equal(f.calls.length, count);
    f.setTime(saved.nextRetryAt); await restored.tick(); assert.equal(restored.snapshot().recovery.attempts, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('expired orders settle once before resumed betting; manually paused battles stay paused', async () => {
  for (const manualPause of [false, true]) {
    const f = fixture(); await enter(f); const end = f.sim.snapshot().agents[0].latest.end;
    f.break(); f.setTime(end + 20000); await f.sim.tick();
    assert.equal(f.sim.snapshot().recovery.code, 'NETWORK_ERROR');
    assert.ok(f.sim.snapshot().agents.every(a => a.orders.length === 1 && a.cash === 95));
    if (manualPause) f.sim.setEnabled(false);
    f.break(false); f.resolve(); f.calls.length = 0;
    f.setTime(f.sim.snapshot().recovery.nextRetryAt); await f.sim.tick();
    const settled = f.sim.snapshot();
    assert.equal(settled.recovery, null); assert.equal(settled.enabled, !manualPause);
    assert.equal(settled.status, manualPause ? 'paused' : 'running');
    assert.deepEqual(settled.agents.map(a => a.cash), [105, 95, 105]);
    assert.equal(f.calls[0], 'detail');
    assert.equal(settled.auditTrail.filter(e => e.type === 'SETTLEMENT').length, 3);
    f.setTime(settled.nextSlot); await f.sim.tick();
    const after = f.sim.snapshot();
    assert.ok(after.agents.every(a => a.orders.length === (manualPause ? 1 : 2) && a.reconciliation.matched));
    assert.equal(after.auditTrail.filter(e => e.type === 'SETTLEMENT').length, 3);
  }
});

test('pending settlement keeps polling beyond fault retry limits and automatically finishes an ended battle', async () => {
  const f = fixture(); await enter(f); f.setTime(f.sim.snapshot().agents[0].latest.end + 20000);
  await f.sim.tick(); assert.equal(f.sim.snapshot().recovery.kind, 'settlement');
  assert.equal(f.sim.snapshot().status, 'awaiting-settlement');
  f.sim.end('MANUAL');
  for (let n = 0; n < 12; n++) {
    const pending = f.sim.snapshot().recovery;
    assert.equal(pending.attempts, 0); assert.equal(pending.maxAttempts, null);
    assert.equal(pending.nextRetryAt - f.now(), 30000);
    f.setTime(pending.nextRetryAt - 1); const calls = f.calls.length; await f.sim.tick(); assert.equal(f.calls.length, calls);
    f.setTime(pending.nextRetryAt); await f.sim.tick();
  }
  assert.ok(f.sim.snapshot().agents.every(a => a.cash === 95 && a.latest.status === 'OPEN'));
  f.resolve(); f.setTime(f.sim.snapshot().recovery.nextRetryAt); await f.sim.tick();
  assert.equal(f.sim.snapshot().status, 'ended'); assert.equal(f.sim.snapshot().recovery, null);
  assert.ok(f.sim.snapshot().agents.every(a => a.orders.length === 1));
  assert.equal(f.sim.snapshot().auditTrail.filter(e => e.type === 'SETTLEMENT').length, 3);
  await f.sim.tick(); assert.equal(f.sim.snapshot().auditTrail.filter(e => e.type === 'SETTLEMENT').length, 3);
});

test('a genuine network fault during settlement has a bounded retry batch, while pending results do not', async () => {
  const f = fixture(); await enter(f); f.setTime(f.sim.snapshot().agents[0].latest.end + 20000); await f.sim.tick();
  f.break(); f.setTime(f.sim.snapshot().recovery.nextRetryAt); await f.sim.tick();
  assert.equal(f.sim.snapshot().recovery.kind, 'network'); assert.equal(f.sim.snapshot().recovery.attempts, 0);
  await exhaust(f); assert.equal(f.sim.snapshot().recovery.status, 'exhausted');
  f.break(false); f.sim.retryConnection(); await f.sim.tick();
  assert.equal(f.sim.snapshot().recovery.kind, 'settlement'); assert.equal(f.sim.snapshot().recovery.attempts, 0);
  f.sim.setEnabled(false); f.resolve(); f.setTime(f.sim.snapshot().recovery.nextRetryAt); await f.sim.tick();
  assert.equal(f.sim.snapshot().status, 'paused'); assert.equal(f.sim.snapshot().recovery, null);
});

test('restart retains settlement polling and migrates exhausted old settlement waits without re-enabling bets', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-settlement-'));
  t.after(() => { assert.equal(path.dirname(dir), os.tmpdir()); fs.rmSync(dir, { recursive: true, force: true }); });
  const file = path.join(dir, 'ledger.json'), f = fixture(file);
  await enter(f); f.sim.end(); f.setTime(f.sim.snapshot().agents[0].latest.end + 20000); await f.sim.tick();
  const before = f.sim.snapshot().recovery;
  let restored = createPredictionSimulation({ ...f.options, pauseOnRestore: true });
  await restored.tick(); assert.deepEqual(restored.snapshot().recovery, before);
  const old = JSON.parse(fs.readFileSync(file)); old.recovery.status = 'exhausted'; old.recovery.attempts = 5; old.recovery.maxAttempts = 5; old.recovery.nextRetryAt = null;
  fs.writeFileSync(file, JSON.stringify(old));
  restored = createPredictionSimulation({ ...f.options, pauseOnRestore: true }); await restored.tick();
  assert.equal(restored.snapshot().recovery.attempts, 0); assert.equal(restored.snapshot().enabled, false);
  f.resolve(); f.setTime(restored.snapshot().recovery.nextRetryAt); await restored.tick();
  assert.equal(restored.snapshot().status, 'ended'); assert.ok(restored.snapshot().agents.every(a => a.reconciliation.matched));
});

test('login failures use the auth state and starting controls do not reset an exhausted budget', async () => {
  const f = fixture(); f.break('WALLET_NOT_CONNECTED'); await f.sim.tick(); await exhaust(f);
  assert.equal(f.sim.snapshot().recovery.kind, 'auth'); const count = f.calls.length;
  f.sim.setEnabled(false); f.sim.setEnabled(true); await f.sim.tick();
  assert.equal(f.calls.length, count); assert.equal(f.sim.snapshot().recovery.status, 'exhausted');
});

test('a manually paused battle without orders must still verify connection before clearing an outage', async () => {
  const f = fixture(); f.break(); await f.sim.tick(); f.sim.setEnabled(false);
  f.sim.retryConnection(); await f.sim.tick();
  assert.equal(f.sim.snapshot().recovery.attempts, 1); assert.equal(f.sim.snapshot().enabled, false);
  f.break(false); f.setTime(f.sim.snapshot().recovery.nextRetryAt); await f.sim.tick();
  assert.equal(f.sim.snapshot().recovery, null); assert.equal(f.sim.snapshot().status, 'paused');
  f.break(); f.sim.setEnabled(true); f.setTime(f.now()+ROUND); await f.sim.tick();
  assert.ok(f.sim.snapshot().recovery); f.sim.end();
  assert.equal(f.sim.snapshot().status, 'ended'); assert.equal(f.sim.snapshot().recovery, null);
});

test('valuation reads stop during recovery and stale marks cannot replace book equity', async () => {
  const f = fixture(); await enter(f);
  let snap = { ...f.sim.snapshot(), id: 'fixture' };
  const valuation = createPositionValuation({ source: f.source, now: f.now });
  const good = await valuation(snap);
  assert.equal(equityEstimate(snap, good, f.now()).estimatedEquity, 300);
  f.sim.marketFailure('NETWORK_ERROR'); snap = { ...f.sim.snapshot(), id: 'fixture' };
  assert.equal(snap.recovery.stage, 'valuation'); const count = f.calls.length;
  for (let n = 0; n < 20; n++) await valuation(snap);
  assert.equal(f.calls.length, count);
  const fallback = equityEstimate(snap, { ...good, signature: valuationKey(snap) }, f.now());
  assert.equal(fallback.estimatedEquity, null); assert.equal(fallback.bookEquity, 300);
  f.thin(true); await exhaust(f);
  assert.equal(f.sim.snapshot().recovery.code, 'NO_BIDS'); // A readable but unusable book must not reset the budget.
});

test('HTTP valuation shares battle recovery; manual retry is same-origin, typed, and never enables betting', async () => {
  const f = fixture(); await enter(f); f.break(); f.sim.setEnabled(false);
  const snapshot = () => ({ ...f.sim.snapshot(), id: 'b1' });
  const server = createWarriorServer({ now: f.now, paperFile: null, predictionSource: f.source, walletCli: async()=>{throw Error('NO_WALLET');},
    simulation: { snapshot, tick: async()=>{}, marketFailure: (_,code)=>f.sim.marketFailure(code), retryConnection: id=>{
      assert.equal(id,'b1'); f.sim.retryConnection(); return snapshot();
    } } });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    const result=await(await fetch(origin+'/api/simulation/valuation?battleId=b1')).json();
    assert.equal(result.recovery.kind,'network');
    const count=f.calls.length;
    await Promise.all(Array.from({length:12},()=>fetch(origin+'/api/simulation/valuation?battleId=b1').then(r=>r.json())));
    assert.equal(f.calls.length,count);
    await exhaust(f);
    const post=(body,extra={})=>fetch(origin+'/api/simulation/retry',{method:'POST',headers:{'content-type':'application/json',...extra},body:JSON.stringify(body)});
    assert.equal((await post({battleId:'b1'},{origin:'https://foreign.invalid'})).status,403);
    assert.equal((await post({})).status,409);
    assert.equal(f.sim.snapshot().recovery.attempts,5);
    const response=await post({battleId:'b1'});assert.equal(response.status,200);
    const pending=await response.json();assert.equal(pending.recovery.attempts,0);assert.equal(pending.enabled,false);
    assert.ok(pending.agents.every(a=>a.cash===95&&a.orders.length===1));
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
