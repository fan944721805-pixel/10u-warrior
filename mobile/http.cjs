// Use Android's HTTPS stack so API requests do not depend on browser CORS.
// Redirects are forbidden: an AI credential stays on its configured endpoint.
// WebView filters Set-Cookie even on a constructed Response. Keep it private to
// the runtime instead of passing it through browser response-header guards.
const nativeCookies = new WeakMap();
function responseCookie(response) {
  return nativeCookies.get(response) ?? response.headers.get('set-cookie');
}
async function nativeFetch(input, options = {}) {
  const url = new URL(String(input));
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('MOBILE_HTTPS_REQUIRED');
  const plugin = globalThis.Capacitor?.Plugins?.CapacitorHttp;
  if (!plugin?.request) throw Error('MOBILE_NETWORK_UNAVAILABLE');
  const signal = options.signal;
  signal?.throwIfAborted();
  let timer, onAbort;
  const cancelled = new Promise((_, reject) => {
    onAbort = () => reject(signal?.reason || new DOMException('Aborted', 'AbortError'));
    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => reject(new DOMException('Timed out', 'TimeoutError')), 20000);
  });
  try {
    const result = await Promise.race([cancelled, plugin.request({
      url: url.href, method: options.method || 'GET', headers: Object.fromEntries(new Headers(options.headers || {}).entries()),
      ...(options.body == null ? {} : { data: JSON.parse(options.body) }),
      connectTimeout: 8000, readTimeout: 15000, disableRedirects: true, responseType: 'json',
    })]);
    signal?.throwIfAborted();
    if (result.status >= 300 && result.status < 400) throw Error('MOBILE_REDIRECT_REJECTED');
    // Return a standard Response so the unchanged market/AI modules perform all
    // existing status, freshness, input-validation and cancellation checks.
    const response = new Response([204,205,304].includes(result.status) ? null : JSON.stringify(result.data), {
      status: result.status, headers: { ...result.headers, 'content-type': 'application/json' },
    });
    const cookie = Object.entries(result.headers || {}).find(([name]) => name.toLowerCase() === 'set-cookie')?.[1];
    if (cookie != null) nativeCookies.set(response, Array.isArray(cookie) ? cookie.join(', ') : String(cookie));
    return response;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
}
module.exports = { nativeFetch, aiFetch: nativeFetch, responseCookie };
