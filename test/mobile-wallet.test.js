const test=require('node:test'),assert=require('node:assert/strict');
const {storageBridge,fixture,loadRuntime}=require('./fixtures/mobile-runtime.cjs');
const AUTH='/bapi/defi/v1/public/wallet-direct/agent-wallet/login';
function setup(t,ResponseClass){
 const storage=storageBridge(),f=fixture(),calls=[];
 const control={confirm:'UNCONNECTED',created:'CREATING',cookie:'test-session-secret',reject:false,fail:false,hold:null};
 const original=f.fetchImpl;
 f.fetchImpl=async(url,options)=>{
  const path=new URL(url).pathname;if(!path.startsWith('/bapi/'))return original(url,options);
  assert.equal(new URL(url).origin,'https://www.binance.com');
  const body=options.body?JSON.parse(options.body):null;calls.push({path,body,headers:options.headers});
  if(control.fail)throw Error('network unavailable');
  if(control.reject)return Response.json({code:'100001005'});
  if(path===AUTH)return Response.json({code:'000000',data:{connectionStatus:'UNCONNECTED',qrInfo:{qrCodeUrl:'https://app.binance.com/uni-qr/test?x=%2B&n=001',qrCodeId:'test-qr',expireAt:f.now()+60000}}});
  if(path===AUTH+'/confirm'){
   if(control.hold)await control.hold;
   return Response.json({code:'000000',data:{connectionStatus:control.confirm}},{headers:{'set-cookie':'agentSessionId='+control.cookie+'; HttpOnly; Secure; Path=/'}});
  }
  if(path===AUTH+'/query')return Response.json({code:'000000',data:{connectionStatus:control.confirm,walletCreateStatus:control.created}});
  if(path===AUTH+'/logout')return Response.json({code:'000000',data:{}});
  if(path.endsWith('/order-book'))return Response.json({code:'000000',data:{asks:[{price:control.price||.43,size:100}]}});
  if(path.endsWith('/market/search'))return Response.json({code:'000000',data:[]});
  if(path.endsWith('/market/detail'))return Response.json({code:'000000',data:{marketTopicId:123}});
  throw Error('Unexpected request '+path);
 };
 const runtime=loadRuntime(storage,f,ResponseClass);t.after(()=>runtime.api.dispose());
 const call=async(action,method='GET')=>{const response=await runtime.request('/api/wallet'+(action?'/'+action:''),{method,body:method==='POST'?'{}':undefined});return {status:response.status,...await response.json()};};
 return {runtime,storage,f,calls,control,call};
}
test('phone requests official auth directly, preserves URL and pairing code, no server settings',async t=>{
 const {runtime,call,calls,storage}=setup(t);
 assert.equal((await call('')).wallet.status,'unconnected');assert.equal(calls.length,0);
 const auth=(await call('signin','POST')).auth;
 assert.equal(auth.status,'awaiting_scan');assert.equal(auth.urlForWeb,'https://app.binance.com/uni-qr/test?x=%2B&n=001');
 const key=calls[0].body.publicKeyHex;assert.match(key,/^[0-9a-f]{64}$/);assert.equal(calls[0].body.os,'Android');
 assert.equal(auth.pairingCode,key.slice(0,3)+key.slice(-3));assert.match(auth.qrImage,/^data:image\/svg\+xml/);
 const {qrImage}=require('../mobile/wallet.cjs');assert.equal(auth.qrImage,qrImage(auth.urlForWeb));
 assert.equal(auth.qrCodeId,undefined);assert.equal(auth.cookie,undefined);assert.equal(runtime.api.walletActivity(),true);
 assert.equal((await call('bridge')).status,503);
 assert.equal(storage.files.has('/mobile/data/agentic-wallet.json'),true);assert.equal(storage.files.has('/mobile/data/wallet-bridge.json'),false);
 await call('signin','POST');assert.equal(calls.length,1,'repeated click reuses pending QR');
});
test('confirmation alone is insufficient; native HTTP retains cookies, restore resumes creation',async t=>{
 const s=setup(t);await s.call('signin','POST');s.control.confirm='CONNECTED';
 assert.equal((await s.call('auth')).auth.status,'awaiting_scan');
 assert.equal(s.calls.at(-1).headers.cookie,'agentSessionId=test-session-secret');
 assert.equal((await s.call('')).wallet.status,'unconnected');
 s.runtime.api.dispose();const restored=loadRuntime(s.storage,s.f);t.after(()=>restored.api.dispose());
 s.control.created='CREATED';
 const result=await(await restored.request('/api/wallet/auth')).json();assert.equal(result.auth.status,'connected');assert.equal(restored.api.walletActivity(),false);
 assert.ok(!JSON.stringify(result).includes(s.control.cookie));
});
test('WebView response-header filtering cannot discard the native session cookie',async t=>{
 class GuardedResponse extends Response {
  constructor(body,init){super(body,init);this.headers.delete('set-cookie');}
 }
 assert.equal(new GuardedResponse('{}',{headers:{'set-cookie':'fixture=value'}}).headers.get('set-cookie'),null);
 const s=setup(t,GuardedResponse);await s.call('signin','POST');s.control.confirm='CONNECTED';s.control.created='CREATED';
 const result=await s.call('auth');assert.equal(result.auth.status,'connected');
 assert.equal(s.calls.at(-1).headers.cookie,'agentSessionId=test-session-secret');
 assert.ok(!JSON.stringify(result).includes(s.control.cookie));
});
test('a restored confirmed request without its cookie repeats confirmation before query',async t=>{
 const s=setup(t);await s.call('signin','POST');s.runtime.api.dispose();
 const file='/mobile/data/agentic-wallet.json',saved=JSON.parse(s.storage.files.get(file));
 saved.auth.phase='creating';saved.cookie='';s.storage.files.set(file,JSON.stringify(saved));
 s.control.confirm='CONNECTED';s.control.created='CREATED';const before=s.calls.length;
 const restored=loadRuntime(s.storage,s.f);t.after(()=>restored.api.dispose());
 const result=await(await restored.request('/api/wallet/auth')).json();assert.equal(result.auth.status,'connected');
 assert.deepEqual(s.calls.slice(before).map(c=>c.path),[AUTH+'/confirm',AUTH+'/query']);
});
test('expiry and rejected session clear native cookie and prevent connected projection',async t=>{
 const s=setup(t);await s.call('signin','POST');await s.call('auth');s.f.setTime(s.f.now()+61000);
 assert.equal((await s.call('auth')).auth.status,'expired');assert.equal(JSON.parse(s.storage.files.get('/mobile/data/agentic-wallet.json')).cookie,'');
 await s.call('signin','POST');s.control.reject=true;assert.equal((await s.call('auth')).status,503);
 assert.equal((await s.call('')).wallet.status,'unconnected');
});
test('signout invalidates a late confirmation and cannot resurrect a cookie',async t=>{
 const s=setup(t);await s.call('signin','POST');let release;s.control.hold=new Promise(r=>release=r);
 const polling=s.call('auth');await new Promise(r=>setImmediate(r));
 await s.call('signout','POST');release();await polling;
 assert.equal((await s.call('')).auth.status,'idle');assert.equal(JSON.parse(s.storage.files.get('/mobile/data/agentic-wallet.json')).cookie,'');
});
test('transient network failure keeps pending authorization available for retry',async t=>{
 const s=setup(t);await s.call('signin','POST');s.control.fail=true;assert.equal((await s.call('auth')).status,503);
 assert.equal((await s.call('')).auth.status,'awaiting_scan');s.control.fail=false;s.control.confirm='CONNECTED';s.control.created='CREATED';
 assert.equal((await s.call('auth')).auth.status,'connected');
});
test('direct read adapter returns changing books and never dispatches trading operations',async t=>{
 const s=setup(t);await s.call('signin','POST');s.control.confirm='CONNECTED';s.control.created='CREATED';await s.call('auth');s.runtime.api.dispose();
 // Exercise the same adapter with the encrypted-store fixture, avoiding exposing run through UI RPC.
 const previous=global.WarriorStorageNative;global.WarriorStorageNative=s.storage;t.after(()=>{global.WarriorStorageNative=previous;});
 const {createMobileWallet}=require('../mobile/wallet.cjs');const w=createMobileWallet({fetchImpl:s.f.fetchImpl,now:s.f.now,autoStart:false});t.after(()=>w.dispose());
 const args=['prediction','market','order-book','--marketId','123','--tokenId','456'];
 assert.equal((await w.run(args)).data.asks[0].price,.43);s.control.price=.61;assert.equal((await w.run(args)).data.asks[0].price,.61);
 assert.deepEqual(s.calls.at(-1).body,{marketId:123,tokenId:'456'});const count=s.calls.length;
 await assert.rejects(w.run(['prediction','trade','place-order']),{code:'WALLET_READ_FORBIDDEN'});assert.equal(s.calls.length,count);
 s.control.fail=true;await assert.rejects(w.run(args),{code:'BINANCE_NETWORK_UNAVAILABLE'});
});
