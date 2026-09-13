// Public market data only. One socket per visible page, one subscribed symbol.
((root) => {
  function createPriceStream({ onUpdate, onStatus = () => {}, WebSocketImpl = root.WebSocket,
    now = Date.now, timers = root, flushMs = 250, random = Math.random } = {}) {
    let symbol = '', active = false, socket = null, latest = null, lastPaint = -Infinity;
    let paintTimer = null, retryTimer = null, watchTimer = null, backoff = 1000, status = '';
    let lastReceived = 0, openedAt = 0;
    const changeStatus = next => { if (status !== next) { status = next; onStatus(next); } };
    function detach() {
      const old = socket; socket = null;
      if (old) { old.onopen = old.onmessage = old.onerror = old.onclose = null; try { old.close(); } catch {} }
    }
    function clearTimers() {
      for (const id of [paintTimer, retryTimer, watchTimer]) if (id !== null) timers.clearTimeout(id);
      paintTimer = retryTimer = watchTimer = null;
    }
    function stop() {
      active = false; clearTimers(); detach(); latest = null;
      changeStatus('paused');
    }
    function fail() {
      if (!active) return;
      detach();
      if (paintTimer !== null) timers.clearTimeout(paintTimer);
      paintTimer = null; latest = null;
      changeStatus('reconnecting');
      if (retryTimer === null) {
        const delay = Math.round(backoff * (0.9 + Math.max(0, Math.min(1, random())) * 0.2));
        retryTimer = timers.setTimeout(() => { retryTimer = null; connect(); }, delay);
        backoff = Math.min(backoff * 2, 30000);
      }
    }
    function paint() {
      paintTimer = null;
      if (!active || !latest || now() - latest.tradeTime > 15000) return;
      lastPaint = now(); changeStatus('live'); onUpdate({ ...latest });
    }
    function connect() {
      if (!active || socket) return;
      changeStatus('connecting'); openedAt = now(); lastReceived = 0;
      let current;
      try { current = new WebSocketImpl(`wss://data-stream.binance.vision/ws/${symbol.toLowerCase()}@aggTrade`); }
      catch { fail(); return; }
      socket = current;
      current.onmessage = event => {
        if (!active || socket !== current || typeof event.data !== 'string' || event.data.length > 4096) return;
        let trade; try { trade = JSON.parse(event.data); } catch { return; }
        if (trade.e === 'serverShutdown') { fail(); return; }
        const price = Number(trade.p), time = trade.T;
        if (trade.e !== 'aggTrade' || trade.s !== symbol || !Number.isFinite(price) || price <= 0 ||
          !Number.isFinite(time) || time > now() + 2000 || now() - time > 15000 ||
          (latest && time < latest.tradeTime)) return;
        lastReceived = now(); backoff = 1000;
        latest = { symbol, price, tradeTime: time, receivedAt: lastReceived, source: 'Binance Spot WebSocket · aggTrade' };
        // Bursts overwrite a single pending value; never queue one DOM update per trade.
        if (paintTimer === null) paintTimer = timers.setTimeout(paint, Math.max(0, flushMs - (now() - lastPaint)));
      };
      current.onerror = current.onclose = () => { if (socket === current) fail(); };
    }
    function watch() {
      watchTimer = null;
      if (!active) return;
      if (socket && (now() - (lastReceived || openedAt) > 15000 || latest && now() - latest.tradeTime > 15000)) fail();
      watchTimer = timers.setTimeout(watch, 1000);
    }
    function start(nextSymbol) {
      if (!['BTCUSDT', 'ETHUSDT', 'BNBUSDT'].includes(nextSymbol)) { stop(); changeStatus('unavailable'); return; }
      if (active && symbol === nextSymbol) {
        if (!socket && retryTimer !== null) { timers.clearTimeout(retryTimer); retryTimer = null; connect(); }
        return;
      }
      stop(); symbol = nextSymbol; active = true; lastPaint = -Infinity; backoff = 1000;
      connect(); watchTimer = timers.setTimeout(watch, 1000);
    }
    return { start, stop };
  }
  if (typeof module === 'object' && module.exports) module.exports = { createPriceStream };
  else { root.Warrior = root.Warrior || {}; root.Warrior.createPriceStream = createPriceStream; }
})(globalThis);
