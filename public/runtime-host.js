// Loaded only by SimulationService; sole owner of the encrypted native ledger.
(() => {
  const bridge = window.WarriorServiceNative;
  if (!bridge) return;
  const scheduler = WarriorNativeScheduler.install(bridge);
  const http = new Map(); let httpId = 0;
  window.Capacitor = { Plugins: { CapacitorHttp: { request(options) {
    const id = ++httpId;
    return new Promise((resolve, reject) => {
      http.set(id, { resolve, reject }); bridge.http(id, JSON.stringify(options));
    });
  } } } };
  let runtime, selectedSymbol = '', syncing = false, syncAgain = false, controlEpoch = 0;
  const streams = new Map(), quotes = new Map(), streamMetrics = new Map();
  const instanceId = crypto.randomUUID();
  let widgetConfig, widgetBusy = false;
  try { widgetConfig = JSON.parse(bridge.widgetConfig?.() || 'null'); } catch {}
  async function updateWidget() {
    if (!widgetConfig || widgetBusy) return;
    widgetBusy = true;
    try {
      const { battles } = await runtime.api.list();
      const snapshots = await Promise.all(battles.filter(b=>!b.placeholder).map(b=>runtime.api.snapshot(b.id)));
      const projection = WarriorWidgetProject(snapshots, { t:v=>widgetConfig.words?.[v] || v, network:runtime.api.networkStatus().status });
      const names = new Map(widgetConfig.names.map(row=>[row.key,row]));
      for (const row of projection.rows) { const name=names.get(row.key); if(name){row.name=name.name;row.icon=name.icon;} }
      projection.labels = widgetConfig.labels;
      bridge.widget(JSON.stringify(projection));
    } catch { bridge.widgetUnavailable(); }
    finally { widgetBusy = false; }
  }
  const methods = new Set(['list','snapshot','report','create','setEnabled','topUp','setEmotion','setActionUrge',
    'setRealtimeEntry','end','retryConnection','reset','remove','getStrategies','strategies','setStrategies',
    'indicators','prices','valuation','executions','checkNetwork']);
  function emit(type, data) { bridge.event(type, JSON.stringify(data)); }
  function watch(symbol) {
    if (!['BTCUSDT','ETHUSDT','BNBUSDT'].includes(symbol)) throw Error('INVALID_SYMBOL');
    if (!streams.has(symbol)) {
      const metrics = { connections: 0, received: 0, lastReceived: null }; streamMetrics.set(symbol, metrics);
      const stream = Warrior.createPriceStream({
        onStatus: status => { if (status === 'connecting') metrics.connections++; const value = { symbol, status }; quotes.set(symbol, value); emit('price', value); },
        onUpdate: quote => { metrics.received++; metrics.lastReceived = quote.receivedAt; const value = { symbol, status: 'live', quote }; quotes.set(symbol, value); emit('price', value); },
      });
      streams.set(symbol, stream); stream.start(symbol);
    }
    return quotes.get(symbol) || { symbol, status: 'connecting' };
  }
  async function sync() {
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    try {
      const { battles } = await runtime.api.list();
      const symbols = new Set(selectedSymbol ? [selectedSymbol] : []);
      let active = 0, open = 0;
      for (const b of battles) {
        if (b.enabled) { active++; for (const a of b.config.agents) symbols.add(a.coin + 'USDT'); }
        open += b.agents.filter(a => a.reserved > 0).length;
      }
      for (const symbol of symbols) watch(symbol);
      for (const [symbol, stream] of streams) if (!symbols.has(symbol)) { stream.stop(); streams.delete(symbol); quotes.delete(symbol); }
      bridge.demand(active, open);
    } catch { bridge.failed('MOBILE_SERVICE_FAILED'); }
    finally { syncing = false; if (syncAgain) { syncAgain = false; void sync(); } }
  }
  window.WarriorServiceHost = {
    diagnostics: () => ({ instanceId, at: Date.now(), streams: [...streamMetrics].map(([symbol, data]) => ({ symbol, ...data, status: quotes.get(symbol)?.status })) }),
    fire(id) { try { scheduler.fire(id); } finally { bridge.heartbeat(); } },
    httpResult(id, result) {
      const pending = http.get(id); if (!pending) return; http.delete(id);
      if (result.ok) pending.resolve(result.value); else pending.reject(Error(result.code || 'MOBILE_NETWORK_UNAVAILABLE'));
    },
    async dispatch(id, method, args) {
      try {
        let value;
        if (method === 'setEnabled') {
          const epoch = controlEpoch;
          value = await runtime.api.setEnabled(args[0], args[1], { isCancelled: () => epoch !== controlEpoch });
        } else if (methods.has(method)) value = await runtime.api[method](...args);
        else if (method === 'request') {
          const response = await runtime.request(...args); value = { status: response.status, data: await response.json() };
        } else if (method === 'configureWidget') {
          widgetConfig = args[0]; bridge.saveWidgetConfig(JSON.stringify(widgetConfig)); await updateWidget(); value = { updated:true };
        } else if (method === 'watchPrice') { selectedSymbol = args[0]; value = watch(selectedSymbol); }
        else if (method === 'pauseAll') {
          controlEpoch++;
          const { battles } = await runtime.api.list();
          // setEnabled invalidates all in-flight decisions before returning.
          for (const b of battles) if (b.enabled) await runtime.api.setEnabled(b.id, false);
          value = { paused: true };
        } else throw Object.assign(Error('MOBILE_API_UNAVAILABLE'), { code: 'MOBILE_API_UNAVAILABLE' });
        await sync();
        bridge.reply(id, JSON.stringify({ ok: true, value: value ?? null, network: runtime.api.networkStatus() }));
      } catch (error) {
        await sync();
        bridge.reply(id, JSON.stringify({ ok: false, code: error.code || (/^[A-Z][A-Z0-9_]+$/.test(error.message || '') ? error.message : 'MOBILE_SERVICE_FAILED'), network:runtime?.api.networkStatus() }));
      }
    },
  };
  try {
    runtime = WarriorMobileRuntime.create();
    runtime.api.subscribe(event => { emit('simulation', event); void sync(); void updateWidget(); });
    window.addEventListener('warrior-mobile-network', event => emit('network', event.detail));
    void sync().then(() => bridge.ready());
    setInterval(() => void updateWidget(), 25000);
  } catch (error) { bridge.failed(error.code || 'MOBILE_STORAGE_UNAVAILABLE'); }
})();
