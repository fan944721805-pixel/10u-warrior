const test = require('node:test');
const assert = require('node:assert/strict');
const { storageBridge, fixture, loadRuntime } = require('./fixtures/mobile-runtime.cjs');
const ROUND = 300000, SLOT = 1800000000000;
const config = { initialBalance: 100, rounds: 2, period: '5m', agents: [{ id:'A', name:'My phone', strategy:'czBrother', coin:'BNB', maxStakePct:10 }] };
const post = (runtime, url, body) => runtime.request(url, { method:'POST', body:JSON.stringify(body) });

test('native HTTPS transport preserves bodies, forbids redirects and rejects cancelled responses', async t => {
  const { nativeFetch }=require('../mobile/http.cjs');
  const previous=globalThis.Capacitor; t.after(()=>{globalThis.Capacitor=previous;});
  let calls=0,resolveRequest;
  globalThis.Capacitor={Plugins:{CapacitorHttp:{request:async options=>{
    calls++; assert.equal(options.disableRedirects,true);
    assert.equal(options.headers.authorization,'Bearer test-only');
    assert.deepEqual(options.data,{message:'test'});
    return {status:200,data:{ok:true}};
  }}}};
  await assert.rejects(nativeFetch('http://example.test'),/MOBILE_HTTPS_REQUIRED/);assert.equal(calls,0);
  assert.deepEqual(await(await nativeFetch('https://example.test',{method:'POST',headers:{authorization:'Bearer test-only'},body:JSON.stringify({message:'test'})})).json(),{ok:true});
  globalThis.Capacitor.Plugins.CapacitorHttp.request=async()=>({status:302,data:{}});
  await assert.rejects(nativeFetch('https://example.test'),/MOBILE_REDIRECT_REJECTED/);
  globalThis.Capacitor.Plugins.CapacitorHttp.request=()=>new Promise(resolve=>{resolveRequest=resolve;});
  const controller=new AbortController(),pending=nativeFetch('https://example.test',{signal:controller.signal});
  controller.abort();await assert.rejects(pending,{name:'AbortError'});
  resolveRequest({status:200,data:{late:true}});
});

test('native bundle uses live market HTTP, shared strategies and durable independent battles without Node or /api server', async () => {
  const storage=storageBridge(), f=fixture(), runtime=loadRuntime(storage,f), api=runtime.api;
  assert.equal(api.mode,'native');
  assert.equal((await api.prices()).prices[0].price,63000);
  const a=await api.create('手机 Alpha',config,'mobile-create-alpha'), b=await api.create('Phone Beta',config,'mobile-create-beta');
  assert.equal((await api.create('手机 Alpha',config,'mobile-create-alpha')).id,a.id);
  await api.setEnabled(b.id,false);
  await api.tick(); f.setTime(SLOT); await api.tick();
  const opened=await api.report(a.id);
  assert.equal(opened.marketSource,'public-spot');
  assert.equal(opened.agents[0].orders.length,1,JSON.stringify(opened.agents[0].lastDecision));
  assert.equal(opened.agents[0].orders[0].quote.source,'practice-fixed');
  assert.equal((await api.report(b.id)).agents[0].orders.length,0);
  assert.ok(f.requests.every(r=>r.input.startsWith('https://data-api.binance.vision/')));
  // A missing closing candle keeps the actual order unresolved. No RNG payout.
  f.offline(true); f.setTime(SLOT+ROUND+16000); await api.tick();
  assert.equal((await api.report(a.id)).agents[0].orders[0].status,'OPEN');
  assert.equal(api.networkStatus().status,'error');
  const reopened=loadRuntime(storage,f);
  assert.equal((await reopened.api.report(a.id)).enabled,false);
  assert.equal((await reopened.api.report(a.id)).agents[0].orders[0].status,'OPEN');
  f.offline(false); f.setTime(SLOT+ROUND+40000); await reopened.api.tick();
  const settled=await reopened.api.report(a.id);
  assert.equal(settled.agents[0].orders[0].status,'WON');
  assert.equal(settled.agents[0].orders.length,1,'Reopening must not replay missed bets');
  assert.equal(settled.agents[0].orders[0].settlement.source,'public-spot-practice');
});

