const { createSimulationBattles } = require('../simulation-battles');
const { createSimulationMarketSource } = require('../simulation-market-source');
const { createBinanceIndicatorSource } = require('../market-indicators');
const { createPaperTrading } = require('../paper-trading');
const { createPositionValuation } = require('../position-valuation');
const { createAiConnections } = require('../ai-connections');
const { normalizePolicy, buildDecisionContext, validateDecision, decisionAudit } = require('../ai-decision');
const catalog = require('../public/strategy-catalog');
const { nativeFetch } = require('./http.cjs');
const fail = code => Object.assign(new Error(code), { code });

function createMobileRuntime({ fetchImpl = nativeFetch, now = Date.now, autoStart = true } = {}) {
  if (!globalThis.WarriorStorageNative?.call) throw fail('MOBILE_STORAGE_UNAVAILABLE');
  const network = { status: 'connecting', lastSuccess: null, error: null };
  function emitNetwork() { globalThis.dispatchEvent?.(new CustomEvent('warrior-mobile-network', { detail: { ...network } })); }
  async function marketFetch(url, options) {
    try {
      const response = await fetchImpl(url, options);
      if (!response.ok) throw fail('MARKET_UNAVAILABLE');
      network.status = 'online'; network.lastSuccess = now(); network.error = null; emitNetwork();
      return response;
    } catch (error) { network.status = 'error'; network.error = 'MARKET_UNAVAILABLE'; emitNetwork(); throw error; }
  }
  // Every file written by this runtime is encrypted by the native Android
  // Keystore adapter. No plaintext secret/key copy goes into localStorage/IDB.
  const ai = createAiConnections({ file: '/mobile/data/ai-connections.json', fetchImpl, now, secretCodec: {
    seal: value => ({ nativeVault: 1, value }),
    unseal: sealed => { if (sealed?.nativeVault !== 1 || typeof sealed.value !== 'string') throw fail('AI_VAULT_UNAVAILABLE'); return sealed.value; },
  } });
  const source = createSimulationMarketSource({ fetchImpl: marketFetch, now, walletStatus: async () => 'UNCONNECTED',
    official: { detail: async () => { throw fail('MOBILE_PAPER_ONLY'); } }, run: async () => { throw fail('MOBILE_PAPER_ONLY'); } });
  const indicators = createBinanceIndicatorSource({ fetchImpl: marketFetch, now });
  const prices = createPaperTrading({ fetchImpl: marketFetch, now });
  const simulation = createSimulationBattles({ source, indicatorSource: indicators, decisionProvider: ai.router,
    file: '/mobile/data/rule-ai-ledger.json', now, leaseEnabled: false, pauseOnRestore: true, pauseOnError: true });
  const valuation = createPositionValuation({ source, now });
  const capabilities = { version: 8, idempotentCreation: true, minInitialBalance: 10, aiPerBattleModels: true,
    strategies: Object.keys(catalog.profiles), indicators: Object.keys(catalog.indicators), assets: ['BTC','ETH','BNB'],
    periods: ['5m','15m','1h','1d'], streakEmotion: true, battleEmotion: true, actionUrge: true, battleActionUrge: true,
    priceActionCandles: true, realtimeEntry: true };
  const getStrategies = async () => ({ ...simulation.getStrategies(), capabilities });
  async function preview(strategy) {
    if (!Object.hasOwn(catalog.profiles, strategy)) throw fail('AI_STRATEGY_INVALID');
    const policy = normalizePolicy({ strategy, coin: 'BTC', maxStakePct: 10, allowAllIn: false }, 'preview');
    const snapshot = await indicators.snapshot('BTCUSDT');
    const time = now();
    const input = buildDecisionContext({ market: { roundId: `preview-${time}`, timeframe: '5m', secondsToClose: 300,
      upOdds: 2, downOdds: 2, dataTimestamp: snapshot.dataTimestamp }, indicators: snapshot, policy,
      account: { balance: 100, initialBalance: 100, wins: 0, losses: 0, winStreak: 0, lossStreak: 0, openStake: 0 } });
    const engine = ai.router.describeFor(input);
    if (!['mock','off','offline','legacy'].includes(engine.mode)) input.policy.review_mode = 'model';
    let modelRequest = null, plan = null, rejection = null;
    const raw = await ai.router.decide(input, { deadlineMs: time + 10000, now, onRequest: value => { modelRequest = value; } });
    try { plan = validateDecision(raw, { input, indicators: snapshot, policy, now: now() }); }
    catch (error) { rejection = error.code || 'AI_RESPONSE_INVALID'; }
    return { mode: 'preview', ordersCreated: 0, assumptions: { balance: 100, upOdds: 2, downOdds: 2, maxStakePct: 10 },
      engine, raw, plan, rejection, modelRequest, ...(plan ? { audit: decisionAudit({ provider: ai.router, input, plan, indicators: snapshot, raw }) } : {}) };
  }
  // This is an in-process UI adapter, not an HTTP server or a remote proxy.
  async function request(url, options = {}) {
    try {
      options.signal?.throwIfAborted();
      const body = options.body ? JSON.parse(options.body) : {};
      const mutation = options.method === 'POST';
      if (mutation && ['/api/ai/connections','/api/ai/connections/test'].includes(url)) {
        let target;
        try { target = new URL(body.baseUrl); } catch { throw fail('AI_URL_INVALID'); }
        if (target.protocol !== 'https:') throw fail('MOBILE_HTTPS_REQUIRED');
      }
      let data;
      if (url === '/api/ai/settings' && !mutation) data = ai.snapshot();
      else if (url === '/api/ai/connections' && mutation) data = await ai.save(body);
      else if (url === '/api/ai/connections/test' && mutation) data = await ai.save(body, true);
      else if (url === '/api/ai/connections/check' && mutation) data = await ai.testConnection(body.provider, body.revision);
      else if (url === '/api/ai/connections/remove' && mutation) data = ai.remove(body.provider);
      else if (url === '/api/ai/assignments' && mutation) data = ai.assign(body.strategy, body.connectionId);
      else if (url === '/api/ai/preview' && mutation) data = await preview(body.strategy);
      else throw fail('MOBILE_API_UNAVAILABLE');
      return Response.json(data);
    } catch (error) { return Response.json({ code: error.code || 'MOBILE_SERVICE_FAILED', error: error.code || 'MOBILE_SERVICE_FAILED' }, { status: error.statusCode || 503 }); }
  }
  const api = {
    mode: 'native', keepInBackground: true, walletSupported: false, clientId: 'android-local',
    list: async () => { const battles = simulation.summaries(); return { battles, leaderboard: simulation.leaderboard(battles) }; },
    snapshot: async id => simulation.liveSnapshot(id || 'default'),
    report: async id => simulation.snapshot(id || 'default'),
    subscribe: listener => simulation.subscribe(listener),
    async create(name, config = {}, requestId) {
      const prior = simulation.findCreation(requestId, name, config);
      if (prior) return prior;
      ai.assertAgents(config.agents);
      return simulation.create(name, config, null, requestId);
    },
    async setEnabled(id, enabled, { isCancelled = () => false } = {}) {
      if (enabled) {
        const battle = simulation.snapshot(id);
        if (battle.aiConnectionFailure) {
          ai.assertAgents(battle.config.agents);
          for (const [connection, revision] of new Map(battle.config.agents.filter(a => a.aiConnectionId && a.aiConnectionId !== 'none').map(a => [a.aiConnectionId, a.aiConnectionRevision]))) await ai.testConnection(connection, revision);
        }
      }
      if (enabled && isCancelled()) throw fail('MOBILE_CONTROL_CANCELLED');
      return simulation.setEnabled(enabled, id);
    },
    topUp: async (id, agentId, amount, requestId) => simulation.topUp(id, agentId, amount, requestId),
    setEmotion: async (id, value) => simulation.setEmotion(value, id),
    setActionUrge: async (id, value) => simulation.setActionUrge(value, id),
    setRealtimeEntry: async (id, value) => simulation.setRealtimeEntry(value, id),
    end: async (id, reason) => simulation.end(id, reason),
    retryConnection: async id => simulation.retryConnection(id),
    reset: () => simulation.reset(), remove: id => simulation.remove(id), release: () => false,
    getStrategies, strategies: getStrategies, setStrategies: async agents => simulation.setStrategies(agents),
    indicators: symbol => indicators.snapshot(symbol),
    prices: async (symbol = 'BTCUSDT') => ({ mode: 'paper', prices: [await prices.price(symbol)] }),
    valuation: async id => ({ ...await valuation(simulation.snapshot(id)), recovery: simulation.snapshot(id).recovery || null }),
    executions: async () => ({ executions: [], quotesEnabled: false, tradingEnabled: false }),
    networkStatus: () => ({ ...network }),
    checkNetwork: async () => ({ mode: 'paper', prices: [await prices.price('BTCUSDT', { force: true })] }),
    tick: () => simulation.tick(),
  };
  let timer;
  const advance = () => { void simulation.tick(); };
  if (autoStart) {
    timer = setInterval(advance, 1000);
    globalThis.addEventListener('pageshow', advance);
    globalThis.addEventListener('online', advance);
    globalThis.document?.addEventListener('visibilitychange', advance);
  }
  api.dispose = () => { clearInterval(timer); globalThis.removeEventListener?.('pageshow', advance); globalThis.removeEventListener?.('online', advance); globalThis.document?.removeEventListener('visibilitychange', advance); };
  return { api, request };
}
globalThis.WarriorMobileRuntime = { create: createMobileRuntime };
// Share the widget projection with the service; no second accounting formula.
globalThis.WarriorWidgetProject = require('../public/strategy-widget').project;
