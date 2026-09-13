const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
(async()=>{
  const server=createWarriorServer({paperFile:null,aiDecisionMode:'off',liveTradingEnabled:false,
    marketFetch:async()=>{throw new Error('ISOLATED')},walletCli:async()=>{throw new Error('NO_WALLET')}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-locales-'));
  let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext();
    await require('./price-socket-fixture.cjs')(context);
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>window.Warrior?.state?.simulation&&window.Warrior?.i18n);
    console.log((await page.locator('.topbar').ariaSnapshot()).slice(0,1500));
    const original=await page.evaluate(()=>JSON.stringify(window.agentSetup.getAgents()));
    const translations={zh:['zh-CN','AI 设置'],en:['en','AI settings'],ja:['ja','AI 設定'],ko:['ko','AI 설정']};
    async function layout(label){
      const bounds=await page.evaluate(()=>({page:document.documentElement.scrollWidth<=innerWidth,
        dialogs:[...document.querySelectorAll('dialog[open]')].map(el=>({id:el.id,ok:el.scrollWidth<=el.clientWidth+1})),
        touch:document.querySelector('.language-toggle').getBoundingClientRect().height>=48}));
      assert.ok(bounds.page&&bounds.touch&&bounds.dialogs.every(d=>d.ok),JSON.stringify({label,bounds}));
    }
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:900});
      for(const [locale,[lang,title]] of Object.entries(translations)){
        await page.locator('.language-toggle').selectOption(locale);
        assert.equal(await page.locator('html').getAttribute('lang'),lang);
        await page.reload();
        await page.waitForFunction(()=>window.Warrior?.i18n);
        assert.equal(await page.locator('.language-toggle').inputValue(),locale);
        assert.equal(await page.locator('html').getAttribute('lang'),lang);
        for(const section of ['overview','leaderboard','reports']){
          const nav=page.locator(`.nav[data-page=${section}]:visible`).first();
          await nav.click();await layout(`${width}-${locale}-${section}`);
        }
        await page.locator('.nav[data-page=overview]:visible').first().click();
        await page.locator('#api-connect').click();
        assert.equal(await page.locator('#api-dialog h2').innerText(),title);
        await layout(`${width}-${locale}-api`);
        await page.locator('#ai-settings-strategy-tab').click();
        await page.locator('#ai-editor-basic-tab').click();
        await page.locator('#agent-name').fill('小明の전략');
        for(const section of ['basic','policy','inputs']){
          await page.locator(`#ai-editor-${section}-tab`).click();
          await layout(`${width}-${locale}-${section}`);
        }
        assert.equal(await page.locator('.agent-indicator-grid input').count(),26);
        assert.equal(await page.locator('[data-agent-strategy]').count(),12);
        await page.locator('.agent-prompt-box').evaluate(el=>el.open=true);
        const prompt=await page.locator('#agent-prompt').innerText();
        assert.ok(prompt.includes('paper betting only'));
        assert.ok(!prompt.includes('undefined'));
        await layout(`${width}-${locale}-prompt`);
        await page.screenshot({path:path.join(output,`${width}-${locale}.png`)});
        await page.locator('.api-dialog-close').click();
        assert.equal(await page.evaluate(()=>JSON.stringify(window.agentSetup.getAgents())),original);
        await page.locator('#profile').click();await layout(`${width}-${locale}-wallet`);
        await page.locator('#wallet-dialog .close-dialog').click();
        await page.locator('#sim-create button[type=submit]').click();
        await layout(`${width}-${locale}-create`);
        await page.locator('#create-dialog .close-dialog').click();
      }
    }
    // One existing node, including attributes, must survive a four-language round trip.
    await page.evaluate(()=>{
      const fixture=document.createElement('div');fixture.id='locale-fixture';
      fixture.innerHTML='<span class="dynamic">第 27 轮</span><span data-no-translate>战场 日本語 한국어</span><input placeholder="输入模型 ID">';
      document.body.append(fixture);
    });
    for(const locale of ['ja','ko','en','zh','ja']){
      await page.locator('.language-toggle').selectOption(locale);
      const expected=await page.evaluate(()=>window.Warrior.i18n.t('第 27 轮'));
      assert.equal(await page.locator('#locale-fixture .dynamic').innerText(),expected);
      assert.equal(await page.locator('#locale-fixture [data-no-translate]').innerText(),'战场 日本語 한국어');
      assert.equal(await page.locator('#locale-fixture input').getAttribute('placeholder'),await page.evaluate(()=>window.Warrior.i18n.t('输入模型 ID')));
    }
    await page.evaluate(()=>document.querySelector('#locale-fixture .dynamic').textContent='第 28 轮');
    await page.waitForFunction(()=>document.querySelector('#locale-fixture .dynamic').textContent==='第 28 ラウンド');
    assert.deepEqual(errors,[]);
    console.log(`PASS: four locales, persisted reload, 12 catalog profiles, 26 inputs, prompt previews, dynamic round trips, custom text, 360/768/1440px. Isolated UI only. Screenshots: ${output}`);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
