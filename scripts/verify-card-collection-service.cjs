const assert=require('node:assert/strict'),fs=require('node:fs');
fs.mkdirSync('artifacts/card-lab',{recursive:true});
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server'),D=require('../public/card-lab-data');
const key='warrior-single-card-concept-v2';
(async()=>{
 let time=1800000000000;const servers=[];let browser;
 async function start(){const server=createWarriorServer({paperFile:null,now:()=>time,walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');}});servers.push(server);await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;}
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
  const fresh=await browser.newPage(),freshBase=await start();fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(freshBase+'/card-lab.html?style=original#draw');
  await fresh.waitForFunction(()=>CardLab.getSnapshot().collection.status==='ready'&&!CardLab.getSnapshot().collection.busy);
  assert.equal((await fresh.evaluate(()=>CardLab.getSnapshot())).cards.length,0);assert.equal(await fresh.locator('.draw-empty-card').count(),1);await fresh.screenshot({path:'artifacts/card-lab/collection-empty.png',fullPage:true});
  await fresh.locator('[data-action=draw]').click();await fresh.waitForFunction(()=>CardLab.getSnapshot().cards.length===1&&!CardLab.getSnapshot().collection.busy);assert.equal((await fresh.evaluate(()=>CardLab.getSnapshot())).drawBudget.remaining,4);
  await fresh.reload();await fresh.waitForFunction(()=>CardLab.getSnapshot().cards.length===1);assert.equal((await fresh.evaluate(()=>CardLab.getSnapshot())).drawBudget.remaining,4);await fresh.close();
  const base=await start(),context=await browser.newContext({viewport:{width:1301,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const cards=D.order.map((id,i)=>D.makeCard(id,D.personas[id].styles[0],i+1,'owned-'+id));
  const source={cards,featured:cards[0],roster:cards.slice(0,4).map(c=>c.id),locale:'zh'};
  await context.addInitScript(({key,source,time})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(source));localStorage.setItem(key+'-draws',JSON.stringify({remaining:5,nextAt:null}));}},{key,source,time});
  const snap=()=>page.evaluate(()=>CardLab.getSnapshot()),ready=()=>page.waitForFunction(()=>CardLab.getSnapshot().collection.status==='ready'&&!CardLab.getSnapshot().collection.busy);
  await page.goto(base+'/card-lab.html?style=original#collection');await ready();assert.equal((await snap()).cards.length,19);assert.equal((await snap()).roster.length,4);
  assert.deepEqual(JSON.parse((await page.evaluate(key=>localStorage.getItem(key+'-service-backup'),key))).collection,JSON.stringify(source));
  const id=cards[0].id;await page.locator(`[data-card-id="${id}"] [data-action=detail]`).click();const before=(await snap()).cards.find(c=>c.id===id);
  await page.locator('[data-action=reroll-attributes]').click();await page.waitForFunction(id=>CardLab.getSnapshot().cards.find(c=>c.id===id).revision===1,id);await ready();assert.notDeepEqual((await snap()).cards.find(c=>c.id===id).stats,before.stats);assert.equal((await snap()).drawBudget.remaining,4);await page.keyboard.press('Escape');
  await page.reload();await ready();assert.equal((await snap()).roster.length,4);
  await page.locator('#navigation [data-page=draw]').click();await page.locator('[data-action=draw]').click();await ready();let s=await snap();assert.ok(s.pendingDraw);const target=s.cards.find(c=>c.personaId===s.pendingDraw.personaId),pending=s.pendingDraw;
  await page.locator('[data-action=replace-owned]').click();await page.locator('[data-action=confirm-replacement]').click();await page.locator('#replace-dialog').waitFor({state:'hidden'});await ready();s=await snap();assert.equal(s.pendingDraw,null);assert.equal(s.cards.find(c=>c.id===target.id).styleId,pending.styleId);assert.equal(s.cards.find(c=>c.id===target.id).revision,(target.revision||0)+1);assert.equal(s.drawBudget.remaining,3);
  await page.locator('[data-action=draw]').click();await ready();s=await snap();const keep=s.cards.find(c=>c.personaId===s.pendingDraw.personaId);await page.locator('main [data-action=keep-owned]').click();await ready();assert.deepEqual((await snap()).cards.find(c=>c.id===keep.id),keep);assert.equal((await snap()).drawBudget.remaining,2);
  // A response lost after service commit must be retried under the original receipt.
  await page.route('**/api/cards/action',async route=>{await route.fetch();await route.abort();await page.unroute('**/api/cards/action');});
  await page.locator('[data-action=draw]').click();await page.waitForFunction(()=>CardLab.getSnapshot().collection.status==='error');assert.ok((await snap()).collection.pending);
  await page.reload();await ready();assert.equal((await snap()).drawBudget.remaining,1);
  await page.locator('[data-action=draw]').click();await ready();assert.equal((await snap()).drawBudget.remaining,0);assert.equal(await page.locator('[data-action=draw]').isDisabled(),true);
  await page.locator('#navigation [data-page=arena]').click();await page.locator('[data-action=open-setup]').click();assert.equal(await page.locator('.setup-draw-button').isDisabled(),true);assert.match(await page.locator('.setup-draw-button').innerText(),/冷却/);await page.keyboard.press('Escape');
  time+=600001;await page.locator('#navigation [data-page=draw]').click();await page.waitForFunction(()=>CardLab.getSnapshot().drawBudget.remaining===1,{},{timeout:10000});
  for(const width of [1301,768,375]){await page.setViewportSize({width,height:1000});for(const lang of ['zh','en','ja','ko']){await page.selectOption('#language',lang);for(const route of ['draw','collection']){await page.evaluate(r=>location.hash=r,route);await page.waitForFunction(r=>CardLab.getPage()===r,route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${lang}/${route}`);}}}
  await page.screenshot({path:'artifacts/card-lab/collection-service-mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: empty first use, legacy backup/import, server-owned allowance, attribute refresh, duplicate replacement/discard, uncertain retry/reload, cooldown and 24 localized responsive page layouts');
 }finally{await browser?.close();for(const server of servers)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
