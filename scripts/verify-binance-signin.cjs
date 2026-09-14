// Real signin request using a fresh, memory-only test client. Never authorizes
// the request, reads existing wallet credentials, or performs a transaction.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {PNG}=require('pngjs'),decode=require('jsqr');
const {storageBridge}=require('../test/fixtures/mobile-runtime.cjs');
globalThis.WarriorStorageNative=storageBridge();
const {createMobileWallet}=require('../mobile/wallet.cjs');
const out=path.resolve(__dirname,'../test-results/mobile-wallet');fs.mkdirSync(out,{recursive:true});
(async()=>{
 let browser;const responses=[];
 const wallet=createMobileWallet({autoStart:false,fetchImpl:async(url,options)=>{
   const response=await fetch(url,options);const data=await response.clone().json();
   responses.push({path:new URL(url).pathname,http:response.status,code:data.code});return response;
 }});
 try{
   const {auth}=await wallet.call('signin');assert.equal(auth.status,'awaiting_scan');
   browser=await chromium.launch({channel:'chrome',headless:true});
   const page=await browser.newPage({viewport:{width:400,height:400},deviceScaleFactor:3});
   await page.setContent('<img width="280" height="280" alt="Test authorization QR">');
   await page.locator('img').evaluate(async(img,src)=>{img.src=src;await img.decode();},auth.qrImage);
   const png=await page.locator('img').screenshot({path:path.join(out,'official-signin-qr.png')});
   const pixels=PNG.sync.read(png),qr=decode(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height);
   assert.equal(qr?.data,auth.urlForWeb,'independent QR decoder must recover the exact official URL');
   const proof={passed:true,at:new Date().toISOString(),responses,host:new URL(auth.urlForWeb).host,
     independentQrDecode:true,pairingLength:auth.pairingCode.length,actualAuthorization:false};
   fs.writeFileSync(path.join(out,'official-signin-verification.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
 }finally{wallet.dispose();await browser?.close();}
})().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
