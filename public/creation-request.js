((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WarriorCreationRequest = api;
})(typeof window === 'undefined' ? null : window, () => {
  const fail = code => Object.assign(new Error(code), { code, statusCode: 409 });
  const canonical = value => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  function signature(requestId, name, config) {
    if (requestId == null) return null; // Compatibility for older direct callers.
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId)) throw fail('INVALID_CREATION_REQUEST');
    return JSON.stringify(canonical({ name, config }));
  }
  function lookup(requests, requestId, name, config) {
    const fingerprint = signature(requestId, name, config);
    const prior = fingerprint && Object.hasOwn(requests, requestId) ? requests[requestId] : null;
    if (prior && prior.signature !== fingerprint) throw fail('CREATION_REQUEST_CONFLICT');
    return { fingerprint, prior };
  }
  return { signature, lookup, fail };
});
