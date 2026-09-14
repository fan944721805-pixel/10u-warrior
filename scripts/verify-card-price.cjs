const collectionFixture=require('../test/fixtures/card-collection.cjs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
(async()=>{
 const server=createWarriorServer({paperFile:null,walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const p=await browser.newPage(),sockets=[],errors=[],writes=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.method()!=='GET')writes.push(r.method()+' '+new URL(r.url()).pathname);});
  await p.routeWebSocket('wss://data-stream.binance.vision/**',ws=>sockets.push(ws));
  await p.clock.install();await collectionFixture.install(p);await p.goto('http://127.0.0.1:'+server.address().port+'/card-lab.html#arena');await collectionFixture.ready(p);writes.length=0;
  const before=await p.evaluate(()=>CardLab.getSnapshot());
  const until=async pred=>{for(let i=0;i<100&&!pred();i++)await new Promise(r=>setTimeout(r,20));assert.ok(pred());};
  const send=(ws,symbol,price,time=Date.now())=>ws.send(JSON.stringify({e:'aggTrade',s:symbol,p:String(price),T:time}));
  await until(()=>sockets.length===1);send(sockets[0],'ETHUSDT',3333);await p.waitForTimeout(300);assert.equal(await p.locator('#arena-price-value').innerText(),'—');
  send(sockets[0],'BTCUSDT',78901.23);await p.locator('#arena-price[data-state=live]').waitFor();assert.equal(await p.locator('#arena-price-value').innerText(),'78,901.23');
  for(const locale of ['zh','en','ja','ko']){await p.locator('#language').selectOption(locale);assert.equal(await p.locator('#arena-price').getAttribute('data-state'),'live');assert.equal(sockets.length,1);}
  for(const [asset,price] of [['ETH',3201.25],['BNB',612.45]]){
   const count=sockets.length;await p.locator('[data-action=open-setup]').click();for(const input of await p.locator('[data-setup-card]').all()){const id=await input.getAttribute('data-setup-card');await input.setChecked(id==='sample-kzg');}await p.locator('[data-setup-key=asset][data-value='+asset+']').click();await p.locator('#setup-form [type=submit]').click();await p.locator('#setup-dialog').waitFor({state:'hidden'});
   await until(()=>sockets.length===count+1);assert.ok(sockets.at(-1).url().includes(asset.toLowerCase()+'usdt'));assert.equal(await p.locator('#arena-price-value').innerText(),'—');
   send(sockets.at(-1),asset+'USDT',price);await p.locator('#arena-price[data-state=live]').waitFor();assert.ok(!(await p.locator('.arena-session-heading h2').innerText()).includes('概览'));
  }
  assert.equal(await p.locator('.arena-session h2').count(),0);
  await p.clock.fastForward(16000);assert.equal(await p.locator('#arena-price-value').innerText(),'—');
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await p.locator('#arena-price').getAttribute('data-state'),'unavailable');
  const n=sockets.length;await p.clock.fastForward(60000);assert.equal(sockets.length,n);
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await until(()=>sockets.length>n);
  const after=await p.evaluate(()=>CardLab.getSnapshot());assert.deepEqual(after.cards,before.cards);assert.ok(!Object.hasOwn(after,'arenaQuote'));assert.deepEqual(errors,[]);assert.deepEqual(writes,['POST /api/simulation/battles','POST /api/simulation/battles']);
  console.log('PASS: current symbol routing, no old-coin quote, translated live state without reconnect, expired price cleared, background pause/resume, session title moved, no trading writes');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
