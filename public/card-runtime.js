/* New UI transport: reuse the service-owned Android runtime or same-origin Web API. */
((root) => {
  async function request(path, body, { timeoutMs = 20000 } = {}) {
    if (!path.startsWith('/api/')) throw new Error('INVALID_API_PATH');
    if (root.location.protocol === 'file:') {
      throw Object.assign(new Error('RUNTIME_UNAVAILABLE'), { code: 'RUNTIME_UNAVAILABLE' });
    }
    const native = root.Capacitor?.isNativePlatform?.();
    if (native && !root.Warrior?.request) throw Object.assign(new Error('MOBILE_SERVICE_UNAVAILABLE'), { code: 'MOBILE_SERVICE_UNAVAILABLE' });
    const options = { method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(timeoutMs) };
    let response, data;
    try {
      response = await (native ? root.Warrior.request : root.fetch.bind(root))(path, options);
      data = await response.json();
    } catch {
      throw Object.assign(new Error('RUNTIME_UNAVAILABLE'), { code: 'RUNTIME_UNAVAILABLE' });
    }
    if (!response.ok) {
      const code = data.code || 'RUNTIME_REQUEST_FAILED';
      throw Object.assign(new Error(code), { code, status: response.status });
    }
    return data;
  }
  root.WarriorCardRuntime = { request };
})(window);
