// Isolated browser test: native settings are mocked, not a real-device sleep test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../public');
const output = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'warrior-background-'));
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { response.writeHead(404).end(); return; }
  const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp'};
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:900}});
    const errors = [], apiRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(base) && !url.includes('/api/')) return route.continue();
      if (url.includes('/api/')) apiRequests.push(url);
      return route.abort();
    });
    await page.addInitScript(() => {
      window.__hidden = false; window.__settings = []; window.__batteryExempt = false; window.__backgroundRestricted = false; window.__settingsFail = false;
      Object.defineProperty(document, 'hidden', {get:()=>window.__hidden});
      window.Capacitor = {isNativePlatform:()=>true, getPlatform:()=> 'android', Plugins:{BackgroundSettings:{
        getStatus:async()=>({ignoringBatteryOptimizations:window.__batteryExempt,backgroundRestricted:window.__backgroundRestricted}),
        openSettings:async options=>{if(window.__settingsFail)throw Error('UNAVAILABLE');window.__settings.push(options.page);},
      }}};
    });
    await page.clock.install({time:new Date('2026-09-13T04:01:00Z')});
    await page.goto(base+'/?offline=1');
    await page.locator('.android-background').waitFor({state:'attached'});
    const prompt = page.locator('#android-background-prompt');
    await prompt.waitFor({state:'visible'});
    for (const language of ['zh','en','ja','ko']) {
      await prompt.locator('.android-background-dismiss').click();
      await page.clock.runFor(50);
      await page.locator('.language-toggle').selectOption(language);
      await page.evaluate(()=>localStorage.removeItem('warrior-background-reminder-v1'));
      await page.reload();
      await prompt.waitFor({state:'visible'});
      for (const width of [360,768,1440]) {
        await page.setViewportSize({width,height:1000});
        assert.ok(await prompt.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
        for (const button of await prompt.locator('button').all()) assert.ok(await button.evaluate(el=>el.getBoundingClientRect().height>=48));
        if (language==='en') assert.ok(!/[\u3400-\u9fff]/u.test(await prompt.innerText()));
        await page.screenshot({path:path.join(output,`prompt-${language}-${width}.png`)});
      }
    }
    await prompt.locator('[data-setting=battery]').click();
    assert.equal(await prompt.evaluate(el=>el.open),true,'Opening settings must not imply permission was granted');
    assert.deepEqual(await page.evaluate(()=>window.__settings),['battery']);
    await page.evaluate(()=>{window.__batteryExempt=true;window.dispatchEvent(new Event('warrior-android-resume'));});
    await page.waitForFunction(()=>document.querySelector('#android-background-prompt .android-background-dismiss').textContent==='완료');
    await page.evaluate(()=>{window.__backgroundRestricted=true;document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForFunction(()=>document.querySelector('#android-background-prompt .android-background-status').textContent.includes('제한'));
    await prompt.locator('.android-background-dismiss').click();
    await page.reload();
    assert.equal(await prompt.evaluate(el=>el.open),false,'Deferral must survive app reload');
    await page.locator('.language-toggle').selectOption('zh');
    const ids = await page.evaluate(async () => {
      const api = window.Warrior.simulationApi;
      const a = await api.create('朋友 Alpha'), b = await api.create('Friend Beta');
      await api.setEnabled('default', false);
      return [a.id,b.id];
    });
    await page.clock.runFor(5000);
    await page.locator('#battle-settings-open').click();
    for (const language of ['zh','en']) {
      await page.locator('#battle-settings-dialog .battle-settings-header button').click();
      await page.locator('.language-toggle').selectOption(language);
      await page.locator('#battle-settings-open').click();
      for (const width of [360,768,1440]) {
        await page.setViewportSize({width,height:1000});
        await page.locator('.android-background').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('.android-background h3').innerText(), language === 'zh' ? '后台模拟':'Background simulation');
        for (const button of await page.locator('.android-background button').all()) {
          assert.ok(await button.evaluate(el=>el.getBoundingClientRect().height>=48));
        }
        assert.ok(await page.locator('#battle-settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
        if (language === 'en') assert.equal(/[\u3400-\u9fff]/u.test(await page.locator('.android-background').innerText()), false);
        await page.screenshot({path:path.join(output,`${language}-${width}.png`)});
      }
    }
    await page.locator('.android-background [data-setting=battery]').click();
    await page.locator('.android-background [data-setting=app]').click();
    assert.deepEqual(await page.evaluate(()=>window.__settings), ['battery','app']);
    await page.evaluate(()=>{window.__settingsFail=true;});
    await page.locator('.android-background [data-setting=battery]').click();
    assert.match(await page.locator('.android-background .android-background-status').innerText(), /Could not open settings/);
    await page.locator('#battle-settings-dialog .battle-settings-header button').click();

    const boundary = await page.evaluate(async ids=>(await window.Warrior.simulationApi.snapshot(ids[0])).nextSlot, ids);
    await page.clock.setSystemTime(new Date(boundary));
    // Hidden transition must not release any native battle. Hidden-only timer must
    // advance every battle without reads from the visible UI driving execution.
    await page.evaluate(()=>{window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));});
    await page.clock.runFor(5000);
    let saved = await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WarriorOfflineSimulation.STORAGE_KEY)));
    for (const id of ids) { const b=saved.battles.find(b=>b.id===id); assert.equal(b.enabled,true); assert.equal(b.roundCount,1); }
    await page.evaluate(async ids=>{await window.Warrior.simulationApi.setEnabled(ids[0],false);},ids);
    await page.clock.setSystemTime(new Date(boundary + 300000));
    await page.clock.runFor(5000);
    saved = await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WarriorOfflineSimulation.STORAGE_KEY)));
    assert.equal(saved.battles.find(b=>b.id===ids[0]).roundCount,1);
    assert.equal(saved.battles.find(b=>b.id===ids[1]).roundCount,2);
    // A delayed wake skips past slots rather than inventing unattended bets.
    await page.clock.setSystemTime(new Date(boundary + 1800000 + 20000));
    await page.clock.runFor(5000);
    saved = await page.evaluate(()=>JSON.parse(localStorage.getItem(window.WarriorOfflineSimulation.STORAGE_KEY)));
    assert.equal(saved.battles.find(b=>b.id===ids[1]).roundCount,2);
    await page.evaluate(()=>{window.__batteryExempt=true;window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
    assert.match(await page.locator('.android-background .android-background-status').textContent(),/exemption is on/);
    await page.reload();
    const restored = await page.evaluate(()=>window.Warrior.simulationApi.list());
    assert.ok(restored.battles.every(b=>!b.enabled));
    assert.ok(restored.battles.some(b=>b.name==='朋友 Alpha'));

    // Browser offline demo keeps its original hide-to-pause behavior.
    const web = await browser.newPage();
    await web.addInitScript(()=>{window.__hidden=false;Object.defineProperty(document,'hidden',{get:()=>window.__hidden});});
    await web.goto(base+'/?offline=1');
    assert.equal(await web.locator('.android-background').count(),0);
    await web.evaluate(async()=>{await window.Warrior.simulationApi.setEnabled('default',true);});
    await web.waitForTimeout(5200);
    await web.evaluate(()=>{window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await web.evaluate(async()=>(await window.Warrior.simulationApi.snapshot()).enabled),false);
    assert.deepEqual(apiRequests, []);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({passed:true, screenshots:output, checks:['automatic background prompt in four locales','deferral survives reload','return rechecks real permission flags','legacy native demo battles advance while hidden','manual pause','missed rounds skipped','reload paused','settings success/failure/status','zh/en at 360/768/1440','browser offline still pauses','no API requests']}));
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
