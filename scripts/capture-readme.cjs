// Current responsive UI, isolated service ledger and explicit screenshot cards.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
const collection=require('../test/fixtures/card-collection.cjs');
(async()=>{
 const output=path.resolve(__dirname,'../docs/images');fs.mkdirSync(output,{recursive:true});
 const server=createWarriorServer({paperFile:null,liveTradingEnabled:false,walletCli:async()=>{throw Error('SCREENSHOT_NO_WALLET');},marketFetch:async()=>{throw Error('SCREENSHOT_NO_MARKET');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({channel:'chrome',headless:true});
 try{const context=await browser.newContext({reducedMotion:'reduce',locale:'zh-CN'});await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.routeWebSocket('wss://**',()=>{});await collection.install(page);await page.goto(origin+'/#arena');await collection.ready(page);
 await page.locator('[data-action=open-setup]').click();await page.locator('#setup-budget').fill('10');await page.locator('.setup-submit:enabled').click();await page.locator('#setup-dialog').waitFor({state:'hidden'});await page.locator('.battle-card').first().waitFor();
 for(const [name,width,height] of [['desktop',1440,1050],['mobile',390,980]]){await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.mouse.move(0,0);await page.evaluate(name=>scrollTo(0,name==='mobile'?document.querySelector('.battle-cards').getBoundingClientRect().top+scrollY-document.querySelector('.topbar').getBoundingClientRect().height-20:0),name);await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({output,desktop:'1440x1050',mobile:'390x980',mode:'isolated service ledger; fixture collection; no external market/wallet/model requests'}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
