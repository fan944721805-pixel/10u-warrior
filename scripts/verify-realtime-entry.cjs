const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
const {createSimulationBattles}=require('../simulation-battles');
const {createMockDecisionProvider}=require('../ai-decision');

(async()=>{
  const isolated=async()=>{throw new Error('ISOLATED_FIXTURE');};
  const simulation=createSimulationBattles({source:{marketFor:isolated,book:isolated,detail:isolated},indicatorSource:{snapshot:isolated},decisionProvider:createMockDecisionProvider(),leaseEnabled:false});
  const battle=simulation.create('UI fixture',{agents:[{id:'flow',strategy:'orderFlow',coin:'BTC'}]});
  const server=createWarriorServer({simulation,paperFile:null,liveTradingEnabled:false,marketFetch:isolated,walletCli:isolated});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-realtime-entry-ui-'));
  let browser;
  try {
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:360,height:800}});
    await require('./price-socket-fixture.cjs')(context);
    await context.addInitScript(id=>localStorage.setItem('warrior-selected-battle',id),battle.id);
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(id=>window.Warrior?.state?.simulation?.id===id,battle.id);
    console.log(await page.locator('#simulation-commandbar').ariaSnapshot());
    for(const width of [360,768,1440]) {
      await page.setViewportSize({width,height:900});
      for(const locale of ['zh','en']) {
        await page.locator('.language-toggle').selectOption(locale);
        await page.locator('#battle-settings-open').click();
        const toggle=page.locator('#battle-realtime-entry');
        await toggle.setChecked(true);
        await page.waitForFunction(()=>window.Warrior.state.simulation.config.realtimeEntry===true);
        assert.equal(simulation.snapshot(battle.id).config.realtimeEntry,true);
        const bounds=await page.locator('#battle-settings-dialog').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,width:el.getBoundingClientRect().width,labelHeight:el.querySelector('.realtime-entry-label').getBoundingClientRect().height,text:el.querySelector('.realtime-entry-control').textContent}));
        assert.ok(!bounds.overflow&&bounds.width<=width&&bounds.labelHeight>=48,JSON.stringify(bounds));
        assert.match(bounds.text,locale==='en'?/Signal-based entry/:/实时进场/);
        await page.screenshot({path:path.join(output,`${width}-${locale}.png`)});
        await toggle.setChecked(false);
        await page.waitForFunction(()=>window.Warrior.state.simulation.config.realtimeEntry===false);
        await page.locator('#battle-settings-dialog .icon-button').click();
      }
    }
    await page.locator('#battle-settings-open').click();await page.locator('#battle-realtime-entry').check();
    await page.waitForFunction(()=>window.Warrior.state.simulation.config.realtimeEntry===true);
    await page.reload();await page.waitForFunction(()=>window.Warrior?.state?.simulation?.config?.realtimeEntry===true);
    await page.locator('#battle-settings-open').click();assert.equal(await page.locator('#battle-realtime-entry').isChecked(),true);
    await page.locator('#battle-settings-dialog .icon-button').click();
    await page.locator('#sim-create button[type=submit]').click();
    console.log((await page.locator('#create-dialog').ariaSnapshot()).slice(-2200));
    await page.locator('#create-realtime-entry').check();
    await page.locator('#create-form button[type=submit]').click();
    await page.locator('#confirm-create').click();
    await page.waitForFunction(id=>window.Warrior.state.simulation.id!==id,battle.id);
    assert.equal(await page.evaluate(()=>window.Warrior.state.simulation.config.realtimeEntry),true);
    const offlinePage=await context.newPage();
    await offlinePage.goto(`http://127.0.0.1:${server.address().port}/?offline=1`);
    await offlinePage.waitForFunction(()=>window.Warrior?.state?.simulation);
    await offlinePage.locator('#battle-settings-open').click();
    assert.equal(await offlinePage.locator('#battle-realtime-entry').isDisabled(),true);
    assert.match(await offlinePage.locator('#battle-realtime-entry-hint').textContent(),/offline|离线/);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,widths:[360,768,1440],locales:['zh','en'],output}));
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
