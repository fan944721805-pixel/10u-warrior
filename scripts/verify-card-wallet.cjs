const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createPreviewServer}=require('./serve-card-lab.cjs');
const collection=require('../test/fixtures/card-collection.cjs');
const {qrImage}=require('../mobile/wallet.cjs');
(async()=>{
 const server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage(),errors=[],writes=[];let mode='idle',loseResponse=false,polls=0;
  page.on('pageerror',e=>errors.push(e.message));await collection.installReadOnly(page);
  const auth=()=>mode==='pending'?{status:'awaiting_scan',pairingCode:'abc123',urlForWeb:'https://app.binance.com/?fixture=1',qrImage:qrImage('https://app.binance.com/?fixture=1'),expireAt:new Date(Date.now()+60000).toISOString()}:{status:mode==='connected'?'connected':mode==='expired'?'expired':'idle'};
  await page.route('**/api/wallet{,/**}',async route=>{
   const url=new URL(route.request().url()),post=route.request().method()==='POST';
   if(post){writes.push(url.pathname);mode=url.pathname.endsWith('signin')?'pending':'idle';if(loseResponse){loseResponse=false;await route.abort();return;}}
   if(mode==='offline'){await route.fulfill({status:503,json:{code:'BINANCE_NETWORK_FAILED'}});return;}
   if(url.pathname.endsWith('/auth'))polls++;
   await route.fulfill({json:url.pathname==='/api/wallet'?{wallet:{status:mode==='connected'?'connected':'unconnected',primaryAddress:{address:'0x1234567890123456789012345678901234567890',chainName:'BNB Smart Chain'}},auth:auth(),accountValue:123.45,balances:[{symbol:'USDT',balance:'123.45',value:123.45}],settings:{predictionEnabled:true,predictionQuotaLeft:10,abnormalTxnHandling:'NeedConfirmation',sessionExpireTime:'2026-10-01T00:00:00Z'},txLock:{status:'LOCKED'}}:{auth:auth()}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/card-lab.html?style=original#arena');await collection.ready(page);
  assert.deepEqual(writes,[]);await page.locator('#wallet-shortcut').click();await page.locator('[data-wallet-action=signin]:enabled').waitFor();assert.deepEqual(writes,[]);
  loseResponse=true;await page.locator('[data-wallet-action=signin]').click();await page.locator('[data-wallet-action=refresh]:enabled').waitFor();assert.equal(writes.length,1);
  assert.match(await page.locator('#card-wallet-dialog').innerText(),/尚未确认/);await page.locator('[data-wallet-action=refresh]').click();await page.locator('.card-wallet-qr').waitFor();assert.equal(writes.length,1);
  assert.equal(await page.locator('.card-wallet-qr').evaluate(el=>el.complete&&el.naturalWidth>0),true,'native SVG QR renders');
  await page.keyboard.press('Escape');const before=polls;await page.waitForTimeout(2200);assert.equal(polls,before,'closed dialog does not poll');
  mode='connected';await page.locator('#wallet-shortcut').click();await page.locator('[data-wallet-action=signout]:enabled').waitFor();assert.match(await page.locator('.card-wallet-value').innerText(),/123.45/);
  await page.locator('[data-wallet-action=signout]').click();await page.locator('[data-wallet-action=signin]:enabled').waitFor();assert.equal(mode,'idle');
  let layouts=0;
  for(const width of [360,768,1301])for(const lang of ['zh','en','ja','ko'])for(const next of ['idle','pending','connected','offline','expired']){
   await page.keyboard.press('Escape');await page.setViewportSize({width,height:1000});await page.locator('#language').selectOption(lang);mode=next;await page.locator('#wallet-shortcut').click();
   await page.locator(`[data-wallet-action=${next==='pending'?'poll':next==='connected'?'signout':next==='offline'?'refresh':'signin'}]:enabled`).waitFor();
   const dimensions=await page.locator('#card-wallet-dialog').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,page:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(dimensions.scroll<=dimensions.width+1&&dimensions.page<=dimensions.viewport+1,JSON.stringify({width,lang,next,dimensions}));
   assert.equal(await page.locator('[data-wallet-action]').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=48)),true,'wallet touch targets >=48px');
   const text=await page.locator('#card-wallet-dialog').innerText();assert.ok(!text.includes('walletReadOnly')&&!text.includes('walletPreview'));layouts++;
  }
  await page.keyboard.press('Escape');await page.setViewportSize({width:1301,height:1000});await page.locator('#language').selectOption('zh');mode='connected';await page.locator('#wallet-shortcut').click();await page.locator('[data-wallet-action=signout]:enabled').waitFor();
  fs.mkdirSync('artifacts/card-lab',{recursive:true});await page.screenshot({path:'artifacts/card-lab/wallet-connected.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(writes,['/api/wallet/signin','/api/wallet/signout']);console.log(JSON.stringify({passed:true,layouts,checks:['explicit signin only','uncertain result reconciled without repeat','native SVG QR','close stops polling','confirmed disconnect','four languages','responsive layout','no trade requests']}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
