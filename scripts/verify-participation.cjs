// Isolated browser verification: synthetic market and model responses only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
const {createSimulationBattles}=require('../simulation-battles');
const {normalizePolicy,decisionPrompt}=require('../ai-decision');
const {calculateIndicatorSnapshot}=require('../market-indicators');
const {rows,depth}=require('../test/fixtures/indicator-series.cjs');
(async()=>{
  const slot=1800000000000;let time=slot-20000;const calls=[];
  const topic=start=>({marketTopicId:String(start),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+300000,markets:[{status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
  const source={marketFor:async start=>topic(start),detail:async id=>topic(Number(id)),book:async(_,direction)=>({tokenId:direction==='UP'?'up':'down',timestamp:time,asks:[{price:.5,size:10000}],bids:[{price:.5,size:10000}]})};
  const indicatorSource={snapshot:async()=>calculateIndicatorSnapshot({symbol:'BTCUSDT',klines:rows(time),depth,receivedAt:time})};
  const decisionProvider={describe:()=>({mode:'deepseek',provider:'TEST_FIXTURE',model:'fixture',configured:true,simulated:false}),decide:async (input,options)=>{
    options.onRequest?.({provider:"fixture",body:{model:"fixture",messages:[{role:"system",content:decisionPrompt(input)},{role:"user",content:JSON.stringify(input)}]}});
    calls.push(input);return {round_id:input.market.round_id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:0,risk_mode:'WAIT',reason:'Synthetic fixture: wait',factors:[],warnings:[],data_fresh:true,...(input.divination?{divination:{seed:input.divination.seed,reading:'Fixed fixture cards',verdict:'WAIT'}}:{})};
  }};
  const manager=createSimulationBattles({source,indicatorSource,decisionProvider,leaseEnabled:false,now:()=>time});
  manager.setEnabled(false,'default');
  const battle=manager.create('UI fixture',{realtimeEntry:true,actionUrgeLevel:100,emotionLevel:100,agents:['aggressive','smart','priceAction','diviner','czBrother','firstLady','contrarian','showoff'].map(strategy=>normalizePolicy({id:strategy,strategy},strategy))});
  await manager.tick();time=slot;await manager.tick();
  assert.equal(calls.length,7);
  assert.equal(manager.snapshot(battle.id).auditTrail.filter(e=>e.type==='MODEL_REQUEST').length,7);
  const server=createWarriorServer({walletCli:async()=>{throw Error('NO_WALLET');},paperFile:null,simulation:{...manager,tick:async()=>{}},predictionSource:source,indicatorSource,now:()=>time});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const output=path.resolve('.data/prompt-repairs-ui');fs.mkdirSync(output,{recursive:true});
  try{
    const context=await browser.newContext();await require('./price-socket-fixture.cjs')(context);
    await context.addInitScript(id=>localStorage.setItem('warrior-selected-battle',id),battle.id);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.setFixedTime(new Date(time));await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(id=>window.Warrior?.state?.simulation?.id===id,battle.id);
    for(const lang of ['zh','en']){
      await page.locator('.language-toggle').selectOption(lang);
      for(const width of [360,768,1440]){
        await page.setViewportSize({width,height:950});
        await page.waitForFunction(()=>document.querySelectorAll('.model-card .agent-waiting').length===8);
        const labels=await page.locator('.model-card .agent-waiting').allTextContents();
        assert.equal(labels.filter(s=>s===(lang==='zh'?'AI 选择观望':'AI chose to wait')).length,7);
        assert.ok(labels.includes(lang==='zh'?'等待 CZ 下注':'Waiting for CZ to bet'));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang} ${width} overflow`);
        await page.screenshot({path:path.join(output,`${lang}-${width}.png`),fullPage:true});
        await page.locator('#battle-settings-open').click();
        for(const value of [0,75,100]){
          await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/simulation/action-urge')&&r.request().method()==='POST'),page.locator('#battle-action-urge').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value)]);
          await page.waitForFunction(value=>window.Warrior.state.simulation.config.actionUrgeLevel===value,value);
          await page.waitForFunction(()=>!document.querySelector('#battle-action-urge').disabled);
          assert.equal(manager.snapshot(battle.id).config.actionUrgeLevel,value);
        }
        assert.equal(await page.locator('#battle-emotion-warning').innerText(),lang==='zh'?'首轮即可提高下注档位，胜负会放大影响；仍受仓位上限约束':'Raises stake tiers from the first round; results amplify tilt, within stake caps');
        for(const value of [0,100]){
          await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/simulation/emotion')&&r.request().method()==='POST'),page.locator('#battle-emotion').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value)]);
          await page.waitForFunction(value=>window.Warrior.state.simulation.config.emotionLevel===value,value);
          await page.waitForFunction(()=>!document.querySelector('#battle-emotion').disabled);
          assert.equal(manager.snapshot(battle.id).config.emotionLevel,value);
        }
        assert.ok(await page.locator('#battle-settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${lang} ${width} settings overflow`);
        if(lang==='en')assert.doesNotMatch(await page.locator('#battle-settings-dialog').innerText(),/[\u3400-\u9fff]/u);
        await page.locator('#battle-settings-dialog').screenshot({path:path.join(output,`${lang}-${width}-settings.png`)});
        await page.keyboard.press('Escape');
        await page.locator('#api-connect').click();
        await page.locator('#ai-settings-strategy-tab').click();
        const promptPanel=await page.locator('.agent-prompt-box').evaluate(el=>el.closest('[role=tabpanel]').id);
        const tabId=await page.locator('#'+promptPanel).getAttribute('aria-labelledby');
        await page.locator('#'+tabId).click();
        await page.locator('.agent-prompt-box').evaluate(el=>el.open=true);
        assert.equal(await page.locator('.agent-prompt-box summary span').innerText(),lang==='zh'?'策略提示词模板':'Strategy prompt template');
        assert.ok(await page.locator('#api-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${lang} ${width} prompt overflow`);
        if(lang==='en')assert.doesNotMatch(await page.locator('.agent-prompt-actions').innerText(),/[\u3400-\u9fff]/u);
        await page.locator('#api-dialog').screenshot({path:path.join(output,`${lang}-${width}-prompt.png`)});
        await page.keyboard.press('Escape');
      }
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',externalCalls:0,checks:['seven opening reviews','CZ prerequisite','zh/en labels','slider 0/75/100 persistence','360/768/1440 layout'],output}));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
