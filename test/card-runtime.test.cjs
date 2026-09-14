const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/card-runtime.js'),'utf8');
function runtime(window){
  window.location ||= {protocol:'https:',search:''};
  const context={window,URLSearchParams,AbortSignal};vm.runInNewContext(source,context);
  return window.WarriorCardRuntime;
}
test('new UI uses native service transport without a browser HTTP fallback',async()=>{
  let calls=0;
  const client=runtime({Capacitor:{isNativePlatform:()=>true},fetch:()=>{throw Error('WRONG_TRANSPORT');},Warrior:{request:async(url,options)=>{
    calls++;assert.equal(url,'/api/ai/connections');assert.equal(options.method,'POST');
    assert.equal(JSON.parse(options.body).provider,'openai');return Response.json({connections:[]});
  }}});
  await client.request('/api/ai/connections',{provider:'openai'});assert.equal(calls,1);
  const missing=runtime({Capacitor:{isNativePlatform:()=>true},fetch:()=>{throw Error('MUST_NOT_FALL_BACK');}});
  await assert.rejects(missing.request('/api/ai/settings'),e=>e.code==='MOBILE_SERVICE_UNAVAILABLE');
});
test('new UI reports structured service errors and refuses offline or malformed responses',async()=>{
  const client=runtime({fetch:async()=>Response.json({code:'AI_AUTH_FAILED',error:'private upstream message'},{status:503})});
  await assert.rejects(client.request('/api/ai/settings'),e=>e.code==='AI_AUTH_FAILED'&&!e.message.includes('private'));
  const broken=runtime({fetch:async()=>new Response('<html>Not an API</html>')});
  await assert.rejects(broken.request('/api/ai/settings'),e=>e.code==='RUNTIME_UNAVAILABLE');
  const offline=runtime({location:{protocol:'file:',search:''},fetch:()=>{throw Error('MUST_NOT_CALL');}});
  await assert.rejects(offline.request('/api/ai/settings'),e=>e.code==='RUNTIME_UNAVAILABLE');
});

test('retired offline bookmark parameter uses the current service instead of a demo or unavailable state',async()=>{
  let calls=0;
  const client=runtime({location:{protocol:'https:',search:'?offline=1'},fetch:async()=>{calls++;return Response.json({version:'COL-1'});}});
  assert.equal((await client.request('/api/cards/collection')).version,'COL-1');assert.equal(calls,1);
  const native={Capacitor:{isNativePlatform:()=>true,Plugins:{NativeRuntime:{}}},WarriorNativeService:{create:()=>({api:{mode:'native'},request:()=>{}})}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/simulation-api.js'),'utf8'),{window:native,location:{protocol:'https:',search:'?offline=1'},document:{documentElement:{dataset:{}}}});
  assert.equal(native.Warrior.simulationApi.mode,'native');
});
