(() => {
  const params = new URLSearchParams(location.search);
  const nativeRuntime = Boolean(window.Capacitor?.isNativePlatform?.());
  const useOfflineRuntime = nativeRuntime || location.protocol === 'file:' || params.get('offline') === '1';
  const offline = useOfflineRuntime
    ? window.WarriorOfflineSimulation?.createOfflineSimulation({ storage: window.localStorage })
    : null;
  const clientId = (() => {
    try {
      const key = 'warrior-client-session';
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;
      const next = globalThis.crypto?.randomUUID?.() || `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(key, next);
      return next;
    } catch { return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  })();

  async function request(url, options = {}) {
    const { timeoutMs = 5000, ...fetchOptions } = options;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options.signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([options.signal, timeoutSignal])
      : options.signal || timeoutSignal;
    const response = await fetch(url, {
      ...fetchOptions,
      headers: options.body
        ? { 'content-type': 'application/json', ...(options.headers || {}) }
        : options.headers,
      signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.code = payload.code;
      throw error;
    }
    return payload;
  }

  async function ensureStrategySupport(configOrAgents = []) {
    const config = Array.isArray(configOrAgents) ? {} : (configOrAgents || {});
    const agents = Array.isArray(configOrAgents) ? configOrAgents : (config.agents || []);
    const catalog = window.WarriorStrategyCatalog;
    const extended = agents.some(agent => !['aggressive','smart','conservative'].includes(agent.strategy) || (agent.indicators || []).some(key=>!catalog.defaultIndicators.includes(key)));
    const { capabilities } = await request('/api/simulation/strategies');
    if (agents.some(a=>a.aiConnectionId!==undefined) && capabilities?.aiPerBattleModels!==true) throw Object.assign(new Error('本局模型设置需要重启本机服务后使用。'),{code:'STRATEGY_SERVICE_UPGRADE_REQUIRED'});
    if (config.realtimeEntry === true && capabilities?.realtimeEntry !== true) throw Object.assign(new Error('实时进场需要重启本机服务后使用。'), {code:'STRATEGY_SERVICE_UPGRADE_REQUIRED'});
    const missingFeature = agents.some(agent=>!capabilities?.strategies?.includes(agent.strategy) || (agent.indicators || []).some(key=>!capabilities?.indicators?.includes(key)));
    const missingMarket = config.period && (!capabilities?.periods?.includes(config.period) || !capabilities?.assets?.includes(agents[0]?.coin));
    if (capabilities?.version < 8 || capabilities?.actionUrge !== true || capabilities?.battleActionUrge !== true || capabilities?.priceActionCandles !== true || missingFeature || missingMarket) {
      throw Object.assign(new Error(extended?'新增指标与策略需要重启本机服务后使用。':'新玩法需要重启本机服务后使用。'), {code:'STRATEGY_SERVICE_UPGRADE_REQUIRED'});
    }
  }
  const simulationApi = offline ? {
    mode: 'offline',
    list: async () => ({ battles: offline.list(), leaderboard: offline.leaderboard() }),
    snapshot: async battleId => offline.snapshot(battleId || 'default'),
    report: async battleId => offline.snapshot(battleId || 'default'),
    subscribe: () => () => {},
    create: async (name, config) => offline.create(name, config),
    setEnabled: async (battleId, enabled) => offline.setEnabled(battleId, enabled),
    topUp: async (battleId,agentId,amount,requestId)=>offline.topUp(battleId,agentId,amount,requestId),
    setEmotion: async (battleId, emotionLevel) => offline.setEmotion(battleId, emotionLevel),
    setActionUrge: async (battleId, actionUrgeLevel) => offline.setActionUrge(battleId, actionUrgeLevel),
    end: async (battleId, reason) => offline.end(battleId, reason),
    reset: async () => offline.reset(),
    remove: async battleId => offline.remove(battleId),
    release: battleId => offline.setEnabled(battleId, false),
    getStrategies: async () => offline.getStrategies(),
    strategies: async () => offline.getStrategies(),
    setStrategies: async agents => offline.setStrategies(agents),
    indicators: async symbol => offline.indicators(symbol),
  } : {
    mode: 'server',
    retryConnection: battleId => request('/api/simulation/retry', { method: 'POST', body: JSON.stringify({ battleId }) }),
    topUp: (battleId,agentId,amount,requestId)=>request('/api/simulation/top-up',{method:'POST',body:JSON.stringify({mode:'paper',battleId,agentId,amount,requestId})}),
    valuation: battleId => request(`/api/simulation/valuation?battleId=${encodeURIComponent(battleId || 'default')}`, { timeoutMs: 10000 }),
    list: (options = {}) => request('/api/simulation/battles?view=summary', options),
    remove: battleId => request('/api/simulation/delete', { method: 'POST', body: JSON.stringify({ battleId, confirmed: true }), timeoutMs: 120000 }),
    reset: () => request('/api/simulation/reset', { method: 'POST', body: JSON.stringify({ confirmed: true }), timeoutMs: 120000 }),
    snapshot: (battleId, options = {}) => request(`/api/simulation?battleId=${encodeURIComponent(battleId || 'default')}&clientId=${encodeURIComponent(clientId)}&view=live`, options),
    report: (battleId, options = {}) => request(`/api/simulation?battleId=${encodeURIComponent(battleId || 'default')}&view=full`, { timeoutMs: 15000, ...options }),
    subscribe(listener) {
      if (typeof EventSource !== 'function') return () => {};
      const stream = new EventSource('/api/simulation/events');
      stream.addEventListener('simulation', event => {
        try { listener(JSON.parse(event.data)); } catch {}
      });
      return () => stream.close();
    },
    create: async (name, config) => { await ensureStrategySupport(config); return request('/api/simulation/battles', {
      method: 'POST',
      body: JSON.stringify({ name, config, clientId }),
    }); },
    setEnabled: (battleId, enabled) => request('/api/simulation/control', {
      method: 'POST',
      body: JSON.stringify({ battleId, enabled, clientId }),
    }),
    setEmotion: (battleId, emotionLevel) => request('/api/simulation/emotion', {
      method: 'POST',
      body: JSON.stringify({ battleId, emotionLevel, clientId }),
    }),
    setActionUrge: (battleId, actionUrgeLevel) => request('/api/simulation/action-urge', {
      method: 'POST',
      body: JSON.stringify({ battleId, actionUrgeLevel, clientId }),
    }),
    setRealtimeEntry: (battleId, enabled) => request('/api/simulation/realtime-entry', {
      method: 'POST', body: JSON.stringify({ battleId, enabled }),
    }),
    end: (battleId, reason) => request('/api/simulation/end', {
      method: 'POST',
      body: JSON.stringify({ battleId, reason, clientId }),
    }),
    // Navigation never controls server-owned simulations.
    release: () => false,
    getStrategies: () => request('/api/simulation/strategies'),
    strategies: () => request('/api/simulation/strategies'),
    setStrategies: async agents => { await ensureStrategySupport(agents); return request('/api/simulation/strategies', {
      method: 'POST',
      body: JSON.stringify({ agents }),
    }); },
    indicators: (symbol = 'BTCUSDT') => request(`/api/market/indicators?symbol=${encodeURIComponent(symbol)}`),
  };

  window.Warrior = window.Warrior || {};
  simulationApi.clientId = clientId;
  if (!offline) {
    simulationApi.prices = symbol => request(`/api/market/prices?symbol=${encodeURIComponent(symbol)}`, { timeoutMs: 10000 });
    simulationApi.intent = (battleId, intentId) => request(`/api/simulation/intent?battleId=${encodeURIComponent(battleId)}&intentId=${encodeURIComponent(intentId)}`);
    simulationApi.executions = battleId => request(`/api/executions?battleId=${encodeURIComponent(battleId)}`);
    simulationApi.quoteIntent = (battleId, intentId) => request('/api/executions/quote', { method: 'POST', body: JSON.stringify({ battleId, intentId }), timeoutMs: 30000 });
    simulationApi.submitExecution = executionId => request('/api/executions/submit', { method: 'POST', body: JSON.stringify({ executionId, confirmed: true }), timeoutMs: 70000 });
    simulationApi.reconcileExecution = executionId => request('/api/executions/reconcile', { method: 'POST', body: JSON.stringify({ executionId }), timeoutMs: 45000 });
  }
  window.Warrior.simulationApi = simulationApi;
  document.documentElement.dataset.runtime = simulationApi.mode;
})();