test('native AI save/test/remove uses direct HTTPS, retains state and never silently falls back from configured AI', async () => {
  const storage=storageBridge(), f=fixture(), runtime=loadRuntime(storage,f);
  const settings={provider:'custom',baseUrl:'https://ai.example.test/v1',model:'fixture',apiKey:'fixture-secret'};
  assert.equal((await (await post(runtime,'/api/ai/connections',{...settings,baseUrl:'http://127.0.0.1:11434'})).json()).code,'MOBILE_HTTPS_REQUIRED');
  assert.equal(f.requests.length,0);
  assert.equal((await post(runtime,'/api/ai/connections/test',settings)).status,200);
  let snapshot=await (await runtime.request('/api/ai/settings')).json();
  assert.equal(snapshot.connections[0].tested,true);
  assert.equal(snapshot.usage.custom.total,120);
  assert.ok(!JSON.stringify(snapshot).includes('fixture-secret'));
  assert.equal(f.requests.at(-1).options.headers.authorization,'Bearer fixture-secret');
  const reloaded=loadRuntime(storage,f);
  snapshot=await (await reloaded.request('/api/ai/settings')).json();
  assert.equal(snapshot.connections[0].tested,true);
  f.aiFailure(true);
  assert.equal((await post(reloaded,'/api/ai/connections/check',{provider:'custom'})).status,503);
  await post(reloaded,'/api/ai/connections/remove',{provider:'custom'});
  await assert.rejects(reloaded.api.create('Missing AI',{...config,agents:[{...config.agents[0],aiConnectionId:'custom',aiConnectionRevision:snapshot.connections[0].revision}]},'mobile-create-missing'),{code:'AI_CONNECTION_NOT_TESTED'});
});

test('native storage failures refuse writes and damaged data never become a fresh ledger', async () => {
  const storage=storageBridge(), f=fixture(), runtime=loadRuntime(storage,f);
  const created=await runtime.api.create('Retain',config,'mobile-create-retain');
  const before=new Map(storage.files);
  storage.fail(true);
  await assert.rejects(runtime.api.topUp(created.id,'A',10,'mobile-topup-retain'));
  assert.deepEqual(storage.files,before);
  storage.fail(false);
  storage.files.set('/mobile/data/rule-ai-ledger.json','broken-json');
  assert.throws(()=>loadRuntime(storage,f));
  assert.equal(storage.files.get('/mobile/data/rule-ai-ledger.json'),'broken-json');
});

test('reopening an enabled native battle pauses it and does not backfill missed rounds', async () => {
  const storage=storageBridge(),f=fixture(),runtime=loadRuntime(storage,f);
  const battle=await runtime.api.create('Running before close',config,'mobile-running-restart');
  assert.equal((await runtime.api.report(battle.id)).enabled,true);
  f.setTime(SLOT+4*ROUND);
  const reopened=loadRuntime(storage,f);
  await reopened.api.tick();
  const restored=await reopened.api.report(battle.id);
  assert.equal(restored.enabled,false);
  assert.equal(restored.agents[0].orders.length,0);
  assert.equal(restored.agents[0].cash,100);
});

test('a notification pause invalidates an earlier pending resume', async () => {
  const runtime=loadRuntime(storageBridge(),fixture());
  const battle=await runtime.api.create('Paused',config,'service-pause-cancel');
  await runtime.api.setEnabled(battle.id,false);
  await assert.rejects(runtime.api.setEnabled(battle.id,true,{isCancelled:()=>true}),{code:'MOBILE_CONTROL_CANCELLED'});
  assert.equal((await runtime.api.report(battle.id)).enabled,false);
});
