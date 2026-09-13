const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
(async()=>{
  const server=createWarriorServer({paperFile:null,aiDecisionMode:'off',liveTradingEnabled:false,marketFetch:async()=>{throw Error('ISOLATED');},walletCli:async()=>{throw Error('NO_WALLET');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const output=path.resolve(__dirname,'../artifacts/liangxi');fs.mkdirSync(output,{recursive:true});
  let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext();await require('./price-socket-fixture.cjs')(context);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?offline=1`);
    await page.waitForFunction(()=>window.agentSetup?.getAgents().some(a=>a.strategy==='liangXi'));
    const initial=await page.evaluate(()=>window.agentSetup.getAgents());
    assert.equal(initial.filter(a=>a.strategy==='liangXi').length,1);
    await page.locator('#sim-create button[type=submit]').click();
    await page.locator('.strategy-list-toggle').click();
    const card=page.locator('.ai-config[data-strategy=liangXi]');
    assert.equal(await card.locator('input[name=models]').isChecked(),false);
    const avatar=card.locator('.ai-avatar');
    assert.match(await avatar.evaluate(el=>getComputedStyle(el).backgroundImage),/liang-xi.png/);
    assert.equal(await avatar.evaluate(el=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=getComputedStyle(el).backgroundImage.slice(5,-2);})),true);
    await card.locator('.ai-choice').click();assert.equal(await card.locator('input[name=models]').isChecked(),true);
    await page.locator('#create-dialog .close-dialog').click();
    await page.locator('#api-connect').click();await page.locator('#ai-settings-strategy-tab').click();
    await page.locator('[data-agent-strategy=liangXi]').click();await page.locator('#ai-editor-policy-tab').click();
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:900});
      for(const locale of ['zh','en']){
        // The language picker is outside the modal; close and reopen through actual controls.
        await page.locator('.api-dialog-close').click();
        await page.locator('.language-toggle').selectOption(locale);
        await page.locator('#api-connect').click();await page.locator('#ai-settings-strategy-tab').click();
        await page.locator('[data-agent-strategy=liangXi]').click();await page.locator('#ai-editor-policy-tab').click();
        await page.waitForFunction(lang=>document.documentElement.lang.startsWith(lang),locale);
        const ladder=page.locator('#agent-risk-summary .agent-stake-ladder');
        assert.deepEqual(await ladder.locator('strong').allTextContents(),['50%','100%']);
        assert.deepEqual(await ladder.locator('small').allTextContents(),locale==='zh'?['半仓梭哈','全仓梭哈']:['Half balance','All-in']);
        assert.ok(await ladder.locator('small').evaluateAll(labels=>labels.every(el=>el.scrollWidth<=el.clientWidth+1)));
        assert.equal(await page.locator('#max-stake').isVisible(),false);
        assert.equal(await page.locator('.agent-all-in').isVisible(),false);
        assert.match(await page.locator('#agent-strategy-preview').innerText(),locale==='zh'?/凉兮/:/Liang Xi/);
        assert.equal(await page.evaluate(()=>{const d=document.querySelector('#api-dialog');return document.documentElement.scrollWidth<=innerWidth&&d.scrollWidth<=d.clientWidth+1;}),true,`${width}/${locale}`);
        assert.ok((await page.locator('#save-agent').boundingBox()).height>=48);
        await page.screenshot({path:path.join(output,`strategy-${width}-${locale}.png`)});
      }
    }
    await page.locator('#emotion-sensitivity').fill('90');await page.locator('#emotion-sensitivity').dispatchEvent('input');
    await page.locator('#save-agent').click();
    await page.reload();await page.waitForFunction(()=>window.agentSetup?.getAgents().some(a=>a.strategy==='liangXi'));
    const saved=await page.evaluate(()=>window.agentSetup.getAgents().find(a=>a.strategy==='liangXi'));
    assert.equal(saved.emotionSensitivity,90);assert.equal(saved.maxStakePct,100);assert.equal(saved.allowAllIn,true);
    await page.locator('#api-connect').click();await page.locator('#ai-settings-strategy-tab').click();
    await page.locator('[data-agent-strategy=smart]').click();await page.locator('#ai-editor-policy-tab').click();
    assert.equal(await page.locator('#max-stake').isVisible(),true);
    assert.equal(await page.locator('.agent-all-in').isVisible(),true);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',output,checks:'Liang Xi card, artwork, two stakes, save/reload, switch back, zh/en 360/768/1440. Isolated UI only.'}));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
