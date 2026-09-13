const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');

(async () => {
  const server = createWarriorServer({ paperFile: null, aiDecisionMode: 'off', liveTradingEnabled: false,
    marketFetch: async () => { throw new Error('NO_EXTERNAL_MARKET'); },
    walletCli: async () => { throw new Error('NO_WALLET'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await require('./price-socket-fixture.cjs')(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.Warrior?.state?.simulation);
    await page.evaluate(() => {
      window.__snapshot = structuredClone(window.Warrior.state.simulation);
      window.__snapshot.enabled = false;
      window.__snapshot.status = 'paused';
      window.Warrior.simulationApi.snapshot = async () => window.__snapshot;
    });
    for (const [code, zh, en] of [
      ['STORAGE_ERROR', '账本保存失败', 'Ledger save failed'],
      ['STALE_BOOK', '预测盘口已过期', 'prediction'],
    ]) {
      await page.evaluate(code => {
        window.__snapshot.error = code;
        window.__snapshot.storageIssue = code === 'STORAGE_ERROR' ? { code: 'EACCES', operation: 'rename' } : null;
        window.Warrior.emit('page:change');
      }, code);
      await page.waitForFunction(code => document.querySelector('#sim-error').textContent.includes(code), code);
      assert.ok((await page.locator('#sim-error').innerText()).includes(zh));
      await page.locator('.language-toggle').selectOption('en');
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      await page.waitForFunction(text => document.querySelector('#sim-error').textContent.toLowerCase().includes(text.toLowerCase()), en);
      for (const width of [393, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      await page.locator('.language-toggle').selectOption('zh');
      await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
    }
    await page.evaluate(() => {
      window.__snapshot.error = null;
      window.__snapshot.endReason = 'SERVER_RESTARTED';
      window.Warrior.emit('page:change');
    });
    await page.waitForFunction(() => document.querySelector('#sim-error').textContent.includes('服务器已重启'));
    assert.deepEqual(errors, []);
    console.log('PASS: specific storage/market errors, Chinese/English, 393/768/1440px, restart notice; isolated fixtures only.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
