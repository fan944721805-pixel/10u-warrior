// A real browser Response is essential: Node permits Set-Cookie where WebView
// filters it. Native network/storage are isolated fixtures; wallet/runtime/UI
// are the production code, with no successful auth response mocked at UI level.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>res.end('<!doctype html><meta charset="utf-8"><button id="profile"></button><dialog id="wallet-dialog"><div id="wallet-content"></div></dialog>'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const headerName of ['set-cookie','Set-Cookie']){
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port);
   await page.evaluate(headerName=>{
    window.__files=new Map();window.__confirmed=false;window.__created=false;window.__queriesWithCookie=0;window.__confirms=0;
    window.WarriorStorageNative={call(raw){const i=JSON.parse(raw);let value=null;
     if(i.op==='exists')value=__files.has(i.path);else if(i.op==='read'){if(!__files.has(i.path))return JSON.stringify({ok:false,code:'ENOENT'});value=__files.get(i.path);}
     else if(i.op==='write')__files.set(i.path,i.data);else if(i.op==='delete')__files.delete(i.path);
     else if(i.op==='rename'){__files.set(i.destination,__files.get(i.path));__files.delete(i.path);}
     return JSON.stringify({ok:true,value});}};
    window.Capacitor={Plugins:{CapacitorHttp:{request:async options=>{
     const path=new URL(options.url).pathname;let data={},headers={};
     if(path.endsWith('/login'))data={connectionStatus:'UNCONNECTED',qrInfo:{qrCodeUrl:'https://app.binance.com/?test=1',qrCodeId:'fixture',expireAt:Date.now()+60000}};
     else if(path.endsWith('/login/confirm')){__confirms++;data={connectionStatus:__confirmed?'CONNECTED':'UNCONNECTED'};if(__confirmed)headers[headerName]='agentSessionId=fixture-cookie; HttpOnly; Secure; Path=/';}
     else if(path.endsWith('/login/query')){if(options.headers.cookie==='agentSessionId=fixture-cookie')__queriesWithCookie++;data={connectionStatus:__confirmed?'CONNECTED':'UNCONNECTED',walletCreateStatus:__created?'CREATED':'CREATING'};}
     else if(path.endsWith('/mpc-wallet/list'))data=[];
     else if(path.endsWith('/token/list'))data={tokenList:[]};
     else if(!['/settings/query','/trading-limit/query','/networks/active','/login/logout'].some(s=>path.endsWith(s)))throw Error('Unexpected fixture request');
     return{status:200,data:{code:'000000',data},headers};
    }}}};
    window.$=s=>document.querySelector(s);window.toast=()=>{};window.openDialog=s=>$(s).showModal();
   },headerName);
   await page.addScriptTag({content:fs.readFileSync(path.join(root,'public/mobile-runtime.js'),'utf8')});
   await page.evaluate(()=>{window.__runtime=WarriorMobileRuntime.create({autoStart:false});window.Warrior={simulationApi:__runtime.api,request:__runtime.request};});
   await page.addScriptTag({content:fs.readFileSync(path.join(root,'public/wallet.js'),'utf8')});
   assert.equal(await page.evaluate(()=>new Response('{}',{headers:{'set-cookie':'fixture=value'}}).headers.get('set-cookie')),null,'Browser guard must be active');
   await page.evaluate(async()=>{await renderWallet();openDialog('#wallet-dialog');await startWalletSignin();});
   assert.equal(await page.evaluate(()=>walletAuth.status),'awaiting_scan');
   await page.evaluate(async()=>{__confirmed=true;await pollWalletAuth();});
   assert.equal(await page.evaluate(()=>walletAuth.status),'awaiting_scan','App confirmation alone is insufficient');
   await page.evaluate(()=>{__created=true;window.dispatchEvent(new Event('warrior-android-resume'));});
   await page.waitForFunction(()=>walletAuth.status==='connected' && walletState.status==='connected');
   assert.ok(await page.evaluate(()=>__queriesWithCookie>0));
   assert.ok(await page.locator('#disconnect-wallet').isVisible());
   const restored=await page.evaluate(async()=>{
    clearWalletPoll();__runtime.api.dispose();__runtime=WarriorMobileRuntime.create({autoStart:false});
    return (await (await __runtime.request('/api/wallet')).json()).wallet.status;
   });assert.equal(restored,'connected');
   // Reproduce the old installed version: confirmed phase persisted, cookie lost.
   const recovered=await page.evaluate(async()=>{
    __runtime.api.dispose();const file='/mobile/data/agentic-wallet.json',state=JSON.parse(__files.get(file));
    state.cookie='';state.auth={status:'awaiting_scan',phase:'creating',qrCodeId:'fixture',expireAt:new Date(Date.now()+60000).toISOString()};__files.set(file,JSON.stringify(state));
    const before=__confirms;__runtime=WarriorMobileRuntime.create({autoStart:false});
    const result=await(await __runtime.request('/api/wallet/auth')).json();
    return{status:result.auth.status,reconfirmed:__confirms>before,secretExposed:JSON.stringify(result).includes('fixture-cookie')};
   });assert.deepEqual(recovered,{status:'connected',reconfirmed:true,secretExposed:false});
   await page.evaluate(()=>__runtime.api.dispose());assert.deepEqual(errors,[]);await page.close();
  }
  console.log(JSON.stringify({passed:true,browserCookieGuard:true,headers:['set-cookie','Set-Cookie'],checks:['native header channel','confirmation plus creation','resume updates actual wallet UI','persisted session restore','old pending session recovery','no cookie in public snapshot']}));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
