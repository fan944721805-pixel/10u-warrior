const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
const {profiles,indicators}=require('../public/strategy-catalog');
const {buildDecisionContext,normalizePolicy}=require('../ai-decision');
const {calculateIndicatorSnapshot}=require('../market-indicators');
const {rows,depth}=require('../test/fixtures/indicator-series.cjs');
(async()=>{
  const now=1800000000000;
  const snapshot=calculateIndicatorSnapshot({symbol:'BTCUSDT',klines:rows(now),depth,receivedAt:now});
  const server=createWarriorServer({paperFile:null,aiDecisionMode:'off',liveTradingEnabled:false,indicatorSource:{snapshot:async()=>snapshot},walletCli:async()=>{throw Error('NO_WALLET');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-indicators-ui-'));
  let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:393,height:900}});
    await require('./price-socket-fixture.cjs')(context);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const origin=`http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);await page.waitForFunction(()=>window.Warrior?.state?.simulation);
    console.log(await page.locator('#api-connect').ariaSnapshot());
    await page.locator('#api-connect').click();await page.locator('#ai-settings-strategy-tab').click();
    assert.equal(await page.locator('[data-agent-strategy]').count(),12);
    assert.equal(await page.locator('.agent-indicator-grid input').count(),26);
    for(const profile of Object.values(profiles)){
      await page.locator('#ai-editor-basic-tab').click();
      await page.locator(`[data-agent-strategy=${profile.key}]`).click();
      assert.equal(await page.locator('#max-stake').inputValue(),String(profile.maxStakePct));
      assert.equal(await page.locator('#agent-all-in').isDisabled(),!profile.allowAllIn);
      if(profile.allowAllIn){
        await page.locator('#ai-editor-policy-tab').click();await page.locator('#max-stake').fill('50');
        assert.equal(await page.locator('#agent-all-in').isDisabled(),true);assert.equal(await page.locator('#agent-all-in').isChecked(),false);
        assert.match(await page.locator('#agent-all-in-note').innerText(),/100%/);
        await page.locator('#ai-editor-basic-tab').click();await page.locator(`[data-agent-strategy=${profile.key}]`).click();
      }
      await page.locator('#ai-editor-inputs-tab').click();
      assert.equal(await page.locator('#agent-indicator-auto').isChecked(),true);
      assert.deepEqual((await page.locator('.agent-indicator-grid input:checked').evaluateAll(inputs=>inputs.map(input=>input.value))).sort(),[...profile.recommended].sort());
      for(const key of profile.required){assert.equal(await page.locator(`.agent-indicators input[value=${key}]`).isChecked(),true);assert.equal(await page.locator(`.agent-indicators input[value=${key}]`).isDisabled(),true);}
      const saved=page.waitForResponse(r=>r.url().endsWith('/api/simulation/strategies')&&r.request().method()==='POST');
      await page.locator('#save-agent').click();const response=await saved;assert.equal(response.status(),200);
      const agent=(await response.json()).agents[0];assert.equal(agent.strategy,profile.key);assert.equal(agent.maxStakePct,profile.maxStakePct);
    }
    await page.locator('#ai-editor-inputs-tab').click();await page.locator('#agent-indicator-auto').uncheck();
    assert.equal(await page.locator('#agent-indicator-advanced').getAttribute('open'),'');
    await page.locator('.indicator-actions button').first().click();
    assert.equal(await page.locator('#agent-indicator-count').textContent(),'26 / 26');
    const allSaved=page.waitForResponse(r=>r.url().endsWith('/api/simulation/strategies')&&r.request().method()==='POST');
    await page.locator('#save-agent').click();assert.equal((await (await allSaved).json()).agents[0].indicators.length,26);
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:900});
      for(const lang of ['zh-CN','en']){
        await page.locator('.api-dialog-close').click();
        if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('.language-toggle').selectOption(lang === 'zh-CN' ? 'zh' : lang);
        await page.locator('#api-connect').click();await page.locator('#ai-settings-strategy-tab').click();
        for(const section of ['basic','inputs']){
          await page.locator(`#ai-editor-${section}-tab`).click();
          const layout=await page.evaluate(()=>{const d=document.querySelector('#api-dialog');return d.scrollWidth<=d.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth;});assert.ok(layout,`${width} ${lang} ${section}`);
          if(section==='basic')assert.equal(await page.locator('[data-agent-strategy=trendFollowing]').textContent(),lang==='en'?'Trend Chaser':'跟风侠');
          assert.equal(await page.locator(`#ai-editor-${section}-tab`).getAttribute('aria-selected'),'true');
          await page.screenshot({path:path.join(output,`${width}-${lang}-${section}.png`),animations:'disabled'});
        }
      }
    }
    await page.locator('.api-dialog-close').click();await page.reload();
    await page.waitForFunction(()=>window.agentSetup?.getAgents()[0].strategy==='priceAction');
    assert.equal(await page.evaluate(()=>window.agentSetup.getAgents()[0].indicators.length),26);
    const policy=normalizePolicy({strategy:'consensus',indicators:Object.keys(indicators)},'A');
    const input=buildDecisionContext({policy,indicators:snapshot,market:{roundId:'UI-fixture',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},account:{balance:100}});
    await page.evaluate(({input,policy})=>{const agent=window.Warrior.state.simulation.agents[0];agent.policy=policy;agent.lastDecision={roundId:'UI-fixture',action:'SKIP',reason:'TEST FIXTURE ONLY',indicators:input.indicators,engine:{mode:'mock'}};window.openModelDetail('claude');},{input,policy});
    assert.equal(await page.locator('.indicator-snapshot > div').count(),26);
    assert.ok(await page.evaluate(()=>document.querySelector('#detail-dialog').scrollWidth<=document.querySelector('#detail-dialog').clientWidth+1));
    await page.locator('#detail-dialog .close-dialog').click();
    // A stale service must not silently turn a new strategy into smart/aggressive.
    await page.route('**/api/simulation/strategies',route=>route.fulfill({json:{agents:[]}}));
    let writes=0;page.on('request',r=>{if(r.method()==='POST')writes++;});
    const code=await page.evaluate(async()=>{try{await window.Warrior.simulationApi.create('must not create',{initialBalance:10,rounds:1,agents:window.agentSetup.getAgents().slice(0,6)});return null;}catch(error){return error.code;}});
    assert.equal(code,'STRATEGY_SERVICE_UPGRADE_REQUIRED');assert.equal(writes,0);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',output,checks:'12 strategies / 26 inputs, caps, required inputs, server sync, reload, 26-input detail, old-server guard, zh/en 360/768/1440; fixtures only'}));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
