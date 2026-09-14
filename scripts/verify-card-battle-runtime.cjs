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
  await collectionFixture.install(page);await page.goto(url);await collectionFixture.ready(page);await page.locator('[data-action=open-setup]').waitFor();const initial=await(await fetch(base+'/api/simulation/battles')).json();
  await page.locator('[data-action=open-setup]').click();await page.locator('#setup-budget').fill('100');await page.locator('.setup-submit:enabled').waitFor();await page.locator('.setup-submit').click();await page.locator('#setup-dialog').waitFor({state:'hidden'});
  const after=await(await fetch(base+'/api/simulation/battles?view=full')).json();assert.equal(after.battles.length,initial.battles.length+1);
  const created=after.battles.at(-1);assert.equal(created.config.initialBalance,100);assert.equal(created.agents.length,4);
  assert.ok(created.agents.every(a=>a.policy.cardSnapshot&&a.policy.cardPolicyHash&&a.policy.aiConnectionId==='none'));
  assert.equal(await page.locator('#battle-select').inputValue(),created.id);assert.equal(await page.locator('.battle-card').count(),4);
  const uiCash=await page.locator('.battle-card .battle-money strong').allTextContents();assert.ok(uiCash.every(s=>s==='100.00U'));assert.equal(created.agents.reduce((n,a)=>n+a.orders.length,0),0);
  await page.reload();await collectionFixture.ready(page);await page.waitForFunction(id=>document.querySelector('#battle-select')?.value===id,created.id);
  await page.locator('.battle-open').first().click();assert.equal(await page.locator('.agent-equity-chart').count(),1);assert.ok((await page.locator('#battle-detail-dialog').innerText()).includes('100.00'));
  await page.keyboard.press('Escape');await page.locator('[data-action=pause-battle]').click();await page.locator('[data-action=resume-battle]').waitFor();
  assert.equal((await(await fetch(base+'/api/simulation?battleId='+created.id)).json()).enabled,false);
  await page.locator('[data-action=end-battle]').click();await page.waitForFunction(()=>!document.querySelector('[data-action=end-battle]'));
  assert.equal((await(await fetch(base+'/api/simulation?battleId='+created.id)).json()).status,'ended');
  for(const width of [1301,375]){await page.setViewportSize({width,height:1000});for(const lang of ['zh','en','ja','ko']){await page.selectOption('#language',lang);assert.ok(await page.locator('.arena-classic').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.locator('.battle-open').first().click();assert.ok(await page.locator('#battle-detail-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.keyboard.press('Escape');}}
  assert.deepEqual(errors,[]);console.log('PASS: formal HTTP creation, frozen cards, local model selection, persisted selection, ledger balances/chart, pause/end and four-language desktop/mobile arena');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
