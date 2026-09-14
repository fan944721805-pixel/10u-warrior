const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function storageBridge(files = new Map()) {
  let failed = false;
  return { files, fail: value => { failed = value; }, call(raw) {
    const { op, path, destination, data, exclusive } = JSON.parse(raw);
    try {
      if (failed) throw Error('MOBILE_STORAGE_FAILED');
      let value = null;
      if (op === 'exists') value = files.has(path);
      else if (op === 'read') { if (!files.has(path)) throw Error('ENOENT'); value = files.get(path); }
      else if (op === 'write') { if (exclusive && files.has(path)) throw Error('EEXIST'); files.set(path, data); }
      else if (op === 'rename' || op === 'copy') { if (!files.has(path)) throw Error('ENOENT'); files.set(destination, files.get(path)); if (op === 'rename') files.delete(path); }
      else if (op === 'delete') files.delete(path);
      else if (op !== 'mkdir') throw Error('BAD_OPERATION');
      return JSON.stringify({ ok: true, value });
    } catch (error) { return JSON.stringify({ ok: false, code: error.message }); }
  } };
}
function fixture() {
  let time = 1800000000000 - 20000, unavailable = false, aiFailure = false;
  const requests = [];
  const now = () => time;
  async function fetchImpl(input, options = {}) {
    requests.push({ input, options });
    const url = new URL(input);
    if (url.hostname === 'ai.example.test') {
      if (aiFailure) return Response.json({}, { status: 401 });
      const body = JSON.parse(options.body), context = JSON.parse(body.messages.at(-1).content);
      const answer = { round_id: context.market.round_id, action: 'SKIP', direction: null, stake_usdt: 0, stake_pct: 0,
        confidence: 0, risk_mode: 'WAIT', factors: [], reason: 'test fixture', data_fresh: true, warnings: [], skip_reason_code: 'MODEL_UNCERTAIN' };
      return Response.json({ choices: [{ message: { content: JSON.stringify(answer) }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20 } });
    }
    if (unavailable) throw Error('network unavailable');
    if (url.hostname !== 'data-api.binance.vision') throw Error('Unexpected destination');
    if (url.pathname.endsWith('/aggTrades')) return Response.json([{ p: '63000', T: time }]);
    if (url.pathname.endsWith('/depth')) return Response.json({ bids: [['63000','10']], asks: [['63001','1']] });
    if (url.pathname.endsWith('/klines')) {
      if (url.searchParams.has('startTime')) {
        const start = Number(url.searchParams.get('startTime'));
        return Response.json([[start,'63000','63100','62900','63050','100',start+59999,'6300000',100,'70','4410000']]);
      }
      const minutes = { '1m': 1, '3m': 3, '15m': 15, '4h': 240 }[url.searchParams.get('interval')];
      const duration = minutes * 60000, last = Math.floor(time / duration) * duration;
      return Response.json(Array.from({ length: 240 }, (_, index) => {
        const start = last - (239-index)*duration, open = 58000+index*18+index*index*.02;
        return [start,String(open),String(open+30),String(open-1),String(open+28),'100',start+duration-1,'6250000',100,'70','4375000'];
      }));
    }
    throw Error('Unexpected market endpoint');
  }
  return { now, requests, fetchImpl, setTime: value => { time=value; }, offline: value => { unavailable=value; }, aiFailure: value => { aiFailure=value; } };
}
function loadRuntime(storage, f, ResponseClass = Response) {
  const context = vm.createContext({ crypto: crypto.webcrypto, TextEncoder, TextDecoder, URL, URLSearchParams, Headers, Response: ResponseClass, AbortSignal,
    DOMException, CustomEvent, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval,
    WarriorStorageNative: storage, Capacitor: { Plugins: { CapacitorHttp: { request: async args => {
      const response = await f.fetchImpl(args.url, { method: args.method, headers: args.headers, body: args.data == null ? undefined : JSON.stringify(args.data) });
      return { status: response.status, headers:Object.fromEntries(response.headers), data: await response.json() };
    } } } },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../public/mobile-runtime.js'), 'utf8'), context);
  // Use the actual native HTTP adapter; only Android's network and disk bridge
  // are mocked here. Device encryption is verified separately on Android.
  return context.WarriorMobileRuntime.create({ now: f.now, autoStart: false });
}
async function waitForPreparation(api,battleId){
  // tick intentionally starts forecasts without waiting for network completion.
  // Advance the fake clock only after this scenario's preparation is complete.
  for(let i=0;i<100;i++){
    const snapshot=await api.report(battleId),states=snapshot.agents.map(a=>a.preparation?.status);
    if(states.every(status=>status==='ready'))return;
    if(states.some(status=>status==='failed'))throw Error('Fixture preparation failed: '+JSON.stringify(states));
    await new Promise(resolve=>setImmediate(resolve));
  }
  throw Error('Fixture preparation did not complete');
}
module.exports = { storageBridge, fixture, loadRuntime, waitForPreparation };
