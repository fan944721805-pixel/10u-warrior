const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
(async()=>{
  const server=createWarriorServer({paperFile:null,aiDecisionMode:'off',liveTradingEnabled:false,
    marketFetch:async()=>{throw new Error('ISOLATED')},walletCli:async()=>{throw new Error('NO_WALLET')}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext();
    await require('./price-socket-fixture.cjs')(context);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>window.Warrior?.i18n);
    // Exercise the same mutation-based translation path used by decision reasons.
    await page.evaluate(()=>{const p=document.createElement('p');p.id='direction-reason-fixture';p.textContent='结合本轮开盘位置与剩余时间，修正结算方向';p.style.cssText='max-width:100%;overflow-wrap:anywhere';document.querySelector('main').prepend(p);});
    for(const width of [360,768,1440]) {
      await page.setViewportSize({width,height:900});
      for(const lang of ['en','zh','ja','ko']) {
        await page.locator('.language-toggle').selectOption(lang);
        const translated=await page.evaluate(()=>window.Warrior.i18n.t('结合本轮开盘位置与剩余时间，修正结算方向'));
        assert.equal(await page.locator('#direction-reason-fixture').innerText(),translated);
        if(lang==='en')assert.match(translated,/Adjusted settlement direction/);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.ok(await page.locator('.language-toggle').evaluate(el=>el.getBoundingClientRect().height>=48));
      }
    }
    assert.deepEqual(errors,[]);console.log('PASS: direction reason, four locales, 360/768/1440px, isolated UI only');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
