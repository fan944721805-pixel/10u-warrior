/* Local preview draw allowance. Production must use an authoritative server clock. */
((root) => {
  const CAP = 5, INTERVAL = 10 * 60 * 1000;
  const initial = () => ({remaining: CAP, nextAt: null});
  function refill(value, now) {
    if (!value || !Number.isInteger(value.remaining) || value.remaining < 0 || value.remaining > CAP ||
        (value.remaining < CAP && (!Number.isFinite(value.nextAt) || value.nextAt <= 0))) return initial();
    if (value.remaining === CAP) return initial();
    if (now < value.nextAt) return {...value};
    const earned = 1 + Math.floor((now - value.nextAt) / INTERVAL);
    const remaining = Math.min(CAP, value.remaining + earned);
    return {remaining, nextAt: remaining === CAP ? null : value.nextAt + earned * INTERVAL};
  }
  function spend(value, now) {
    const budget = refill(value, now);
    if (!budget.remaining) return null;
    return {remaining: budget.remaining - 1, nextAt: budget.nextAt ?? now + INTERVAL};
  }
  const api = {CAP, INTERVAL, initial, refill, spend};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardLabDraws = api;
})(globalThis);
