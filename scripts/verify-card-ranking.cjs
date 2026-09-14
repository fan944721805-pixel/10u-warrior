const collectionFixture=require('../test/fixtures/card-collection.cjs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createPreviewServer}=require('./serve-card-lab.cjs');
const number=s=>Number(s.replace('−','-').replace(/[^0-9.+-]/g,''));
(async()=>{
  const server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage(),errors=[],records=new Map();page.on('pageerror',e=>errors.push(e.message));
    await require('../test/fixtures/card-ranking.cjs').install(page);
    await collectionFixture.installReadOnly(page);await page.goto(`http://127.0.0.1:${server.address().port}/card-lab.html#ranking`);await collectionFixture.ready(page);
    const before=await page.evaluate(()=>CardLab.getSnapshot());
    await page.locator('.ranking-row').first().waitFor();
    for(const scope of [1,3,0]){
      await page.locator(`[data-ranking-scope="${scope}"]`).click();
      const rows=page.locator('.ranking-row');assert.equal(await rows.count(),2);
      const nets=await rows.evaluateAll(es=>es.map(e=>Number(e.dataset.net)));assert.deepEqual(nets,[...nets].sort((a,b)=>b-a));
      assert.equal(await rows.first().getAttribute('data-id'),'legacy:czBrother');
      for(const row of await rows.all()){
        const id=await row.getAttribute('data-id'),net=Number(await row.getAttribute('data-net'))/100;await row.click();
        const stats={};for(const el of await page.locator('#ranking-dialog [data-stat]').all())stats[await el.getAttribute('data-stat')]=number(await el.innerText());
        assert.equal(stats.net,net);assert.equal(stats.bets,stats.wins+stats.losses+stats.neutral);
        assert.ok(Math.abs(stats.payout-stats.stake-net)<.001);assert.ok(Math.abs(stats.profit-stats.loss-net)<.001);
        assert.ok(Math.abs(stats.average-stats.stake/stats.bets)<=.005);
        assert.equal(stats.winRate,Number((100*stats.wins/(stats.wins+stats.losses)).toFixed(1)));
        assert.equal(stats.overallRate,Number((100*stats.allWins/(stats.allBets-stats.allBets/3)).toFixed(1)));
        assert.equal(stats.roi,Number((100*net/stats.stake).toFixed(1)));
        assert.ok(stats.bets<=stats.allBets);assert.ok(stats.wins<=stats.allWins);
        if(scope===0){assert.equal(stats.winRate,stats.overallRate);assert.equal(stats.bets,stats.allBets);}
        const previous=records.get(id);if(previous){assert.equal(stats.overallRate,previous.overallRate);assert.equal(stats.allBets,previous.allBets);assert.ok(stats.bets>previous.bets);}
        records.set(id,stats);
        assert.equal(await page.locator('#ranking-dialog details,#ranking-dialog .ranking-order,#ranking-dialog .metric-chips,#ranking-dialog .indicator-list').count(),0);
        await page.keyboard.press('Escape');
      }
    }
    assert.ok([...records.values()].every(s=>s.allBets===21));
    for(const width of [1301,768,360]){
      await page.setViewportSize({width,height:1000});
      for(const lang of ['zh','en','ja','ko']){
        await page.locator('#language').selectOption(lang);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.locator('.ranking-row').first().focus();await page.keyboard.press('Enter');
        assert.ok(await page.locator('#ranking-dialog').isVisible());
        assert.ok(await page.locator('#ranking-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
        if(['en','ko'].includes(lang))assert.ok(!/[\u3400-\u9fff]/.test(await page.locator('#ranking-dialog').innerText()));
        await page.screenshot({path:`artifacts/card-lab/ranking-summary-${width}-${lang}.png`});
        const stats=await page.locator('#ranking-dialog [data-stat]').allTextContents();
        await page.locator('#ranking-dialog [data-action="close-ranking"]').click();
        await page.locator('.ranking-row').first().click();assert.deepEqual(await page.locator('#ranking-dialog [data-stat]').allTextContents(),stats);
        await page.keyboard.press('Escape');
      }
    }
    const after=await page.evaluate(()=>CardLab.getSnapshot());assert.deepEqual(after.cards,before.cards);assert.deepEqual(after.roster,before.roster);assert.equal(after.budget,before.budget);assert.deepEqual(errors,[]);
    await page.keyboard.press('Escape');await page.route('**/api/simulation/battles?view=summary',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({battles:[]})}));await page.reload();await collectionFixture.ready(page);await page.locator('.ranking-empty').waitFor();await page.waitForFunction(()=>!document.querySelector('.ranking-empty')?.textContent.includes('…'));assert.equal(await page.locator('.ranking-row').count(),0);
    await page.route('**/api/simulation/battles?view=summary',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'STORAGE_ERROR'})}));await page.reload();await collectionFixture.ready(page);await page.locator('[data-action=retry-ranking]').waitFor();assert.equal(await page.locator('.ranking-row').count(),0);
    console.log('PASS: ledger API aggregation across 7 battles; settled funds, split outcomes, latest 1/3/all, no fixture fallback on empty/error, 12 localized responsive views');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
