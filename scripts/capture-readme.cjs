// Real responsive UI screenshots using a fresh, explicitly offline demo ledger.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');

(async () => {
  const output = path.resolve(__dirname, '../docs/images');
  fs.mkdirSync(output, { recursive: true });
  const server = createWarriorServer({ paperFile: null, aiDecisionMode: 'off', liveTradingEnabled: false,
    walletCli: async () => { throw new Error('SCREENSHOT_NO_WALLET'); },
    marketFetch: async () => { throw new Error('SCREENSHOT_OFFLINE'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1180 }, reducedMotion: 'reduce', locale: 'zh-CN' });
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-09-13T06:00:10Z') });
    await page.goto(origin + '/?offline=1');
    await page.waitForFunction(() => window.Warrior?.state?.simulation);
    await page.locator('#sim-create button[type=submit]').click();
    await page.locator('#budget').fill('10');
    await page.locator('#rounds [data-rounds="10"]').click();
    await page.locator('#create-form button[type=submit]').click();
    await page.locator('#confirm-create').click();
    await page.waitForFunction(() => window.Warrior.state.simulation.id !== 'default');
    for (let round = 1; round <= 2; round++) {
      const delta = await page.evaluate(() => Math.max(0, window.Warrior.state.simulation.nextSlot - Date.now()));
      await page.clock.fastForward(delta + 100);
      if (await page.locator('#round-recap-dialog').isVisible()) await page.locator('#round-recap-dialog button').last().click();
      await page.locator('.desktop-nav [data-page=overview]').click();
      await page.waitForFunction(expected => window.Warrior.state.simulation.roundCount >= expected, round);
      if (await page.locator('#round-recap-dialog').isVisible()) await page.locator('#round-recap-dialog button').last().click();
    }
    for (const [name, width, height] of [['desktop',1440,1180], ['mobile',390,980]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.model-grid .model-card').first().waitFor({ state: 'visible' });
      const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(geometry.scrollWidth <= geometry.width, JSON.stringify(geometry));
      if (name === 'mobile') await page.evaluate(() => window.scrollTo(0,
        document.querySelector('.model-grid').getBoundingClientRect().top + scrollY
        - document.querySelector('.topbar').getBoundingClientRect().height - 24));
      await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ output, desktop:'1440×1180', mobile:'390×980', mode:'offline demo; browser responsive screenshots' }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
