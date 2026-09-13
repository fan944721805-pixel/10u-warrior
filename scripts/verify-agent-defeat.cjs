// Isolated browser fixtures. No real accounts, market access or saved battle changes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');
const { createSimulationBattles } = require('../simulation-battles');
(async () => {
  const time = 1800001000000;
  const manager = createSimulationBattles({source:{},now:()=>time,leaseEnabled:false});
  const initial = manager.create('Defeat UI fixture', {initialBalance:10,rounds:'until-loss',agents:[{id:'fox',strategy:'aggressive',coin:'BTC'},{id:'robot',strategy:'smart',coin:'BTC'}]});
  let snapshot = structuredClone(initial), reads = 0, failHistory = false;
  const first = {id:'win-1',status:'WON',amount:5,payout:10,start:time-900000,end:time-600000,settledAt:time-600000,direction:'UP',quote:{odds:2}};
  const last = {id:'loss-2',status:'LOST',amount:15,payout:0,start:time-600000,end:time-300000,settledAt:time-300000,direction:'UP',quote:{odds:2}};
  const server = createWarriorServer({paperFile:null,aiDecisionMode:'off',liveTradingEnabled:false,
    walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');},
    simulation:{...manager,tick:async()=>{},touch:()=>{},snapshot:()=>structuredClone(snapshot),liveSnapshot:()=>({...structuredClone(snapshot),view:'live',agents:snapshot.agents.map(a=>({...structuredClone(a),orders:a.orders.slice(-1)}))}),summaries:()=>[structuredClone(snapshot)]}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const output = fs.mkdtempSync(path.join(os.tmpdir(),'warrior-defeat-ui-'));
  try {
    const context = await browser.newContext({viewport:{width:390,height:900}});
    await require('./price-socket-fixture.cjs')(context);
    await context.addInitScript(({id,time})=>{
      localStorage.setItem('warrior-selected-battle',id);
      for(const start of [time-900000,time-600000])localStorage.setItem(`warrior-round-recap-read:v1:${id}:${start}`,'1');
      window.EventSource=class {addEventListener(){} close(){}};
    },{id:initial.id,time});
    await context.route('**/api/simulation?**',async route=>{
      if(new URL(route.request().url()).searchParams.get('view')==='full'){
        reads++;
        if(failHistory)return route.fulfill({status:503,json:{error:'FIXTURE_HISTORY_UNAVAILABLE'}});
      }
      return route.continue();
    });
    const page = await context.newPage(), errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>document.querySelector('[data-sim-agent=fox]')?.dataset.lifeState==='alive');
    const card=page.locator('[data-sim-agent=fox]');
    async function refresh(){snapshot.stateVersion=(snapshot.stateVersion||1)+1;await page.evaluate(()=>window.Warrior.emit('page:change'));await page.waitForFunction(v=>window.Warrior.state.simulation.stateVersion===v,snapshot.stateVersion);}
    // All-in stays alive, even when the order has expired but is unsettled.
    snapshot.agents[0]={...snapshot.agents[0],cash:0,reserved:10,equity:10,orders:[{...last,status:'OPEN',amount:10,payout:undefined}]};
    await refresh();assert.equal(await card.getAttribute('data-life-state'),'alive');
    await card.locator('.agent-detail-link').click();
    await card.evaluate(el=>{window.__defeatTurns=0;el.addEventListener('animationstart',e=>{if(e.animationName==='agent-defeat-turn')window.__defeatTurns++;});});
    snapshot.agents[0]={...snapshot.agents[0],cash:0,reserved:0,equity:0,wins:1,losses:1,winRate:.5,orders:[first,last]};
    await refresh();
    await page.locator('#detail-dialog .agent-memorial').waitFor();
    await page.locator('#detail-dialog .equity-line').waitFor();
    assert.ok(reads>0,'live view must fetch full history');
    assert.equal(await card.locator('.agent-round').isVisible(),false);
    assert.equal(await page.locator('#detail-dialog .decision-featured').count(),0);
    assert.equal(await page.locator('.agent-defeat-result').count(),2,'keep older records omitted by live view');
    const originalPath=await page.locator('#detail-dialog .equity-line').getAttribute('d');
    await refresh();assert.equal(await page.locator('#detail-dialog .equity-line').getAttribute('d'),originalPath);
    await page.locator('#detail-dialog .close-dialog').click();
    await page.waitForFunction(()=>!document.querySelector('[data-sim-agent=fox]').classList.contains('is-defeat-turning'));
    await refresh();assert.equal(await card.evaluate(el=>el.classList.contains('is-defeat-turning')),false);
    assert.equal(await page.evaluate(()=>window.__defeatTurns),1,'one page turn per defeat');
    assert.ok((await card.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('linear-gradient'));
    for(const lang of ['zh','en']){
      await page.locator('.language-toggle').selectOption(lang);
      for(const width of [360,768,1440]){
        await page.setViewportSize({width,height:950});
        assert.equal(await card.locator('.agent-detail-link').innerText(),lang==='zh'?'历史战绩':'Battle history');
        assert.ok(await card.locator('.agent-detail-link').evaluate(el=>el.getBoundingClientRect().height>=48));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await page.screenshot({path:path.join(output,`${lang}-${width}-cards.png`),fullPage:true});
        await card.locator('.agent-detail-link').click();await page.locator('#detail-dialog .equity-line').waitFor();
        assert.equal(await page.locator('.agent-defeat-history').getAttribute('open'),null);
        await page.locator('.agent-defeat-history summary').click();
        const slider=page.locator('.equity-chart-slider');await slider.focus();await page.keyboard.press('Home');
        assert.equal(await slider.inputValue(),'0');
        assert.ok(await page.locator('#detail-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
        if(lang==='en')assert.equal(/[\u3400-\u9fff]/.test(await page.locator('#detail-content').innerText()),false);
        await page.screenshot({path:path.join(output,`${lang}-${width}-history.png`)});
        await page.locator('#detail-dialog .close-dialog').click();
      }
    }
    // Failed full-history requests have a usable retry, not a fabricated chart.
    failHistory=true;await card.locator('.agent-detail-link').click();
    await page.locator('.agent-defeat-archive button').waitFor();
    assert.equal(await page.locator('#detail-dialog .equity-line').count(),0);
    failHistory=false;await page.locator('.agent-defeat-archive button').click();await page.locator('#detail-dialog .equity-line').waitFor();
    // The existing top-up path can revive a card, including an open detail dialog.
    snapshot.agents[0]={...snapshot.agents[0],cash:10,equity:10,addedCapital:10,topUps:[{at:time-1000,amount:10}]};
    await refresh();assert.equal(await card.getAttribute('data-life-state'),'alive');
    assert.equal(await card.locator('.agent-round').isVisible(),true);
    assert.equal(await page.locator('#detail-dialog .agent-memorial').count(),0);
    await page.locator('#detail-dialog .close-dialog').click();
    await page.emulateMedia({reducedMotion:'reduce'});
    snapshot.agents[0]={...snapshot.agents[0],cash:0,equity:0,addedCapital:0,topUps:[]};
    await refresh();assert.equal(await card.evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.reload();await page.waitForFunction(()=>document.querySelector('[data-sim-agent=fox]')?.dataset.lifeState==='defeated');
    assert.equal(await card.locator('.agent-round').isVisible(),false);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,output,fullHistoryReads:reads,checks:'all-in, pending settlement, defeat, open detail transition, complete history, retry, chart, top-up, reload, reduced motion, zh/en 360/768/1440'},null,2));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
