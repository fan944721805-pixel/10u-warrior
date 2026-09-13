// Native Handler timers are independent of Activity/WebView visibility throttling.
((root) => {
  function install(bridge, target = root) {
    let next = 0;
    const callbacks = new Map();
    function schedule(fn, delay, repeat, args) {
      if (typeof fn !== 'function') throw TypeError('Only function timers are supported');
      const id = ++next;
      callbacks.set(id, { fn, repeat, args });
      bridge.schedule(id, Math.max(repeat ? 1 : 0, Math.min(Number(delay) || 0, 2147483647)), repeat);
      return id;
    }
    function clear(id) { callbacks.delete(id); bridge.cancel(Number(id) || 0); }
    target.setTimeout = (fn, delay, ...args) => schedule(fn, delay, false, args);
    target.setInterval = (fn, delay, ...args) => schedule(fn, delay, true, args);
    target.clearTimeout = target.clearInterval = clear;
    return { fire(id) {
      const callback = callbacks.get(id);
      if (!callback) return;
      if (!callback.repeat) callbacks.delete(id);
      callback.fn(...callback.args);
    } };
  }
  if (typeof module === 'object' && module.exports) module.exports = { install };
  else root.WarriorNativeScheduler = { install };
})(globalThis);
