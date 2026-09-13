const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');
const { createSimulationBattles } = require('../simulation-battles');
const { fixture } = require('../test/fixtures/simulation-market.cjs');

(async () => {
  const f = fixture();
  const decisionProvider = { describe: () => ({ mode: 'deepseek' }), decide: async () => {
    throw Object.assign(new Error('fixture network outage'), { code: 'AI_REQUEST_FAILED' });
  } };
  const manager = createSimulationBattles({ ...f, decisionProvider, leaseEnabled: false, pauseOnRestore: true });
  const battle = manager.create('故障测试 · UI fixture', { agents: ['a','b','c'].map(id => ({ ...f.policy, id })) });
  // Drive the isolated scheduler explicitly, so browser refreshes cannot place orders.
  const simulation = { ...manager, tick: async () => {} };
  const server = createWarriorServer({ paperFile: null, walletCli: async () => { throw Error('NO_WALLET'); },
    simulation, predictionSource: f.source, indicatorSource: f.indicatorSource, now: f.now });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 950 } });
    await context.addInitScript(id => localStorage.setItem('warrior-selected-battle', id), battle.id);
    await require('./price-socket-fixture.cjs')(context);
    const page = await context.newPage();
    const alerts = [];
    page.on('dialog', async dialog => { alerts.push(dialog.message()); await dialog.accept(); });
    await page.goto(url);
    await page.waitForFunction(() => window.Warrior?.state?.simulation);
    await manager.tick(); f.setTime(f.slot); await manager.tick();
    await page.waitForFunction(() => window.Warrior.state.simulation.aiConnectionFailure);
    assert.equal(manager.snapshot(battle.id).enabled, false);
    assert.equal(alerts.length, 1); assert.match(alerts[0], /全部对局已暂停/);
    assert.match(await page.locator('#sim-error').innerText(), /全部对局已暂停/);
    await page.evaluate(() => { const s = document.querySelector('.language-toggle'); s.value = 'en'; s.dispatchEvent(new Event('change')); });
    assert.match(await page.locator('#sim-error').innerText(), /All battles are paused/);
    assert.equal(alerts.length, 1, 'rerendering must not repeat the alert');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.reload();
    await page.waitForFunction(() => window.Warrior?.state?.simulation?.aiConnectionFailure);
    assert.equal(alerts.length, 2); assert.match(alerts[1], /All battles are paused/);
    console.log(JSON.stringify({ passed: true, checks: ['global pause alert', 'persistent pause reason', 'deduplicated alert', 'reload notification', 'Chinese and English', '360px'] }));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
