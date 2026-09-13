const https = require('node:https');

// A private Agent with an empty proxy environment leaves the process-wide
// Binance/network proxy untouched. TLS certificate validation stays enabled.
const directAgent = new https.Agent({ keepAlive: true, proxyEnv: {} });
function createAiFetch({ fetchImpl = fetch, requestImpl = https.request } = {}) {
  return function aiFetch(url, options = {}) {
    const target = new URL(url);
    if (target.protocol !== 'https:' || target.hostname !== 'api.deepseek.com' ||
        (target.port && target.port !== '443')) return fetchImpl(url, options);
    return new Promise((resolve, reject) => {
      const request = requestImpl(target, { method: options.method || 'GET', headers: options.headers,
        agent: directAgent, signal: options.signal }, response => {
        const chunks = []; let size = 0;
        response.on('data', chunk => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) request.destroy(Object.assign(new Error('AI response too large'), { code: 'AI_RESPONSE_INVALID' }));
          else chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () => {
          // Never follow redirects with an API credential.
          if (response.statusCode >= 300 && response.statusCode < 400) {
            reject(Object.assign(new Error('AI redirect rejected'), { code: 'AI_REQUEST_REJECTED' })); return;
          }
          try {
            resolve(new Response([204,205].includes(response.statusCode) ? null : Buffer.concat(chunks),
              { status: response.statusCode, headers: response.headers }));
          } catch { reject(Object.assign(new Error('AI response invalid'), { code: 'AI_RESPONSE_INVALID' })); }
        });
      });
      request.on('error', reject);
      request.end(options.body);
    });
  };
}
const aiFetch = createAiFetch();
module.exports = { aiFetch, createAiFetch };
