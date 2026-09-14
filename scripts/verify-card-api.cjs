const collectionFixture=require('../test/fixtures/card-collection.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-card-api-'));let calls=0,reject=false;
 const server=createWarriorServer({paperFile:null,aiConnectionsFile:path.join(dir,'connections.json'),walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');},aiFetch:async()=>{calls++;if(reject)return {ok:false,status:401};return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({round_id:'connection-test',action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:0,risk_mode:'WAIT',data_fresh:true,reason:'fixture',factors:[],warnings:[]})},finish_reason:'stop'}]})};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}/card-lab.html#arena`;
  await collectionFixture.install(page);await page.goto(url);await collectionFixture.ready(page);await page.locator('#api-connect').click();await page.locator('#api-preview-key:enabled').waitFor();
  await page.locator('#api-preview-key').fill('isolated-test-secret');await page.locator('#api-preview-model').fill('fixture-model');await page.locator('#api-preview-form [type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#api-preview-result')?.textContent.includes('设置已保存'));assert.equal(calls,0,'saving must not call provider');assert.equal(await page.locator('#api-preview-key').inputValue(),'');
  const vault=fs.readFileSync(path.join(dir,'connections.json'),'utf8');assert.ok(!vault.includes('isolated-test-secret'));
  await page.keyboard.press('Escape');await page.reload();await collectionFixture.ready(page);await page.locator('#api-connect').click();await page.locator('#api-preview-key:enabled').waitFor();assert.equal(await page.locator('#api-preview-model').inputValue(),'fixture-model');assert.equal(await page.locator('#api-preview-key').inputValue(),'');
  await page.locator('[data-action=test-api]').click();await page.waitForFunction(()=>document.querySelector('#api-preview-status')?.textContent==='连接已验证');assert.equal(calls,1);
  reject=true;await page.locator('#api-preview-model').fill('replacement-model');await page.locator('[data-action=test-api]').click();await page.waitForFunction(()=>document.querySelector('#api-preview-status')?.textContent==='连接检查失败');assert.ok((await page.locator('#api-preview-result').innerText()).includes('AI_AUTH_FAILED'));
  assert.equal(await page.locator('#api-preview-key').inputValue(),'');
  await page.locator('[data-action=clear-api]').click();await page.waitForFunction(()=>document.querySelector('#api-preview-result')?.textContent==='已移除连接');assert.equal((await (await fetch(url.split('/card-lab')[0]+'/api/ai/settings')).json()).connections.length,0);
  for(const width of [1301,375]){await page.setViewportSize({width,height:900});for(const lang of ['zh','en','ja','ko']){await page.keyboard.press('Escape');await page.selectOption('#language',lang);await page.locator('#api-connect').click();await page.locator('#api-preview-key:enabled').waitFor();assert.ok(await page.locator('#api-preview-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}}
  await page.keyboard.press('Escape');await page.route('**/api/ai/settings',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'RUNTIME_UNAVAILABLE'})}));await page.locator('#api-connect').click();await page.waitForFunction(()=>document.querySelector('#api-preview-form')?.getAttribute('aria-busy')==='false');assert.ok(await page.locator('#api-preview-key').isDisabled());
  assert.deepEqual(errors,[]);console.log('PASS: real HTTP configuration save/reload/encryption, no automatic provider call, explicit check, failed replacement, remove, unavailable service, four-language desktop/mobile dialog');
 }finally{await browser?.close();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
