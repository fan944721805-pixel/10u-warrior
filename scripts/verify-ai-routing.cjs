const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');
const { calculateIndicatorSnapshot } = require('../market-indicators');

(async () => {
  let calls = 0;
  const server = createWarriorServer({ paperFile:null, walletCli:async()=>{throw new Error('NO_WALLET');}, marketFetch:async()=>{throw new Error('NO_MARKET');},
    indicatorSource:{snapshot:async()=>{
      // The preview fixture uses a conservative conflict snapshot, never real funds.
      const now=Date.now();
      return {dataTimestamp:now,priceChangePct:{oneMinute:0,fiveMinutes:0},rsi14:50,ema:{ema5:100,ema20:100},volumeRatio:1,spotOrderBookImbalance:0,
        macd:{line:0,signal:0,histogram:0},bollinger:{middle:100,upper:101,lower:99,percentB:.5,bandwidthPct:2},atr:{value:.1,percent:.1},adx:{adx:10,plusDI:10,minusDI:10},longReturns:{fifteenMinutes:0,sixtyMinutes:0},volatility:{perMinutePct:.1},takerFlow:{buyRatio:.5,netBase:0,totalBase:10},spread:{basisPoints:1,mid:100,microprice:100,micropriceBiasBps:0}};
    }},
    aiFetch:async(_,options)=>{
      calls++;const body=JSON.parse(options.body),input=JSON.parse(body.messages.at(-1).content);
      return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({round_id:input.market.round_id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:50,risk_mode:'WAIT',factors:[],reason:'UI fixture: no signal',data_fresh:true,warnings:[]})}}],usage:{prompt_tokens:123,completion_tokens:45,prompt_cache_hit_tokens:20}})};
    } });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${server.address().port}`;
  const output=path.resolve('.data/ai-routing-ui');fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:393,height:852}});
    await require('./price-socket-fixture.cjs')(context);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.waitForFunction(()=>window.Warrior?.aiConnections?.snapshot());
    // Seed the old browser vault to verify automatic migration without any real key.
    await page.evaluate(async()=>{
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('warrior-ai-api-vault',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
      const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
      const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode('fixture-legacy-key'));
      await new Promise((resolve,reject)=>{const tx=db.transaction(['vault','connections'],'readwrite');tx.objectStore('vault').put({id:'device-key',key});tx.objectStore('connections').put({provider:'deepseek',baseUrl:'https://api.deepseek.com',model:'fixture-deepseek',secret:{iv,cipher},lastStatus:'success',updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=reject;});db.close();
    });
    await page.reload();await page.waitForFunction(()=>window.Warrior.aiConnections.snapshot()?.connections.some(c=>c.id==='deepseek'&&c.tested));
    assert.equal(calls,1);
    await page.locator('#api-connect').click();
    await page.locator('[data-api-provider=deepseek]').click();
    await page.waitForFunction(()=>document.querySelector('#api-model').value==='fixture-deepseek');
    assert.equal(await page.locator('[id^=api-price-]').count(),0);
    assert.equal(await page.locator('.ai-preview-button').count(),0);
    assert.equal(await page.locator('#api-test').count(),1);
    assert.equal(await page.locator('#ai-batch-model').count(),0);
    await page.locator('.api-dialog-close').click();
    await page.locator('#sim-create button[type=submit]').click();
    await page.waitForSelector('#battle-configure-ai');
    assert.equal(await page.locator('#battle-ai-dialog').isVisible(),false);
    assert.ok((await page.evaluate(()=>window.Warrior.battleModels.configure(window.agentSetup.getAgents()))).every(a=>a.aiConnectionId==='none'));
    await fetch(url+'/api/ai/connections/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider:'openai',model:'fixture-gpt',apiKey:'fixture-second-key',baseUrl:'https://api.openai.com/v1'})});
    await page.evaluate(()=>window.Warrior.aiConnections.refresh());
    await page.locator('#battle-configure-ai').click();
    await page.locator('[data-battle-model=gpt]').selectOption('deepseek');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#battle-configure-ai').isChecked(),false);
    assert.ok((await page.evaluate(()=>window.Warrior.battleModels.configure(window.agentSetup.getAgents()))).every(a=>a.aiConnectionId==='none'));
    await page.locator('#battle-configure-ai').click();
    assert.equal(await page.locator('[data-battle-model=gpt]').inputValue(),'none');
    await page.locator('[data-battle-model=gpt]').selectOption('openai');
    await page.locator('[data-battle-model=gpt]').selectOption('deepseek');
    await page.evaluate(()=>window.Warrior.aiConnections.refresh());
    assert.equal(await page.locator('[data-battle-model=gpt]').inputValue(),'deepseek');
    await page.locator('#battle-ai-save').click();
    const configured=await page.evaluate(()=>window.Warrior.battleModels.configure(window.agentSetup.getAgents().filter(a=>['gpt','claude'].includes(a.id))));
    assert.equal(configured.length,2);assert.equal(new Set(configured.map(a=>a.id)).size,2);
    assert.equal(configured.find(a=>a.sourceAgentId==='gpt').aiConnectionId,'deepseek');
    assert.equal(configured.find(a=>a.sourceAgentId==='claude').aiConnectionId,'none');
    assert.equal(await page.locator('#battle-configure-ai').isChecked(),true);
    await page.locator('#battle-configure-ai').uncheck();
    assert.ok((await page.evaluate(()=>window.Warrior.battleModels.configure(window.agentSetup.getAgents()))).every(a=>a.aiConnectionId==='none'));
    await page.locator('#battle-configure-ai').check();
    assert.equal(await page.locator('[data-battle-model=gpt]').inputValue(),'deepseek');
    await page.locator('#battle-ai-save').click();
    await page.locator('#battle-ai-edit').click();
    assert.equal(await page.locator('[data-battle-model=gpt]').inputValue(),'deepseek');
    assert.equal(calls,2);
    const created=await(await fetch(url+'/api/simulation/battles',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Model binding fixture',config:{agents:configured,initialBalance:10}})})).json();
    assert.equal(created.config.agents.find(a=>a.sourceAgentId==='gpt'&&a.aiConnectionId==='deepseek').aiConnectionId,'deepseek');
    assert.equal(created.config.agents.filter(a=>a.sourceAgentId==='gpt').length,1);
    assert.ok(created.config.agents.find(a=>a.sourceAgentId==='gpt'&&a.aiConnectionId==='deepseek').aiConnectionRevision);
    for(const width of [360,768,1440])for(const language of ['zh','en']){
      await page.setViewportSize({width,height:950});
      await page.evaluate(lang=>{const select=document.querySelector('.language-toggle');select.value=lang;select.dispatchEvent(new Event('change'));},language);
      await page.locator('#battle-ai-dialog').scrollIntoViewIfNeeded();
      const layout=await page.evaluate(()=>({document:document.documentElement.scrollWidth<=innerWidth,dialog:document.querySelector('#battle-ai-dialog').scrollWidth<=document.querySelector('#battle-ai-dialog').clientWidth+1,controls:[...document.querySelectorAll('[data-battle-model]')].every(el=>el.getBoundingClientRect().height>=48)}));
      assert.ok(layout.document&&layout.dialog&&layout.controls,JSON.stringify({width,language,layout}));
      assert.match(await page.locator('#battle-ai-title').innerText(),language==='en'?/Configure AI/:/配置 AI/);
      await page.screenshot({path:path.join(output,`${width}-${language}.png`)});
    }
    const settings=await(await fetch(url+'/api/ai/settings')).json();
    assert.equal(settings.usage.deepseek.total,168);assert.equal(settings.usage.deepseek.calls,1);
    assert.ok(!JSON.stringify(settings).includes('fixture-legacy-key'));
    await page.reload();await page.waitForFunction(()=>window.Warrior.aiConnections.snapshot()?.connections.some(c=>c.tested));assert.equal(calls,2);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:['legacy encrypted key migration','tested-only assignment','independent AI dialog','single model per strategy','cancel discards draft','save preserves selection','battle creation model selector','tested connections only','refresh preserves selection','battle ledger retains model binding','assignment makes no model request','no per-strategy test buttons','token totals','no price inputs','Chinese and English at 360/768/1440','reload persistence'],calls,output}));
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
