const collectionFixture=require('../test/fixtures/card-collection.cjs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
(async()=>{
 const server=createWarriorServer({paperFile:null,walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=`http://127.0.0.1:${server.address().port}`;
  await collectionFixture.install(page);await page.goto(base+'/card-lab.html#arena');await collectionFixture.ready(page);await page.locator('[data-action=open-setup]').click();await page.locator('.setup-submit:enabled').waitFor();
  await page.locator('.setup-capital summary').click();
  const limits={maxStakePct:50,exposurePct:70,stopLossPct:25,allowAllIn:true};
  for(const key of ['maxStakePct','exposurePct','stopLossPct'])await page.locator(`[data-capital-limit=${key}]`).fill(String(limits[key]));
  await page.locator('[data-capital-limit=allowAllIn]').check();
  await page.locator('[data-capital-limit=maxStakePct]').fill('101');assert.equal(await page.locator('.setup-submit').isDisabled(),true);
  await page.locator('[data-capital-limit=maxStakePct]').fill('50');
  for(const width of [1301,375]){await page.setViewportSize({width,height:1000});for(const lang of ['zh','en','ja','ko']){
   await page.keyboard.press('Escape');await page.selectOption('#language',lang);await page.locator('[data-action=open-setup]').click();await page.locator('.setup-submit:enabled').waitFor();
   await page.locator('.setup-capital summary').click();for(const key of ['maxStakePct','exposurePct','stopLossPct'])await page.locator(`[data-capital-limit=${key}]`).fill(String(limits[key]));await page.locator('[data-capital-limit=allowAllIn]').check();
   assert.ok(await page.locator('#setup-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  }}
  await page.locator('.setup-submit').click();await page.locator('#setup-dialog').waitFor({state:'hidden'});const id=await page.locator('#battle-select').inputValue();
  const battle=await(await fetch(base+'/api/simulation?battleId='+id)).json();
  for(const a of battle.agents){assert.equal(a.policy.capitalVersion,'SC-2');assert.deepEqual(a.policy.capitalLimits,limits);assert.ok(a.policy.maxStakePct<=50);assert.equal(a.policy.allowAllIn,false);assert.ok(a.policy.cardPolicyHash);}
  const copy=structuredClone(battle.config);copy.agents[0].capitalLimits.maxStakePct=100;
  const rejected=await fetch(base+'/api/simulation/battles',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'tampered',config:copy,requestId:'capital-tamper-test'})});assert.equal(rejected.status,422);
  await page.reload();await collectionFixture.ready(page);await page.locator('.battle-open').first().click();await page.locator('#battle-detail-dialog details').filter({has:page.locator('.battle-detail-effects')}).first().locator('summary').click();
  assert.ok((await page.locator('#battle-detail-dialog').innerText()).includes('70%'));await page.keyboard.press('Escape');
  await page.locator('[data-action=open-setup]').click();await page.locator('.setup-capital summary').click();assert.equal(await page.locator('[data-capital-limit=exposurePct]').inputValue(),'70');
  assert.deepEqual(errors,[]);console.log('PASS: formal HTTP frozen SC-2 limits, invalid cap disabled, tampered policy rejected, saved preferences/read-only details, four-language desktop/mobile');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
