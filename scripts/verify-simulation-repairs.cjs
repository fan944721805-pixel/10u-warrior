// Local HTTP and browser fault injection only. No real market, wallet or AI calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');
const { createSimulationBattles } = require('../simulation-battles');
const { createOfflineSimulation, STORAGE_KEY } = require('../public/offline-simulation');
const { ROUND } = require('../prediction-sim');

(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-repairs-ui-'));
  let time = 1800000010000, resolved = false;
  const topic = start => ({ marketTopicId: String(start), symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: String(start), status: resolved ? 'RESOLVED' : 'REGISTERED', tradingStatus: 'OPEN', outcomes: [
      { name: 'Up', tokenId: 'up', winner: resolved ? true : null }, { name: 'Down', tokenId: 'down', winner: resolved ? false : null },
    ] }] });
  const source = { marketFor: async slot => topic(slot), detail: async id => topic(Number(id)), book: async (_, direction) => ({ tokenId: direction === 'UP' ? 'up' : 'down', timestamp: time, asks: [{ price: .5, size: 10000 }], bids: [{ price: .5, size: 10000 }] }) };
  const simulation = createSimulationBattles({ source, file: path.join(output, 'ledger.json'), now: () => time, leaseEnabled: false });
  const server = createWarriorServer({ simulation, predictionSource: source, paperFile: null, now: () => time,
    walletCli: async args => args.join(' ') === 'wallet status' ? { data: { status: 'UNCONNECTED' } } : { data: {} },
    marketFetch: async () => ({ ok: true, json: async () => [{ p: '65000', T: time }] }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  async function pageFor() {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await require('./price-socket-fixture.cjs')(context);
    const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({ time: new Date(time) }); return page;
  }
  async function responsive(page, panel, prefix) {
    for (const width of [393, 768, 1440]) for (const locale of ['zh', 'en']) {
      await page.setViewportSize({ width, height: 900 }); await page.locator('.language-toggle').selectOption(locale);
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
      assert.equal(await panel.isVisible(), true);
      for (const button of await panel.locator('button:visible').all()) assert.ok((await button.boundingBox()).height >= 48);
      if (locale === 'en') assert.equal(/[\u4e00-\u9fff]/u.test(await panel.innerText()), false, await panel.innerText());
      await page.screenshot({ path: path.join(output, `${prefix}-${width}-${locale}.png`), fullPage: true });
    }
  }
  try {
    const page = await pageFor(); await page.goto(origin); await page.waitForFunction(() => window.Warrior?.state?.simulation);
    await page.locator('#sim-create button').click(); await page.locator('#minus').click();
    assert.equal(await page.locator('#budget').inputValue(), '10');
    await page.locator('#budget').fill('9'); await page.locator('#create-form button[type=submit]').click();
    assert.equal(await page.locator('#budget').evaluate(e => e.validity.rangeUnderflow), true); assert.equal(simulation.list().length, 1);
    await page.locator('#budget').fill('10'); await page.locator('#create-form button[type=submit]').click();
    let dropped = false, firstId;
    await page.route('**/api/simulation/battles', async route => {
      if (route.request().method() !== 'POST' || dropped) return route.continue();
      dropped = true; const response = await route.fetch(); assert.equal(response.status(), 201); firstId = (await response.json()).id;
      await route.abort('failed'); // The battle exists, but the browser never receives the response.
    });
    await page.locator('#confirm-create').click(); await page.waitForFunction(() => document.querySelector('#confirm-create').disabled === false);
    assert.equal(simulation.list().length, 2); await page.reload();
    await page.locator('#pending-creation-panel').waitFor({ state: 'visible' });
    await responsive(page, page.locator('#pending-creation-panel'), 'pending');
    await page.locator('#pending-creation-panel button').click(); await page.waitForFunction(id => window.Warrior?.state?.simulation?.id === id, firstId);
    assert.equal(simulation.list().length, 2); assert.equal(await page.locator('#pending-creation-panel').isVisible(), false);

    await simulation.tick(); time = simulation.snapshot(firstId).nextSlot; await simulation.tick();
    assert.ok(simulation.snapshot(firstId).agents.every(a => a.orders.length === 1));
    simulation.end(firstId); time += ROUND; await simulation.tick();
    for (let n = 0; n < 8; n++) { time = simulation.snapshot(firstId).recovery.nextRetryAt; await simulation.tick(); }
    await page.clock.setFixedTime(new Date(time)); await page.reload();
    await page.locator('#connection-recovery').waitFor({ state: 'visible' });
    await responsive(page, page.locator('#connection-recovery'), 'settlement');
    assert.ok((await page.locator('#connection-recovery').innerText()).includes('30 seconds'));
    resolved = true; time = simulation.snapshot(firstId).recovery.nextRetryAt; await simulation.tick(); await page.reload();
    await page.waitForFunction(() => window.Warrior?.state?.simulation?.status === 'ended');
    assert.equal(simulation.snapshot(firstId).agents[0].reconciliation.matched, true);

    const values = new Map(), store = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const offline = createOfflineSimulation({ storage: store, now: () => time });
    const saved = offline.create('Saved battle', { initialBalance: 10, agents: [{ id: 'A', strategy: 'smart', coin: 'BTC' }] });
    const backup = store.getItem(STORAGE_KEY), localPage = await pageFor();
    await localPage.addInitScript(({ key, backup }) => {
      if (!sessionStorage.getItem('fixture-loaded')) {
        localStorage.setItem(key, '{damaged fixture'); localStorage.setItem(key + '-backup', backup); sessionStorage.setItem('fixture-loaded', '1');
      }
    }, { key: STORAGE_KEY, backup });
    await localPage.goto(origin + '?offline=1'); await localPage.locator('#offline-storage-panel').waitFor({ state: 'visible' });
    assert.equal(await localPage.evaluate(key => localStorage.getItem(key), STORAGE_KEY), '{damaged fixture');
    await responsive(localPage, localPage.locator('#offline-storage-panel'), 'storage');
    await localPage.getByRole('button', { name: 'Restore latest backup', exact: true }).click();
    await localPage.locator('#offline-storage-panel').waitFor({ state: 'hidden' });
    const restored = await localPage.evaluate(id => window.Warrior.simulationApi.snapshot(id), saved.id);
    assert.equal(restored.agents[0].cash, 10); assert.equal(restored.enabled, false);
    assert.ok(await localPage.evaluate(() => Object.keys(localStorage).some(k => k.includes('-damaged-'))));
    await localPage.evaluate(key => localStorage.setItem(key, '{second damaged fixture'), STORAGE_KEY); await localPage.reload();
    await localPage.locator('#offline-storage-panel').waitFor({ state: 'visible' });
    await localPage.getByRole('button', { name: 'Reset offline save', exact: true }).click();
    await responsive(localPage, localPage.locator('#storage-recovery-dialog'), 'reset');
    await localPage.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await localPage.evaluate(key => localStorage.getItem(key), STORAGE_KEY), '{second damaged fixture');
    await localPage.getByRole('button', { name: 'Reset offline save', exact: true }).click();
    await localPage.getByRole('button', { name: 'Confirm reset', exact: true }).click();
    await localPage.locator('#offline-storage-panel').waitFor({ state: 'hidden' });
    assert.equal((await localPage.evaluate(() => window.Warrior.simulationApi.list())).battles.length, 1);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', checks: ['10U UI minimum', 'lost creation response + reload + idempotent retry', 'automatic delayed settlement', 'offline backup restore', 'explicit reset and cancel', 'zh/en at 393/768/1440'], externalCalls: 0, output }));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
