// Isolated browser regression: virtual clock, fake market, no real wallet/AI/ledger.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createPredictionSimulation, ROUND } = require('../prediction-sim');
const { createWarriorServer } = require('../server');

(async () => {
  let time = Date.now(), broken = false, resolved = false, retries = 0, marketReads = 0;
  const id = 'recovery-fixture', name = '恢复测试 FIXTURE';
  const check = () => { marketReads++; if (broken) throw Object.assign(Error('fixture disconnect'), {code: broken === true ? 'NETWORK_ERROR' : broken}); };
  const topic = start => ({ marketTopicId: String(start), symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT',
    startDate: start, endDate: start + ROUND, markets: [{ marketId: String(start), status: resolved && time >= start + ROUND ? 'RESOLVED' : 'REGISTERED', tradingStatus: 'OPEN',
      outcomes: [{name:'Up',tokenId:'up',winner:resolved ? true : null},{name:'Down',tokenId:'down',winner:resolved ? false : null}] }] });
  const source = { marketFor: async start => { check(); return topic(start); }, detail: async id => { check(); return topic(Number(id)); },
    book: async (_,direction) => { check(); return {tokenId:direction==='UP'?'up':'down',timestamp:time,asks:[{price:.5,size:10000}],bids:[{price:.6,size:10000}]}; } };
  const sim = createPredictionSimulation({source,now:()=>time,random:()=>0});
  await sim.tick(); time=sim.snapshot().nextSlot; await sim.tick();
  broken=true; time+=ROUND+20000; await sim.tick();
  for(let n=0;n<5;n++){time=sim.snapshot().recovery.nextRetryAt;await sim.tick();}
  const wrap = data => ({...data,id,name,createdAt:time-ROUND*3});
  const simulation = {
    snapshot:()=>wrap(sim.snapshot()),liveSnapshot:()=>wrap(sim.liveSnapshot()),list:()=>[wrap(sim.snapshot())],summaries:()=>[wrap(sim.summary())],
    leaderboard:()=>[],touch(){},tick:async()=>{}, getStrategies:()=>({agents:sim.snapshot().agents.map(a=>a.policy)}),
    retryConnection:()=>{retries++;return wrap(sim.retryConnection());},setEnabled:value=>wrap(sim.setEnabled(value)),
    marketFailure:(_,code)=>sim.marketFailure(code),
  };
  const server=createWarriorServer({simulation,predictionSource:source,now:()=>time,paperFile:null,walletCli:async()=>{throw Error('ISOLATED_FIXTURE');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const output=path.resolve('.data/recovery-ui');fs.mkdirSync(output,{recursive:true});
  let browser;
  try {
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:393,height:852}});
    await require('./price-socket-fixture.cjs')(context);
    await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin);
    await page.waitForFunction(()=>document.querySelector('#connection-recovery')?.dataset.state==='exhausted');
    assert.equal(await page.locator('#total').innerText(),'300.00');
    assert.equal(await page.locator('#total').getAttribute('data-basis'),'book');
    assert.ok((await page.locator('.balance-row .label').innerText()).includes('账面净值'));
    assert.equal(await page.locator('.model-card .agent-balance > strong').count(),3);
    assert.ok((await page.locator('.model-card .agent-balance > strong').allInnerTexts()).every(t=>t.includes('100.00')));
    const before=marketReads;
    // Repeated tabs/API polls cannot circumvent the exhausted market circuit.
    await Promise.all(Array.from({length:12},()=>fetch(origin+'/api/simulation/valuation?battleId='+id).then(r=>r.json())));
    await page.reload();await page.waitForFunction(()=>document.querySelector('#connection-recovery')?.dataset.state==='exhausted');
    assert.equal(marketReads,before);
    for(const width of [360,393,768,1440]) {
      await page.setViewportSize({width,height:900});
      for(const language of ['zh','en']) {
        await page.locator('.language-toggle').selectOption(language);
        await page.waitForFunction(lang=>document.documentElement.lang===(lang==='zh'?'zh-CN':'en'),language);
        const panel=await page.locator('#connection-recovery').innerText();
        assert.ok(panel.includes(language==='zh'?'重试已暂停':'Retries paused'),panel);
        assert.ok(panel.includes('5/5'),panel);
        if(language==='en')assert.ok(!/[\u3400-\u9fff]/u.test(panel),panel);
        assert.equal(await page.evaluate(()=>window.Warrior.state.simulation.name),name);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        const box=await page.locator('.recovery-retry').boundingBox();assert.ok(box.height>=48);
        await page.screenshot({path:path.join(output,`${width}-${language}.png`),fullPage:true});
      }
    }
    // User pause remains intentional even when an explicit retry succeeds.
    await page.locator('#battle-settings-open').click();
    await page.locator('#pause').click();
    await page.waitForFunction(()=>window.Warrior.state.simulation.enabled===false);
    await page.keyboard.press('Escape');
    assert.ok((await page.locator('.recovery-resume').innerText()).includes('Betting stays paused'));
    await page.locator('.recovery-retry').click();
    await page.waitForFunction(()=>window.Warrior.state.simulation.recovery?.attempts===0);
    assert.equal(retries,1);assert.equal(sim.snapshot().enabled,false);
    broken=false;resolved=true;await sim.tick();
    await page.reload();await page.waitForFunction(()=>window.Warrior.state.simulation?.recovery===null);
    assert.equal(await page.locator('#total').innerText(),'305.00');
    assert.ok(await page.locator('#connection-recovery').isHidden());
    assert.equal(sim.snapshot().status,'paused');assert.equal(sim.snapshot().auditTrail.filter(e=>e.type==='SETTLEMENT').length,3);
    // Auth problems expose a usable login inspection action, not an automatic login.
    sim.marketFailure('WALLET_NOT_CONNECTED');await page.reload();
    await page.waitForFunction(()=>window.Warrior.state.simulation?.recovery?.kind==='auth');
    if (await page.locator('#round-recap-dialog').isVisible()) await page.keyboard.press('Escape');
    assert.ok(await page.locator('.recovery-login').isVisible());
    await page.locator('.recovery-login').click();assert.ok(await page.locator('#wallet-dialog').isVisible());
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,screenshots:output,widths:[360,393,768,1440],languages:['zh','en'],marketReads,retries,settlements:3}));
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
