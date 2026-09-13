// Isolated HTTP/browser verification: external prices, wallet and quotes are fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { fixture } = require('../test/fixtures/simulation-market.cjs');
const { createSimulationBattles } = require('../simulation-battles');
const { createWarriorServer } = require('../server');
const { ROUND } = require('../prediction-sim');

(async () => {
  const f = fixture(), output = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-modes-ui-'));
  const simulation = createSimulationBattles({ source: f.source, indicatorSource: f.indicatorSource, decisionProvider: f.decisionProvider, now: f.now, leaseEnabled: false });
  const battle = simulation.create('我的练习 My Practice', { initialBalance: 10, agents: [f.policy] });
  const server = createWarriorServer({ simulation, predictionSource: f.source, indicatorSource: f.indicatorSource,
    walletCli: f.run, paperFile: null, now: f.now, liveQuotesEnabled: true, liveTradingEnabled: false,
    marketFetch: async () => ({ ok: true, json: async () => [{ a: 1, p: '100', q: '1', f: 1, l: 1, T: f.now(), m: false }] }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    await require('./price-socket-fixture.cjs')(context);
    await context.addInitScript(id => localStorage.setItem('warrior-selected-battle', id), battle.id);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(10000);
    await page.clock.install({ time: new Date(f.now()) });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(id => window.Warrior?.state?.simulation?.id === id, battle.id);
    await simulation.tick(); f.setTime(f.slot); await simulation.tick();
    await page.clock.setFixedTime(new Date(f.now()));
    await page.waitForFunction(() => window.Warrior.state.simulation.agents[0]?.orders.length === 1);
    assert.equal(await page.locator('#simulation-source-notice').getAttribute('data-source'), 'public-spot');
    assert.equal(await page.locator('.agent-live-intent').isVisible(), false);
    await page.locator('#simulation-source-notice summary').click();
    assert.ok((await page.locator('#simulation-source-notice').innerText()).includes('2 倍'));
    for (const width of [393, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['zh', 'en']) {
        await page.locator('.language-toggle').selectOption(locale);
        await page.waitForFunction(lang => document.documentElement.lang === lang, locale === 'zh' ? 'zh-CN' : 'en');
        assert.equal(await page.locator('#simulation-source-notice summary').isVisible(), true);
        const label = await page.locator('#simulation-source-notice').innerText();
        assert.ok(label.includes(locale === 'en' ? 'No-wallet practice' : '免连接模拟'), label);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const rect = await page.locator('#simulation-source-notice summary').boundingBox(); assert.ok(rect.height >= 48);
        await page.screenshot({ path: path.join(output, `practice-${width}-${locale}.png`), fullPage: true });
      }
    }
    f.connect(true); f.setTime(f.slot + 16000); await simulation.tick();
    // The original practice order remains practice until the next round.
    assert.equal(simulation.snapshot(battle.id).agents[0].orders[0].marketSource, 'public-spot');
    f.setTime(f.slot + ROUND); await simulation.tick();
    await page.clock.setFixedTime(new Date(f.now()));
    await page.waitForFunction(() => window.Warrior.state.simulation.agents[0]?.orders.length === 2);
    await page.locator('#round-recap-dialog .primary').click();
    assert.equal(await page.locator('#simulation-source-notice').getAttribute('data-source'), 'binance-prediction');
    assert.equal(await page.locator('.agent-live-intent').isVisible(), false);
    for (const width of [393, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['zh', 'en']) {
        await page.locator('.language-toggle').selectOption(locale);
        await page.waitForFunction(lang => document.documentElement.lang === lang, locale === 'zh' ? 'zh-CN' : 'en');
        const label = await page.locator('#simulation-source-notice summary').innerText();
        assert.ok(label.includes(locale === 'en' ? 'Live-market paper trading' : '真实市场模拟'), label);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: path.join(output, `connected-${width}-${locale}.png`), fullPage: true });
      }
    }
    await page.locator('#betting-mode-toggle').click();
    await page.locator('#live-risk-dialog .primary').click();
    await page.locator('#confirm-live-agents').click();
    await page.locator('.agent-live-intent').click();
    const before = f.calls.filter(args => args[2] === 'quote').length;
    await page.locator('#quote-intent').click();
    await page.locator('#execution-consent').waitFor();
    assert.equal(before, 0);
    assert.equal(f.calls.filter(args => args[2] === 'quote').length, before + 1);
    assert.equal(await page.locator('#submit-execution').isDisabled(), true);
    assert.ok((await page.locator('#execution-dialog').innerText()).includes('2.4'));
    assert.ok((await page.locator('#execution-dialog').innerText()).includes('2.450000'));
    await page.screenshot({ path: path.join(output, 'shared-quote.png') });
    assert.ok(!f.calls.some(args => args.includes('place-order')));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', output, externalOrders: 0, checks: ['no-wallet practice entry', 'next-round connected switch', 'existing source preserved', 'official quote only on explicit live review', 'paper/live share comparison', 'paper hides live action', 'submit disabled', '393/768/1440 zh/en', 'no browser errors'] }));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
