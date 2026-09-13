const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { atomicWriteJson } = require('./atomic-json');
const { profiles } = require('./public/strategy-catalog');
const { assertDecisionInputs, decisionPrompt, createMockDecisionProvider, DECISION_META } = require('./ai-decision');

const fail = (code, statusCode = 422) => Object.assign(new Error(code), { code, statusCode });
const providers = new Set(['openai', 'anthropic', 'deepseek', 'custom']);
const token = n => Number.isSafeInteger(n) && n >= 0 ? n : null;
function usageOf(payload, provider) {
  const u = payload?.usage;
  if (!u) return null;
  const output = token(provider === 'anthropic' ? u.output_tokens : u.completion_tokens);
  let input = token(provider === 'anthropic' ? u.input_tokens : u.prompt_tokens);
  const cached = token(provider === 'anthropic' ? u.cache_read_input_tokens ?? 0 : u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0);
  const cacheWrite = token(provider === 'anthropic' ? u.cache_creation_input_tokens ?? 0 : 0);
  if ([input, output, cached, cacheWrite].includes(null)) return null;
  if (provider === 'anthropic') input += cached + cacheWrite;
  if (cached + cacheWrite > input) return null;
  return { input, output, cached, cacheWrite, total: input + output };
}
function createAiConnections({ file, fetchImpl = fetch, now = Date.now, fallback = createMockDecisionProvider() } = {}) {
  let state = file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { version: 1, connections: {}, assignments: {}, usage: {}, recent: [] };
  if (state.version !== 1 || !state.connections || !state.assignments || !state.usage || !Array.isArray(state.recent)) throw fail('AI_STORE_INVALID', 503);
  let memoryKey, broken = false;
  const busy = new Set();
  function key() {
    if (memoryKey) return memoryKey;
    if (!file) return memoryKey = crypto.randomBytes(32);
    const target = `${file}.key`;
    if (fs.existsSync(target)) {
      memoryKey = fs.readFileSync(target);
      if (memoryKey.length !== 32) throw fail('AI_VAULT_UNAVAILABLE', 503);
      return memoryKey;
    }
    if (Object.keys(state.connections).length) throw fail('AI_VAULT_UNAVAILABLE', 503);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    memoryKey = crypto.randomBytes(32);
    fs.writeFileSync(target, memoryKey, { mode: 0o600, flag: 'wx' });
    return memoryKey;
  }
  function seal(secret) {
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
    const bytes = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: bytes.toString('base64') };
  }
  function unseal(secret) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(secret.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(secret.tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(secret.data, 'base64')), decipher.final()]).toString('utf8');
    } catch { throw fail('AI_VAULT_UNAVAILABLE', 503); }
  }
  function commit(next) {
    if (broken) throw fail('AI_STORAGE_FAILED', 503);
    try { if (file) atomicWriteJson(file, next); state = next; }
    catch { broken = true; throw fail('AI_STORAGE_FAILED', 503); }
  }
  function candidate(body) {
    if (!body || !providers.has(body.provider)) throw fail('AI_PROVIDER_INVALID');
    const id = body.provider, old = state.connections[id];
    let url;
    try { url = new URL(body.baseUrl); } catch { throw fail('AI_URL_INVALID'); }
    if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol) ||
        (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw fail('AI_URL_INVALID');
    const model = typeof body.model === 'string' ? body.model.trim() : '';
    if (!model || model.length > 160 || /[\x00-\x1f]/.test(model)) throw fail('AI_MODEL_INVALID');
    const baseUrl = url.href.replace(/\/+$/, '');
    const raw = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    if (raw.length > 4096) throw fail('AI_KEY_INVALID');
    // Never forward an existing credential to a changed endpoint without a re-entered key.
    if (!raw && (!old || old.baseUrl !== baseUrl)) throw fail('AI_KEY_REQUIRED');
    const same = old && old.baseUrl === baseUrl && old.model === model && (!raw || raw === unseal(old.secret));
    return { id, provider: body.provider, baseUrl, model, secret: raw ? seal(raw) : old.secret,
      revision: same ? old.revision : crypto.randomUUID(), testedAt: same ? old.testedAt : null,
      updatedAt: now(), lastError: same ? old.lastError : null };
  }
  const engine = c => ({ mode: c.provider, provider: c.provider, model: c.model, connectionId: c.id, configured: Boolean(c.testedAt), simulated: false });
  const connectionFor = input => input.policy.ai_connection_id ?? state.assignments[input.policy.strategy];
  function describeFor(input) {
    const id = connectionFor(input);
    if (id === 'none') return createMockDecisionProvider().describe();
    if (id === undefined) return fallback.describe();
    const c = state.connections[id];
    return c ? engine(c) : { mode: 'unavailable', connectionId: id, configured: false, simulated: false };
  }
  function snapshot() {
    return structuredClone({ connections: Object.values(state.connections).map(({ secret, ...c }) => ({ ...c, tested: Boolean(c.testedAt) })),
      assignments: state.assignments, usage: state.usage, recent: state.recent.slice(-30).reverse(), storageFailed: broken,
      defaultEngine: fallback.describe() });
  }
  function accountCall(c, strategy, kind, startedAt, payload, error) {
    const usage = usageOf(payload, c.provider);
    const next = structuredClone(state);
    const aggregate = next.usage[c.id] ||= { calls: 0, errors: 0, tests: 0, input: 0, output: 0, cached: 0, total: 0, missingUsageCalls: 0 };
    aggregate.calls++; aggregate.errors += Boolean(error); aggregate.tests += kind === 'test';
    if (usage) for (const k of ['input', 'output', 'cached', 'total']) aggregate[k] += usage[k];
    else aggregate.missingUsageCalls++;
    const event = { id: crypto.randomUUID(), connectionId: c.id, model: c.model, strategy, kind, at: now(), durationMs: now() - startedAt,
      usage, error: error || null };
    aggregate.last = event;
    next.recent = [...next.recent, event].slice(-200);
    commit(next);
    return event;
  }
  async function invoke(c, prompt, input, options = {}, kind = 'decision') {
    if (broken) throw fail('AI_STORAGE_FAILED', 503);
    const started = now(), budget = Math.floor(Math.min(kind === 'test' ? 15000 : 8000, (options.deadlineMs ?? Infinity) - (options.now || now)() - 250));
    if (budget <= 0 || options.isCancelled?.()) throw Object.assign(fail('AI_DEADLINE_EXPIRED'), { requestStarted: false });
    const secret = unseal(c.secret);
    const isClaude = c.provider === 'anthropic', isOpenai = c.provider === 'openai';
    const body = isClaude
      ? { model: c.model, max_tokens: 1500, system: prompt, messages: [{ role: 'user', content: JSON.stringify(input) }] }
      : { model: c.model, messages: [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify(input) }],
        response_format: { type: 'json_object' }, ...(isOpenai ? { max_completion_tokens: 4096 } : { max_tokens: 1500 }),
        ...(c.provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}) };
    let payload, raw, failure;
    try {
      const response = await fetchImpl(`${c.baseUrl}/${isClaude ? 'messages' : 'chat/completions'}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(budget),
        headers: isClaude ? { 'content-type': 'application/json', 'x-api-key': secret, 'anthropic-version': '2023-06-01' }
          : { 'content-type': 'application/json', authorization: `Bearer ${secret}` }, body: JSON.stringify(body),
      });
      if (!response.ok) throw fail(response.status === 401 || response.status === 403 ? 'AI_AUTH_FAILED' : response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_REQUEST_REJECTED', 503);
      payload = await response.json();
      if (payload.stop_reason === 'max_tokens' || payload.choices?.[0]?.finish_reason === 'length') throw fail('AI_RESPONSE_TRUNCATED');
      const content = isClaude ? payload.content?.filter(v => v.type === 'text').map(v => v.text).join('') : payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw fail('AI_RESPONSE_INVALID');
      try { raw = JSON.parse(content); } catch { throw fail('AI_RESPONSE_INVALID'); }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw fail('AI_RESPONSE_INVALID');
      if (kind === 'test' && (raw.round_id !== input.market.round_id || raw.action !== 'SKIP' || raw.direction !== null || raw.stake_usdt !== 0 || raw.stake_pct !== 0 || raw.risk_mode !== 'WAIT' || raw.data_fresh !== true || !Number.isFinite(raw.confidence) || raw.confidence < 0 || raw.confidence > 100 || typeof raw.reason !== 'string' || !Array.isArray(raw.factors) || !Array.isArray(raw.warnings))) throw fail('AI_TEST_DECISION_INVALID');
    } catch (e) { failure = e.code?.startsWith?.('AI_') ? e : fail(e.name === 'TimeoutError' || e.name === 'AbortError' ? 'AI_REQUEST_TIMEOUT' : 'AI_REQUEST_FAILED', 503); }
    const event = accountCall(c, input.policy?.strategy || null, kind, started, payload, failure?.code);
    if (failure) throw failure;
    Object.defineProperty(raw, DECISION_META, { value: { engine: engine(c), usage: event } });
    return raw;
  }
  async function save(body, test = false) {
    if (busy.has(body?.provider)) throw fail('AI_CONNECTION_BUSY', 409);
    const c = candidate(body);
    busy.add(c.id);
    try {
      // Persist untested credentials first. A failed replacement never inherits test success.
      if (test) c.testedAt = null;
      commit({ ...state, connections: { ...state.connections, [c.id]: c } });
      if (test) {
        const input = { market: { round_id: 'connection-test' }, policy: { strategy: 'connection-test' } };
        try {
          await invoke(c, 'This is a paper decision connection test, not a trade. Return only this JSON object: {"round_id":"connection-test","action":"SKIP","direction":null,"stake_usdt":0,"stake_pct":0,"confidence":0,"risk_mode":"WAIT","factors":[],"reason":"connection test","data_fresh":true,"warnings":[]}', input, {}, 'test');
          c.testedAt = now(); c.lastError = null;
        } catch (e) { c.lastError = e.code; throw e; }
        finally { commit({ ...state, connections: { ...state.connections, [c.id]: c } }); }
      }
      return snapshot();
    } finally { busy.delete(c.id); }
  }
  function assign(strategy, connectionId) {
    if (!Object.hasOwn(profiles, strategy)) throw fail('AI_STRATEGY_INVALID');
    if (connectionId !== 'none' && !state.connections[connectionId]?.testedAt) throw fail('AI_CONNECTION_NOT_TESTED', 409);
    commit({ ...state, assignments: { ...state.assignments, [strategy]: connectionId },
      assignmentVersions: { ...state.assignmentVersions, [strategy]: crypto.randomUUID() } });
    return snapshot();
  }
  function remove(id) {
    if (!providers.has(id)) throw fail('AI_PROVIDER_INVALID');
    if (busy.has(id)) throw fail('AI_CONNECTION_BUSY', 409);
    const next = structuredClone(state); delete next.connections[id];
    // Keep assignments: missing credentials must stop these decisions, never silently use rules.
    commit(next); return snapshot();
  }
  const router = {
    describe: () => Object.values(state.assignments).some(id => id !== 'none') ? { mode: 'routed', provider: 'Strategy assignments', configured: true, simulated: false } : fallback.describe(),
    describeFor,
    async decide(input, options = {}) {
      const id = connectionFor(input);
      if (id === undefined) return fallback.decide(input, options);
      if (id === 'none') return createMockDecisionProvider().decide(input, options);
      const c = state.connections[id];
      const version = state.assignmentVersions?.[input.policy.strategy];
      if (!c?.testedAt) throw fail('AI_CONNECTION_NOT_TESTED', 503);
      if(input.policy.ai_connection_revision && input.policy.ai_connection_revision!==c.revision) throw fail('AI_CONFIGURATION_CHANGED');
      assertDecisionInputs(input);
      const raw = await invoke(c, decisionPrompt(input), input, options);
      if (options.isCancelled?.() || (input.policy.ai_connection_id===undefined && state.assignmentVersions?.[input.policy.strategy] !== version) || connectionFor(input) !== id || state.connections[id]?.revision !== c.revision || !state.connections[id]?.testedAt) throw fail('AI_CONFIGURATION_CHANGED');
      return raw;
    },
  };
  function assertAgents(agents = []) {
    if(!Array.isArray(agents))throw fail('INVALID_BATTLE_AGENTS');
    for(const a of agents) {
      if(a.aiConnectionId===undefined||a.aiConnectionId==='none')continue;
      const c=state.connections[a.aiConnectionId];
      if(!c?.testedAt)throw fail('AI_CONNECTION_NOT_TESTED',409);
      if(a.aiConnectionRevision!==c.revision)throw fail('AI_CONFIGURATION_CHANGED',409);
    }
  }
  return { snapshot, save, assign, remove, router, assertAgents };
}
module.exports = { createAiConnections, usageOf };
