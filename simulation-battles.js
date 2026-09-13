const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PERIODS, createPredictionSimulation } = require('./prediction-sim');
const { normalizeAgentPolicies, normalizePolicy } = require('./ai-decision');

const { supportsAsset } = require('./public/strategy-catalog');
const MAX_AGENTS = 8;
const MAX_AI_DECISION_CONCURRENCY = 4;
const MAX_ROUNDS = 1000;
const DEFAULT_AGENT_IDS = ['A', 'B', 'C'];

function asMoney(value, fallback = 100) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0.01, Math.min(100000, Math.round(number * 100) / 100)) : fallback;
}

function limitExternalDecisionProvider(provider, limit = MAX_AI_DECISION_CONCURRENCY) {
  const mode=provider?.describe?.()?.mode;
  if(!provider?.decide)return provider;
  let active=0;
  const queue=[];
  const pump=()=>{
    while(active<limit&&queue.length){
      const job=queue.shift();active++;
      Promise.resolve().then(()=>{
        if(job.options?.isCancelled?.() || (job.options?.deadlineMs != null && (job.options.now || Date.now)() >= job.options.deadlineMs)) throw Object.assign(new Error('AI_DEADLINE_EXPIRED'),{code:'AI_DEADLINE_EXPIRED',requestStarted:false});
        return provider.decide(job.input,job.options);
      }).then(job.resolve,job.reject).finally(()=>{active--;pump();});
    }
  };
  return {
    describe:()=>{const info=provider.describe();return ['mock','off','offline','legacy'].includes(info.mode)?info:{...info,maxConcurrentRequests:limit};},
    describeFor: input => provider.describeFor?.(input) || provider.describe(),
    decide:(input,options)=> {
      const current=provider.describeFor?.(input)||provider.describe();
      if(['mock','off','offline','legacy'].includes(current.mode))return provider.decide(input,options);
      return new Promise((resolve,reject)=>{queue.push({input,options,resolve,reject});pump();});
    },
  };
}

function normalizeBattleConfig(value = {}, currentPolicies = normalizeAgentPolicies()) {
  const rawAgents = Array.isArray(value.agents) && value.agents.length
    ? value.agents
    : DEFAULT_AGENT_IDS.map(id => currentPolicies[id]);
  if (Object.hasOwn(value, 'agents') && (!Array.isArray(value.agents) || !value.agents.length || value.agents.length > MAX_AGENTS)) throw Object.assign(new Error('INVALID_BATTLE_AGENTS'), { statusCode: 400 });
  const amount = value.initialBalance ?? value.budget;
  if (amount !== undefined && (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1 || amount > 1000)) throw Object.assign(new Error('INVALID_BATTLE_BUDGET'), { statusCode: 400 });
  if (new Set(rawAgents.map(agent => agent?.coin || 'BTC')).size > 1) throw Object.assign(new Error('MIXED_BATTLE_ASSETS'), { statusCode: 400 });
  const seen = new Set();
  const agents = rawAgents.slice(0, MAX_AGENTS).map((agent, index) => {
    let id = String(agent?.id || DEFAULT_AGENT_IDS[index] || `agent-${index + 1}`).trim().slice(0, 60);
    if (!id || seen.has(id)) id = `agent-${index + 1}`;
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const normalized = normalizePolicy({ ...agent, id }, id);
    if(!supportsAsset(normalized.strategy,normalized.coin))throw Object.assign(new Error('CHARACTER_ASSET_UNSUPPORTED'),{code:'CHARACTER_ASSET_UNSUPPORTED',statusCode:400});
    return {
      ...normalized,
      id,
      name: String(agent?.name || normalized.name).trim().slice(0, 18) || `AI ${index + 1}`,
      coin: ['BTC', 'ETH', 'BNB'].includes(agent?.coin) ? agent.coin : 'BTC',
    };
  });
  const configuredRounds = value.rounds ?? value.maxRounds;
  if (configuredRounds != null && configuredRounds !== 'until-loss' && configuredRounds !== '' && (!Number.isInteger(configuredRounds) || configuredRounds < 1 || configuredRounds > MAX_ROUNDS)) throw Object.assign(new Error('INVALID_BATTLE_ROUNDS'), { statusCode: 400 });
  const rounds = configuredRounds === 'until-loss' || configuredRounds == null || configuredRounds === ''
    ? null
    : Math.max(1, Math.min(MAX_ROUNDS, Math.floor(Number(configuredRounds)) || 1));
  const emotionLevel = value.emotionLevel ?? 0;
  if (typeof emotionLevel !== 'number' || !Number.isInteger(emotionLevel) || emotionLevel < 0 || emotionLevel > 100) throw Object.assign(new Error('INVALID_BATTLE_EMOTION'), { statusCode: 400, code: 'INVALID_BATTLE_EMOTION' });
  const actionUrgeLevel = value.actionUrgeLevel ?? 0;
  if (typeof actionUrgeLevel !== 'number' || !Number.isInteger(actionUrgeLevel) || actionUrgeLevel < 0 || actionUrgeLevel > 100) throw Object.assign(new Error('INVALID_BATTLE_ACTION_URGE'), { statusCode: 400, code: 'INVALID_BATTLE_ACTION_URGE' });
  const realtimeEntry = value.realtimeEntry ?? false;
  if (typeof realtimeEntry !== 'boolean') throw Object.assign(new Error('INVALID_REALTIME_ENTRY'), { statusCode: 400, code: 'INVALID_REALTIME_ENTRY' });
  const period = String(value.period || '5m').toLowerCase();
  if (!Object.hasOwn(PERIODS, period)) throw Object.assign(new Error('INVALID_BATTLE_PERIOD'), { statusCode: 400, code: 'INVALID_BATTLE_PERIOD' });
  return {
    initialBalance: asMoney(value.initialBalance ?? value.budget, 100),
    rounds,
    market: 'Binance Prediction',
    asset: `${agents[0].coin}USDT`,
    period,
    roundMs: PERIODS[period],
    emotionLevel,
    actionUrgeLevel,
    realtimeEntry,
    agents,
  };
}

