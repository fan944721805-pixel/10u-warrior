// Android UI is a client of the service. It must never open a second ledger.
((root) => {
  function create(plugin) {
    if (!plugin?.invoke) throw Object.assign(Error('MOBILE_SERVICE_UNAVAILABLE'), { code: 'MOBILE_SERVICE_UNAVAILABLE' });
    let network = { status: 'connecting', lastSuccess: null, error: null };
    const listeners = new Set(), priceListeners = new Set();
    const registrations = [];
    const listen = (name, callback) => {
      const registration = Promise.resolve(plugin.addListener(name, callback));
      registrations.push(registration); registration.catch(() => {});
      return registration;
    };
    const ready = Promise.all([
      listen('simulation', event => listeners.forEach(fn => fn(event))),
      listen('network', value => { network = value; root.dispatchEvent?.(new CustomEvent('warrior-mobile-network', { detail: value })); }),
      listen('price', value => priceListeners.forEach(fn => fn(value))),
      listen('serviceError', value => {
        network = { status:'error', lastSuccess:network.lastSuccess, error:value.code };
        listeners.forEach(fn => fn({ battleId:'*', error:value.code }));
      }),
    ]);
    async function invoke(method, args = []) {
      await ready;
      const result = await plugin.invoke({ method, args });
      if (result.network) network = result.network;
      if (!result.ok) throw Object.assign(Error(result.code || 'MOBILE_SERVICE_FAILED'), { code: result.code || 'MOBILE_SERVICE_FAILED' });
      return result.value;
    }
    const api = { mode: 'native', keepInBackground: true, serviceOwned: true, walletSupported: false,
      clientId: 'android-local', release: () => false, networkStatus: () => ({ ...network }),
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      serviceStatus: () => plugin.status(),
      dispose: async () => { for (const registration of registrations) await (await registration).remove(); },
    };
    for (const method of ['create','setEnabled','topUp','setEmotion','setActionUrge','setRealtimeEntry','end',
      'retryConnection','reset','remove','getStrategies','strategies','setStrategies','indicators','prices',
      'valuation','executions','checkNetwork','configureWidget']) api[method] = (...args) => invoke(method, args);
    // AbortSignals belong to this UI request and are never serialized across IPC.
    for (const method of ['list','snapshot','report']) api[method] = (id, options = {}) => {
      const signal = (method === 'list' ? id : options)?.signal;
      signal?.throwIfAborted();
      return invoke(method, method === 'list' ? [] : [id]).then(value => { signal?.throwIfAborted(); return value; });
    };
    api.createPriceStream = ({ onUpdate, onStatus = () => {} }) => {
      let symbol = '', active = false;
      const receive = event => {
        if (!active || event.symbol !== symbol) return;
        onStatus(event.status);
        if (event.quote) onUpdate(event.quote);
      };
      priceListeners.add(receive);
      return {
        start(next) { symbol = next; active = true; void invoke('watchPrice', [next]).then(receive).catch(() => onStatus('unavailable')); },
        // Detach this view only. The service keeps streams needed by active battles.
        stop() { active = false; onStatus('paused'); },
      };
    };
    return { api, request: async (url, options = {}) => {
      options.signal?.throwIfAborted();
      const result = await invoke('request', [url, { method: options.method, body: options.body }]);
      options.signal?.throwIfAborted();
      return Response.json(result.data, { status: result.status });
    } };
  }
  if (typeof module === 'object' && module.exports) module.exports = { create };
  else root.WarriorNativeService = { create };
})(globalThis);
