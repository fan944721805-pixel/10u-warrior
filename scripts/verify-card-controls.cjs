const collectionFixture=require('../test/fixtures/card-collection.cjs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
(async()=>{
 const server=createWarriorServer({paperFile:null,walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=`http://127.0.0.1:${server.address().port}`,url=base+'/card-lab.html#arena';
  await collectionFixture.install(page);await page.goto(url);await collectionFixture.ready(page);await page.locator('[data-action=open-setup]').click();await page.locator('.setup-submit:enabled').waitFor();await page.locator('.setup-submit').click();await page.locator('#setup-dialog').waitFor({state:'hidden'});
  const id=await page.locator('#battle-select').inputValue(),read=async()=>(await(await fetch(base+'/api/simulation?battleId='+id)).json());
  await page.locator('[data-action=controls]').click();await page.locator('[data-preset=chaos]').click();
  assert.equal((await read()).config.globalControls.urge,0,'draft must not mutate runtime');
  await page.keyboard.press('Escape');await page.locator('[data-action=controls]').click();assert.equal(await page.locator('#control-urge').inputValue(),'0');
  await page.locator('[data-preset=chaos]').click();await page.locator('[data-action=apply-controls]').click();await page.locator('#controls-dialog').waitFor({state:'hidden'});
  const applied=await read();assert.deepEqual(applied.config.globalControls,{urge:100,tilt:80,gain:150,cooling:'slow',variance:50});assert.equal(applied.config.controlsRevision,1);
  await page.reload();await collectionFixture.ready(page);await page.locator('[data-action=controls]:enabled').waitFor();await page.locator('[data-action=controls]').click();assert.equal(await page.locator('#control-gain').inputValue(),'150');assert.equal(await page.locator('#cooling').inputValue(),'slow');
  const concurrent={urge:20,tilt:10,gain:100,cooling:'fast',variance:5};
  const post=body=>fetch(base+'/api/simulation/global-controls',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await post({battleId:id,controls:concurrent,revision:1})).status,200);
  await page.locator('[data-preset=original]').click();await page.locator('[data-action=apply-controls]').click();await page.locator('#controls-dialog [role=alert]').waitFor();
  assert.ok((await page.locator('#controls-dialog [role=alert]').innerText()).includes('重新打开'));assert.deepEqual((await read()).config.globalControls,concurrent);
  await page.keyboard.press('Escape');await page.locator('[data-action=controls]').click();assert.equal(await page.locator('#control-urge').inputValue(),'20');
  for(const width of [1301,375]){await page.setViewportSize({width,height:1000});for(const lang of ['zh','en','ja','ko']){await page.keyboard.press('Escape');await page.selectOption('#language',lang);await page.locator('[data-action=controls]').click();assert.ok(await page.locator('#controls-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.equal(await page.locator('#controls-dialog [data-control]').count(),4);assert.ok((await page.locator('[data-action=apply-controls]').innerText()).length>0);}}
  await page.route('**/api/simulation/global-controls',r=>r.fulfill({status:503,contentType:'application/json',body:'{"code":"SERVICE_UNAVAILABLE"}'}));await page.locator('[data-preset=original]').click();await page.locator('[data-action=apply-controls]').click();await page.locator('#controls-dialog [role=alert]').waitFor();assert.deepEqual((await read()).config.globalControls,concurrent);
  assert.equal((await post({battleId:id,controls:{...concurrent,gain:201},revision:2})).status,400);assert.deepEqual(errors,[]);
  console.log('PASS: formal HTTP five-control apply, cancel/reload, concurrent-write protection, validation, failure without fake save, four-language desktop/mobile');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