function createSimulationBattles({ source, indicatorSource, decisionProvider, file, now = Date.now, leaseEnabled = true, pauseOnRestore = false, pauseOnError = false }) {
  const sharedDecisionProvider=limitExternalDecisionProvider(decisionProvider);
  const registryFile = file && path.join(path.dirname(file), 'simulation-battles.json');
  const strategyFile = file && path.join(path.dirname(file), 'simulation-strategies.json');
  let policies = normalizeAgentPolicies();
  if (strategyFile && fs.existsSync(strategyFile)) {
    const saved = JSON.parse(fs.readFileSync(strategyFile, 'utf8'));
    if (saved.version !== 1) throw new Error('INVALID_SIMULATION_STRATEGIES');
    policies = normalizeAgentPolicies(saved.agents);
  }

  let records = [{ id: 'default', name: 'A / B / C', createdAt: null, config: normalizeBattleConfig({}, policies) }];
  if (registryFile && fs.existsSync(registryFile)) {
    const data = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
    if (data.version !== 1 || !Array.isArray(data.battles) || data.battles[0]?.id !== 'default' ||
      new Set(data.battles.map(b => b.id)).size !== data.battles.length ||
      data.battles.some(b => !/^(default|[a-f0-9-]{36})$/.test(b.id) || typeof b.name !== 'string')) throw new Error('INVALID_BATTLE_REGISTRY');
    records = data.battles.map(record => ({ ...record, config: normalizeBattleConfig(record.config, policies) }));
  }

  const pending = new Map();
  const listeners = new Set();
  function emitChange(change) {
    const event = { type: 'simulation', observedAt: now(), ...change };
    for (const listener of listeners) { try { listener(event); } catch {} }
  }
  const shared = Object.fromEntries(['marketFor', 'detail', 'book'].map(method => [method, (...args) => {
    const key = JSON.stringify([method, args]);
    if (!pending.has(key)) pending.set(key, Promise.resolve().then(() => source[method](...args)).finally(() => pending.delete(key)));
    return pending.get(key);
  }]));
  // Quotes belong to individual intents, even when Agents choose the same side.
  for (const method of ['quote', 'refreshMarket', 'describe']) {
    if (typeof source[method] === 'function') shared[method] = (...args) => source[method](...args);
  }
  const ledgerFile = id => !file ? undefined : id === 'default' ? file : path.join(path.dirname(file), `battle-${id}.json`);
  if (file && records.some(b => b.id !== 'default' && !fs.existsSync(ledgerFile(b.id)))) throw new Error('BATTLE_LEDGER_MISSING');
  const makeSimulation = record => {
    const config = normalizeBattleConfig(record.config, policies);
    const policyMap = new Map(config.agents.map(agent => [agent.id, agent]));
    return createPredictionSimulation({ source: shared, indicatorSource, decisionProvider:sharedDecisionProvider,
      policyFor: id => policyMap.get(id), agentPolicies: config.agents,
      initialBalance: config.initialBalance, maxRounds: config.rounds, asset: config.asset, period: config.period, emotionLevel: config.emotionLevel, actionUrgeLevel: config.actionUrgeLevel, realtimeEntry: config.realtimeEntry,
      file: ledgerFile(record.id), now, leaseEnabled, pauseOnRestore, pauseOnError, enabled: record.id !== 'default' || (!leaseEnabled && !pauseOnRestore),
      onChange: change => emitChange({ battleId: record.id, ...change }) });
  };
  const simulations = new Map(records.map(record => [record.id, makeSimulation(record)]));
  let resetting = false;
  const activeTicks = new Map();
  function assertReady() { if (resetting) throw Object.assign(new Error('RESET_IN_PROGRESS'), { statusCode: 409 }); }

  function get(id = 'default') {
    const sim = simulations.get(id);
    if (!sim) throw Object.assign(new Error('Battle not found'), { statusCode: 404, code: 'BATTLE_NOT_FOUND' });
    return sim;
  }
  function snapshot(id = 'default') {
    const record = records.find(battle => battle.id === id);
    return { ...get(id).snapshot(), id: record.id, name: record.name, createdAt: record.createdAt, placeholder: Boolean(record.placeholder) };
  }
  function liveSnapshot(id = 'default') {
    const record = records.find(battle => battle.id === id);
    return { ...get(id).liveSnapshot(), id: record.id, name: record.name, createdAt: record.createdAt, placeholder: Boolean(record.placeholder), view: 'live' };
  }
  function summary(id = 'default') {
    const record = records.find(battle => battle.id === id);
    return { ...get(id).summary(), id: record.id, name: record.name, createdAt: record.createdAt, placeholder: Boolean(record.placeholder), view: 'summary' };
  }
  function list() { return records.map(record => snapshot(record.id)); }
  function summaries() { return records.map(record => summary(record.id)); }
  function create(name, config = {}, clientId = null) {
    assertReady();
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 40) throw Object.assign(new Error('Name must contain 1–40 characters'), { statusCode: 400 });
    const record = { id: crypto.randomUUID(), name: name.trim(), createdAt: now(), config: normalizeBattleConfig(config, policies), ownerClientId: clientId || null };
    const sim = makeSimulation(record);
    sim.setEnabled(true);
    const next = [...records, record];
    if (registryFile) {
      fs.mkdirSync(path.dirname(registryFile), { recursive: true });
      fs.writeFileSync(`${registryFile}.tmp`, JSON.stringify({ version: 1, battles: next }), { mode: 0o600 });
      fs.renameSync(`${registryFile}.tmp`, registryFile);
    }
    records = next;
    simulations.set(record.id, sim);
    return snapshot(record.id);
  }
  function leaderboard(battles = summaries()) {
    return battles.filter(battle => !battle.placeholder).flatMap(battle => battle.agents.map(agent => ({
      battleId: battle.id, battleName: battle.name, agentId: agent.id, equity: agent.equity,
      profit: agent.equity - battle.config.initialBalance - (agent.addedCapital||0),
      returnRate: (agent.equity - battle.config.initialBalance - (agent.addedCapital||0)) / (battle.config.initialBalance+(agent.addedCapital||0)),
      wins: agent.wins, losses: agent.losses, winRate: agent.winRate,
    }))).sort((a, b) => b.profit - a.profit || (b.winRate ?? -1) - (a.winRate ?? -1) || a.battleId.localeCompare(b.battleId) || a.agentId.localeCompare(b.agentId));
  }
  function getStrategies() { return structuredClone({ agents: DEFAULT_AGENT_IDS.map(id => policies[id]) }); }
  function setStrategies(value) {
    policies = normalizeAgentPolicies(value);
    if (strategyFile) {
      fs.mkdirSync(path.dirname(strategyFile), { recursive: true });
      fs.writeFileSync(`${strategyFile}.tmp`, JSON.stringify({ version: 1, agents: DEFAULT_AGENT_IDS.map(id => policies[id]) }), { mode: 0o600 });
      fs.renameSync(`${strategyFile}.tmp`, strategyFile);
    }
    return getStrategies();
  }
  function touch(id = 'default') { assertReady(); return get(id).touch(); }
  function topUp(id,agentId,amount,requestId){
    assertReady();
    if(records.find(record=>record.id===id)?.placeholder)throw Object.assign(new Error('CREATE_BATTLE_FIRST'),{code:'CREATE_BATTLE_FIRST'});
    get(id).topUp(agentId,amount,requestId);return snapshot(id);
  }
  function setEnabled(value, id = 'default') { assertReady(); if (value && records.find(r => r.id === id)?.placeholder) throw Object.assign(new Error('CREATE_BATTLE_FIRST'), { statusCode: 409 }); get(id).setEnabled(value); return snapshot(id); }
  function setEmotion(value, id = 'default') {
    assertReady();
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) throw Object.assign(new Error('INVALID_BATTLE_EMOTION'), { statusCode: 400, code: 'INVALID_BATTLE_EMOTION' });
    const record=records.find(item=>item.id===id);
    if (record?.placeholder) throw Object.assign(new Error('CREATE_BATTLE_FIRST'), { statusCode: 409, code: 'CREATE_BATTLE_FIRST' });
    const sim=get(id),current=sim.snapshot();
    if (['ended','settling'].includes(current.status)) throw Object.assign(new Error('BATTLE_ENDED'), { statusCode: 409, code: 'BATTLE_ENDED' });
    sim.setEmotionLevel(value);
    return snapshot(id);
  }
  function setActionUrge(value, id = 'default') {
    assertReady();
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) throw Object.assign(new Error('INVALID_BATTLE_ACTION_URGE'), { statusCode: 400, code: 'INVALID_BATTLE_ACTION_URGE' });
    const record=records.find(item=>item.id===id);
    if (record?.placeholder) throw Object.assign(new Error('CREATE_BATTLE_FIRST'), { statusCode: 409, code: 'CREATE_BATTLE_FIRST' });
    const sim=get(id),current=sim.snapshot();
    if (['ended','settling'].includes(current.status)) throw Object.assign(new Error('BATTLE_ENDED'), { statusCode: 409, code: 'BATTLE_ENDED' });
    sim.setActionUrgeLevel(value);
    return snapshot(id);
  }
  function end(id = 'default', reason = 'MANUAL') { assertReady(); get(id).end(reason); return snapshot(id); }
  function setRealtimeEntry(value, id = 'default') {
    assertReady();
    if (typeof value !== 'boolean') throw Object.assign(new Error('INVALID_REALTIME_ENTRY'), {statusCode:400,code:'INVALID_REALTIME_ENTRY'});
    if (records.find(record => record.id === id)?.placeholder) throw Object.assign(new Error('CREATE_BATTLE_FIRST'), {statusCode:409,code:'CREATE_BATTLE_FIRST'});
    get(id).setRealtimeEntry(value);
    return snapshot(id);
  }
  async function remove(id) {
    assertReady();
    const target = records.find(record => record.id === id);
    if (!target || target.placeholder) throw Object.assign(new Error('BATTLE_NOT_FOUND'), { statusCode: 404, code: 'BATTLE_NOT_FOUND' });
    resetting = true;
    let archive, movedDefault = false;
    try {
      await Promise.allSettled([...activeTicks.values()]);
      if (get(id).snapshot().agents.some(agent => agent.orders.some(order => order.status === 'OPEN'))) {
        throw Object.assign(new Error('BATTLE_HAS_PENDING_ORDERS'), { statusCode: 409, code: 'BATTLE_HAS_PENDING_ORDERS' });
      }
      const placeholder = { id: 'default', name: '', placeholder: true, createdAt: null, config: normalizeBattleConfig({}, policies) };
      const next = id === 'default' ? [placeholder, ...records.slice(1)] : records.filter(record => record.id !== id);
      if (file) {
        archive = path.join(path.dirname(file), 'simulation-archives', crypto.randomUUID());
        fs.mkdirSync(archive, { recursive: true });
        fs.writeFileSync(path.join(archive, 'deleted-battle.json'), JSON.stringify({ version: 1, battle: target, snapshot: snapshot(id) }), { mode: 0o600 });
        const ledger = ledgerFile(id);
        if (fs.existsSync(ledger)) fs.copyFileSync(ledger, path.join(archive, path.basename(ledger)));
        if (id === 'default' && fs.existsSync(file)) { fs.renameSync(file, path.join(archive, 'original-default.json')); movedDefault = true; }
      }
      const fresh = id === 'default' ? makeSimulation(placeholder) : null;
      if (fresh) fresh.setEnabled(false);
      if (registryFile) {
        fs.writeFileSync(`${registryFile}.tmp`, JSON.stringify({ version: 1, battles: next }), { mode: 0o600 });
        fs.renameSync(`${registryFile}.tmp`, registryFile);
      }
      records = next; simulations.delete(id);
      if (fresh) simulations.set('default', fresh);
      emitChange({ battleId: id, reason: 'battle-deleted', deleted: true });
      return { battles: list(), leaderboard: leaderboard() };
    } catch (error) {
      if (movedDefault) fs.copyFileSync(path.join(archive, 'original-default.json'), file);
      throw error;
    } finally { resetting = false; }
  }
  async function reset() {
    assertReady();
    resetting = true;
    let archive, movedDefault = false;
    try {
      // Let any in-flight settlement finish before archiving its final ledger.
      await Promise.allSettled([...activeTicks.values()]);
      const next = [{ id: 'default', name: '', placeholder: true, createdAt: null, config: normalizeBattleConfig({}, policies) }];
      if (file) {
        archive = path.join(path.dirname(file), 'simulation-archives', crypto.randomUUID());
        fs.mkdirSync(archive, { recursive: true });
        fs.writeFileSync(path.join(archive, 'simulation-battles.json'), JSON.stringify({ version: 1, battles: records }), { mode: 0o600 });
        for (const record of records) {
          const ledger = ledgerFile(record.id);
          if (fs.existsSync(ledger)) fs.copyFileSync(ledger, path.join(archive, path.basename(ledger)));
        }
        // Only the known default ledger is replaced; all old records remain recoverable.
        if (fs.existsSync(file)) { fs.renameSync(file, path.join(archive, 'original-default.json')); movedDefault = true; }
      }
      const fresh = makeSimulation(next[0]);
      fresh.setEnabled(false);
      if (registryFile) {
        fs.writeFileSync(`${registryFile}.tmp`, JSON.stringify({ version: 1, battles: next }), { mode: 0o600 });
        fs.renameSync(`${registryFile}.tmp`, registryFile);
      }
      records = next;
      simulations.clear();
      simulations.set('default', fresh);
      emitChange({ battleId: '*', reason: 'battles-reset' });
      return snapshot('default');
    } catch (error) {
      if (movedDefault) fs.copyFileSync(path.join(archive, 'original-default.json'), file);
      throw error;
    } finally { resetting = false; }
  }
  return { snapshot, liveSnapshot, summary, list, summaries, create, leaderboard, getStrategies, setStrategies, touch, topUp, setEnabled, setEmotion, setActionUrge, setRealtimeEntry, end,
    marketFailure(id, code) { assertReady(); get(id).marketFailure(code); },
    retryConnection(id = 'default') { assertReady(); get(id).retryConnection(); return snapshot(id); },
    reset, remove,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async tick() {
      if (resetting) return;
      const started = [];
      for (const [id, sim] of simulations) {
        if (activeTicks.has(id)) continue;
        const task = Promise.resolve().then(() => sim.tick()).finally(() => activeTicks.delete(id));
        activeTicks.set(id, task); started.push(task);
      }
      await Promise.allSettled(started);
    } };
}

module.exports = { MAX_AGENTS, MAX_AI_DECISION_CONCURRENCY, createSimulationBattles, normalizeBattleConfig, limitExternalDecisionProvider };
