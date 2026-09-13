const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createAiFetch } = require('../ai-transport');
const { createAiConnections } = require('../ai-connections');
const { createSimulationBattles } = require('../simulation-battles');
const { buildDecisionContext } = require('../ai-decision');
const { fixture } = require('./fixtures/simulation-market.cjs');

const settings = { provider: 'deepseek', baseUrl: 'https://api.deepseek.com', model: 'fixture', apiKey: 'fixture-secret' };
const skip = input => ({ round_id: input.market.round_id, action: 'SKIP', direction: null, stake_usdt: 0,
  stake_pct: 0, confidence: 0, risk_mode: 'WAIT', factors: [], reason: 'fixture', data_fresh: true, warnings: [] });
const response = input => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(skip(input)) } }],
  usage: { prompt_tokens: 10, completion_tokens: 5 } }) });
const networkError = () => Object.assign(new Error('fixture unavailable'), { code: 'AI_REQUEST_FAILED' });
async function context(f) {
  return buildDecisionContext({ market: { roundId: String(f.slot), secondsToClose: 300, upOdds: 2, downOdds: 2, dataTimestamp: f.now() },
    indicators: await f.indicatorSource.snapshot(), policy: { ...f.policy, aiConnectionId: 'deepseek' },
    account: { balance: 100, initialBalance: 100, wins: 0, losses: 0, winStreak: 0, lossStreak: 0, openStake: 0 } });
}

test('official DeepSeek uses a private direct agent, other hosts retain their existing transport', async () => {
  const requests = [], forwarded = [];
  const wire = createAiFetch({ fetchImpl: async url => { forwarded.push(url); return 'proxy'; },
    requestImpl: (url, options, callback) => {
      requests.push({ url, options });
      const request = new EventEmitter();
      request.end = body => {
        requests.at(-1).body = body;
        const stream = new EventEmitter(); stream.statusCode = 200; stream.headers = {};
        callback(stream); stream.emit('data', Buffer.from('{"ok":true}')); stream.emit('end');
      };
      return request;
    } });
  const answer = await wire('https://api.deepseek.com/v1/chat/completions', { method: 'POST', body: '{}', signal: new AbortController().signal });
  assert.deepEqual(await answer.json(), { ok: true });
  assert.deepEqual(requests[0].options.agent.options.proxyEnv, {});
  assert.equal(requests[0].options.agent.options.rejectUnauthorized, undefined);
  assert.equal(requests[0].body, '{}');
  for (const url of ['https://api.openai.com/v1', 'https://api.deepseek.com.example/v1', 'http://127.0.0.1:11434']) assert.equal(await wire(url), 'proxy');
  assert.equal(requests.length, 1); assert.equal(forwarded.length, 3);
});

test('isolated failures retry twice, account each attempt and clear health on success', async () => {
  const f = fixture(), waits = []; let failures = 2, attempts = 0;
  const store = createAiConnections({ now: f.now, wait: async ms => { waits.push(ms); f.setTime(f.now() + ms); },
    fetchImpl: async (_, options) => {
      const input = JSON.parse(JSON.parse(options.body).messages.at(-1).content);
      if (input.market.round_id !== 'connection-test') { attempts++; if (failures-- > 0) throw new TypeError('fetch failed'); }
      return response(input);
    } });
  await store.save(settings, true);
  const input = await context(f);
  assert.equal((await store.router.decide(input)).action, 'SKIP');
  assert.equal(attempts, 3); assert.deepEqual(waits, [500, 1000]);
  assert.equal(store.snapshot().usage.deepseek.calls, 4);
  assert.equal(store.snapshot().usage.deepseek.errors, 2);
  assert.equal(store.snapshot().connections[0].lastError, null);
});

test('persistent isolated failure exhausts retries without falling back to local rules', async () => {
  const f = fixture(); let attempts = 0;
  const store = createAiConnections({ now: f.now, wait: async ms => f.setTime(f.now() + ms), fetchImpl: async (_, options) => {
    const input = JSON.parse(JSON.parse(options.body).messages.at(-1).content);
    if (input.market.round_id !== 'connection-test') { attempts++; throw new TypeError('fetch failed'); }
    return response(input);
  } });
  await store.save(settings, true);
  await assert.rejects(store.router.decide(await context(f)), { code: 'AI_REQUEST_FAILED' });
  assert.equal(attempts, 3); assert.equal(store.snapshot().connections[0].lastError, 'AI_REQUEST_FAILED');
});

