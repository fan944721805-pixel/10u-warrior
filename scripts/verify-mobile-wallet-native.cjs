const {connect}=require('./android-cdp.cjs');
const assert=require('node:assert/strict');
const serial=process.env.ANDROID_TEST_SERIAL;
if(!/^emulator-\d+$/.test(serial||''))throw Error('Disposable emulator required');
(async()=>{const c=await connect(serial,19340),ui=await c.attach(p=>p.url==='https://localhost/'),fixture=process.argv.includes('--fixture');let host;
try{
 for(let i=0;i<40;i++){if(await ui.evaluate("typeof renderWallet==='function'"))break;await new Promise(r=>setTimeout(r,500));}
 if(fixture){
   assert.equal(await ui.evaluate("Warrior.request('/api/wallet').then(r=>r.json()).then(r=>r.wallet.status)"),'unconnected');
   host=await c.attach(p=>p.url.includes('/runtime-host.html'));
   await host.evaluate("window.__walletOriginal=Capacitor.Plugins.CapacitorHttp.request;window.__walletPolls=0;Capacitor.Plugins.CapacitorHttp.request=async function(options){const path=new URL(options.url).pathname;if(!path.startsWith('/bapi/defi/v1/public/wallet-direct/'))return __walletOriginal(options);let data={};if(path.endsWith('/login'))data={connectionStatus:'UNCONNECTED',qrInfo:{qrCodeUrl:'https://app.binance.com/?fixture=1',qrCodeId:'fixture-only',expireAt:Date.now()+60000}};else if(path.endsWith('/confirm')){__walletPolls++;data={connectionStatus:'UNCONNECTED'}};return{status:200,headers:{},data:{code:'000000',data}};};true");
 }
 const result=await ui.evaluate("(async()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();await renderWallet();openDialog('#wallet-dialog');let invalidBlocked=false;try{await Capacitor.Plugins.WalletLink.open({url:'https://example.test/not-binance'})}catch{invalidBlocked=true}return{native:Warrior.simulationApi.mode,supported:Warrior.simulationApi.walletSupported,form:!!document.querySelector('.wallet-bridge'),enabled:!document.querySelector('#start-wallet-signin')?.disabled,button:document.querySelector('#start-wallet-signin')?.textContent,overflow:document.querySelector('#wallet-dialog').scrollWidth>document.querySelector('#wallet-dialog').clientWidth,invalidBlocked}})()");
 assert.equal(result.native,'native');assert.equal(result.supported,true);assert.equal(result.invalidBlocked,true);assert.equal(result.overflow,false);
 assert.equal(result.form,false);assert.equal(result.enabled,true);
 if(process.argv.includes('--signin') || fixture){
   const auth=await ui.evaluate("(async()=>{await startWalletSignin();const img=document.querySelector('.wallet-qr img');if(img)await img.decode();return{status:walletAuth?.status,host:walletAuth?.urlForWeb?new URL(walletAuth.urlForWeb).host:null,pairingLength:walletAuth?.pairingCode?.length,qrLoaded:!!img?.naturalWidth,error:walletAuth?.error}})()");
   assert.equal(auth.status,'awaiting_scan',JSON.stringify(auth));assert.equal(auth.qrLoaded,true);Object.assign(result,auth);
   const fs=require('node:fs'),path=require('node:path'),out=path.resolve(__dirname,'../test-results/mobile-wallet');fs.mkdirSync(out,{recursive:true});
   const screen=await ui.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'native-signin.png'),Buffer.from(screen.data,'base64'));
   await ui.evaluate("document.querySelector('.wallet-qr img').scrollIntoView({block:'center'});true");await new Promise(r=>setTimeout(r,500));
   const qr=await ui.send('Page.captureScreenshot',{format:'png'}),png=Buffer.from(qr.data,'base64');fs.writeFileSync(path.join(out,fixture?'native-fixture-qr.png':'native-real-qr.png'),png);
   const pixels=require('pngjs').PNG.sync.read(png),decoded=require('jsqr')(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height);
   assert.equal(decoded?.data,await ui.evaluate('walletAuth.urlForWeb'));result.independentQrDecode=true;
   if(fixture){
     console.log('Native QR rendered');const before=await host.evaluate('__walletPolls');
     const service=await ui.evaluate('Capacitor.Plugins.NativeRuntime.status()');assert.equal(service.walletPending,true);assert.equal(service.foreground,true);console.log('Authorization foreground service active');
     await ui.evaluate("document.querySelector('.wallet-signin > button.primary').scrollIntoView({block:'center'});true");
     await ui.send('Runtime.evaluate',{expression:"setTimeout(()=>document.querySelector('.wallet-signin > button.primary').click(),100);true",returnByValue:true});
     await new Promise(r=>setTimeout(r,6500));
     result.backgroundPolls=(await host.evaluate('__walletPolls'))-before;assert.ok(result.backgroundPolls>0);console.log('Background polling verified');
     c.adb('shell','am','start','-W','-n','com.tenuwarrior.app/.MainActivity');await new Promise(r=>setTimeout(r,1500));
     await ui.evaluate("Warrior.request('/api/wallet/signout',{method:'POST',body:'{}'}).then(r=>r.json())");
     assert.equal(await ui.evaluate("Warrior.request('/api/wallet').then(r=>r.json()).then(r=>r.auth.status)"),'idle');result.cancelled=true;
   }
   fs.writeFileSync(path.join(out,'native-verification.json'),JSON.stringify({passed:true,...result,fixture,actualAuthorization:false},null,2));
 }
 console.log(JSON.stringify({passed:true,serial,...result}));
 await ui.evaluate("document.querySelector('#wallet-dialog').close()");
}finally{
 if(host){c.adb('shell','am','start','-W','-n','com.tenuwarrior.app/.MainActivity');await new Promise(r=>setTimeout(r,1500));await ui.evaluate("Warrior.request('/api/wallet/signout',{method:'POST',body:'{}'}).then(r=>r.json())").catch(()=>{});await host.evaluate('Capacitor.Plugins.CapacitorHttp.request=__walletOriginal;true').catch(()=>{});host.close();}
 ui.close();c.cleanup();}})().catch(e=>{console.error(e);process.exitCode=1});
