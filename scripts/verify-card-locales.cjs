const collectionFixture=require('../test/fixtures/card-collection.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createPreviewServer}=require('./serve-card-lab.cjs');
(async()=>{
  const server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[],views=[],copyAudit=[];
  try{
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
    await require('../test/fixtures/card-ranking.cjs').install(page);
    // Layout fixture only; real settings persistence is covered by verify-card-api.cjs.
    await page.route('**/api/ai/settings',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({connections:[]})}));
    await collectionFixture.installReadOnly(page);await page.goto(`http://127.0.0.1:${server.address().port}/card-lab.html?style=original#ranking`);await collectionFixture.ready(page);
    assert.deepEqual(await page.locator('#language option').allTextContents(),['中文','English','日本語','한국어']);
    const coverage=await page.evaluate(()=>Object.entries(WarriorCardCopy).filter(([key,values])=>values.length!==4||values.some(v=>typeof v!=='string'||!v.trim())).map(([key])=>key));
    assert.deepEqual(coverage,[],'All copy must cover four locales');
    const snap=()=>page.evaluate(()=>CardLab.getSnapshot());const before=await snap();
    async function change(locale){await page.locator('#language').selectOption(locale,{force:true});assert.equal((await snap()).locale,locale);assert.equal(await page.locator('html').getAttribute('lang'),locale==='zh'?'zh-CN':locale);}
    async function go(route){await page.evaluate(route=>location.hash=route,route);await page.waitForFunction(route=>CardLab.getPage()===({roster:'collection',ai:'arena'})[route]||CardLab.getPage()===route,route);}
    async function layout(selector,label){
      const visibleCopy=await page.locator(selector).innerText();
      assert.ok(!/界面原型|待结算\s*·\s*示例|固定示例|演示绑定|尚未连接行情或模型|未调用模型|尚未调用模型|UI prototype|sample recap|preview only/i.test(visibleCopy),`${label}: retired prototype copy`);
      copyAudit.push({view:label,text:visibleCopy});
      const dims=await page.locator(selector).evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));
      assert.ok(dims.scroll<=dims.width+1,`${label} overflow: ${JSON.stringify(dims)}`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} page overflow`);
      views.push(label);
    }
    for(const width of [1301,768,360]){
      await page.setViewportSize({width,height:1000});
      for(const locale of ['zh','en','ja','ko']){
        await change(locale);await page.reload();await collectionFixture.ready(page);assert.equal(await page.locator('#language').inputValue(),locale);
        for(const route of ['draw','collection','arena','ranking','roster','ai']){
          await go(route);await layout('main',`${width}/${locale}/${route}`);
          if(locale==='ko')assert.ok(!/[\u3400-\u9fff]/.test(await page.locator('main').innerText()),`${route}: Chinese text in Korean`);
        }
        await go('draw');await page.locator('button[data-action=detail-featured]').click();await layout('#card-dialog',`${width}/${locale}/card`);await page.keyboard.press('Escape');
        await go('arena');await page.locator('[data-action=open-setup]').click();await page.locator('#setup-budget').fill('75');
        await change(locale==='ja'?'ko':'ja');assert.equal(await page.locator('#setup-budget').inputValue(),'75');
        await change(locale);assert.equal(await page.locator('#setup-budget').inputValue(),'75');await layout('#setup-dialog',`${width}/${locale}/setup`);await page.keyboard.press('Escape');
        await page.locator('[data-action=controls]').click();await layout('#controls-dialog',`${width}/${locale}/controls`);await page.keyboard.press('Escape');
        await page.locator('.battle-open').first().click();await layout('#battle-detail-dialog',`${width}/${locale}/battle-detail`);await page.keyboard.press('Escape');
        await page.locator('#api-connect').click();await page.locator('[data-api-field=model]').fill('custom-model-123');
        await change(locale==='ja'?'ko':'ja');assert.equal(await page.locator('[data-api-field=model]').inputValue(),'custom-model-123');await change(locale);
        await layout('#api-preview-dialog',`${width}/${locale}/api`);await page.keyboard.press('Escape');
        await page.locator('#wallet-shortcut').click();await layout('#card-wallet-dialog',`${width}/${locale}/wallet`);await page.keyboard.press('Escape');
        await go('ranking');await page.locator('.ranking-row').first().click();await layout('#ranking-dialog',`${width}/${locale}/ranking-detail`);
        if(['ja','ko'].includes(locale)){await page.screenshot({path:`artifacts/card-lab/locale-ranking-${width}-${locale}.png`});}
        await page.keyboard.press('Escape');
        if(['ja','ko'].includes(locale))await page.screenshot({path:`artifacts/card-lab/locale-page-${width}-${locale}.png`,fullPage:true});
      }
    }
    // Switching languages preserves saved game state; drafts above were all cancelled.
    const after=await snap();for(const key of ['cards','roster','budget','models','battleSequence'])assert.deepEqual(after[key],before[key],key);
    assert.deepEqual(errors,[]);
    fs.writeFileSync('artifacts/card-lab/locale-verification.json',JSON.stringify({status:'PASS',views,errors},null,2));
    fs.writeFileSync('artifacts/card-lab/copy-audit.json',JSON.stringify({status:'PASS',scope:'Current visible pages/dialogs with isolated fixtures',views:copyAudit},null,2));
    console.log(`PASS: ${views.length} page/dialog layouts in four languages; saved locale, game state and dialog drafts preserved.`);
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