test('retry respects freshness and cancellation; auth failures do not retry', async () => {
  for (const mode of ['stale', 'cancel', 'auth']) {
    const f = fixture(); let calls = 0, cancelled = false;
    const store = createAiConnections({ now: f.now, wait: async ms => { f.setTime(f.now() + ms); cancelled = true; }, fetchImpl: async (_, options) => {
      const input = JSON.parse(JSON.parse(options.body).messages.at(-1).content);
      if (input.market.round_id === 'connection-test') return response(input);
      calls++; if (mode === 'stale') f.setTime(f.now() + 9500);
      if (mode === 'auth') return { ok: false, status: 401 };
      throw new TypeError('fetch failed');
    } });
    await store.save(settings, true);
    await assert.rejects(store.router.decide(await context(f), { isCancelled: () => cancelled }));
    assert.equal(calls, 1, mode);
  }
});

test('selection check uses saved credentials and revision without changing model assignments', async () => {
  let unavailable = false;
  const store = createAiConnections({ fetchImpl: async (_, options) => {
    assert.match(JSON.parse(options.body).messages[0].content, /json/i);
    if (unavailable) throw new TypeError('fetch failed');
    return response(JSON.parse(JSON.parse(options.body).messages.at(-1).content));
  } });
  await store.save(settings, true); store.assign('smart', 'deepseek');
  const revision = store.snapshot().connections[0].revision;
  await store.testConnection('deepseek', revision);
  await assert.rejects(store.testConnection('deepseek', 'old-revision'), { code: 'AI_CONFIGURATION_CHANGED' });
  unavailable = true;
  await assert.rejects(store.testConnection('deepseek', revision), { code: 'AI_REQUEST_FAILED' });
  const snapshot = store.snapshot();
  assert.equal(snapshot.connections[0].lastError, 'AI_REQUEST_FAILED');
  assert.equal(snapshot.assignments.smart, 'deepseek');
  assert.ok(!JSON.stringify(snapshot).includes(settings.apiKey));
});

test('three independent failing reviews pause every running battle and block late decisions', async () => {
  const f = fixture(), events = []; let release, pendingStarted;
  const pending = new Promise(resolve => { pendingStarted = resolve; });
  const slow = new Promise(resolve => { release = resolve; });
  const provider = { describe: () => ({ mode: 'deepseek' }), decide: async (input, options) => {
    if (input.policy.agent_id === 'slow') { pendingStarted(); await slow; return f.decisionProvider.decide(input); }
    await pending;
    options.onConnectionFailure(networkError());
    throw networkError();
  } };
  const manager = createSimulationBattles({ ...f, decisionProvider: provider, leaseEnabled: false, pauseOnRestore: true });
  const first = manager.create('first', { agents: ['slow', 'a', 'b'].map(id => ({ ...f.policy, id })) });
  const second = manager.create('second', { agents: [{ ...f.policy, id: 'c' }] });
  manager.subscribe(event => { events.push(event); if (event.reason === 'ai-connection-outage') release(); });
  await manager.tick(); f.setTime(f.slot); await manager.tick();
  for (const id of [first.id, second.id]) {
    const snap = manager.snapshot(id);
    assert.equal(snap.enabled, false); assert.equal(snap.endReason, 'AI_CONNECTION_OUTAGE');
    assert.ok(snap.aiConnectionFailure.id);
    assert.ok(snap.agents.every(a => a.orders.length === 0 && a.cash === 100));
  }
  assert.equal(events.filter(e => e.reason === 'ai-connection-outage' && e.battleId === '*').length, 1);
});

test('retry attempts of one review are not counted as a widespread outage', async () => {
  const f = fixture();
  const provider = { describe: () => ({ mode: 'deepseek' }), decide: async (input, options) => {
    if (input.policy.agent_id === 'bad') {
      for (let i = 0; i < 3; i++) options.onConnectionFailure(networkError());
      throw networkError();
    }
    return skip(input);
  } };
  const manager = createSimulationBattles({ ...f, decisionProvider: provider, leaseEnabled: false, pauseOnRestore: true });
  const battle = manager.create('isolated', { agents: ['bad', 'good', 'good2'].map(id => ({ ...f.policy, id })) });
  await manager.tick(); f.setTime(f.slot); await manager.tick();
  assert.equal(manager.snapshot(battle.id).enabled, true);
  assert.equal(manager.snapshot(battle.id).aiConnectionFailure, null);
});
