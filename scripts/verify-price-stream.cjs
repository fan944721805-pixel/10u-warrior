// --live reads public Binance WebSocket only. All wallet/AI/ledger operations stay isolated.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');

(async () => {
  const live = process.argv.includes('--live');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-stream-'));
  const server = createWarriorServer({ paperFile: null, aiDecisionMode: 'off', liveTradingEnabled: false,
    marketFetch: async () => { throw new Error('NO_HTTP_MARKET_EXPECTED'); },
    walletCli: async () => { throw new Error('NO_WALLET_EXPECTED'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    if (!live) await require('./price-socket-fixture.cjs')(context);
    const page = await context.newPage();
    const errors = [], sockets = [], quotes = [];
    let priceRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/api/market/prices')) priceRequests++; });
    page.on('websocket', socket => {
      sockets.push(socket.url());
      socket.on('framereceived', event => {
        try { const trade = JSON.parse(String(event.payload)); if (trade.e === 'aggTrade') quotes.push({ symbol: trade.s, price: trade.p, tradeTime: trade.T }); } catch {}
      });
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    await page.waitForFunction(() => document.querySelector('#live-price-panel')?.dataset.state === 'live', null, { timeout: 25000 });
    console.log(await page.locator('#live-price-panel').ariaSnapshot());
    await page.evaluate(() => {
      window.__priceNode = document.querySelector('.live-price-value'); window.__priceChanges = 0;
      window.__priceObserver = new MutationObserver(list => { window.__priceChanges += list.length; });
      window.__priceObserver.observe(window.__priceNode, { childList: true, characterData: true, subtree: true });
    });
    if (!live) {
      await page.evaluate(() => {
        window.__priceSilent = true;
        const socket = window.__priceSockets.find(item => !item.closed);
        for (let n = 0; n < 1000; n++) socket.onmessage({ data: JSON.stringify({ e: 'aggTrade', s: 'BTCUSDT', p: String(70000 + n), T: Date.now() }) });
      });
      await page.waitForFunction(() => parseFloat(document.querySelector('.live-price-value').textContent) === 70999);
      assert.ok(await page.evaluate(() => window.__priceChanges <= 2));
    }
    assert.ok(await page.evaluate(() => window.__priceNode === document.querySelector('.live-price-value')));
    for (const width of [393, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const lang of ['zh-CN', 'en']) {
        if (await page.locator('html').getAttribute('lang') !== lang) await page.locator('.language-toggle').selectOption(lang === 'zh-CN' ? 'zh' : lang);
        await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
        await page.screenshot({ path: path.join(output, `${width}-${lang}.png`), fullPage: true });
      }
    }
    const btc = await page.locator('.live-price-value').innerText();
    if (!live) {
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.ok(await page.evaluate(() => window.__priceSockets.every(socket => socket.closed)));
      await page.evaluate(() => {
        window.__priceSilent = false; delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForFunction(() => document.querySelector('#live-price-panel').dataset.state === 'live');
      assert.equal(await page.evaluate(() => window.__priceSockets.filter(socket => !socket.closed).length), 1);
    }
    await page.evaluate(async () => {
      await window.Warrior.simulationApi.create('ETH price verification', { initialBalance: 10, rounds: 1,
        agents: [{ id: 'A', name: 'ETH probe', coin: 'ETH', provider: 'deepseek', strategy: 'conservative' }] });
    });
    await page.reload();
    await page.waitForFunction(() => window.Warrior?.state?.simulation?.config?.asset === 'ETHUSDT' && document.querySelector('#live-price-panel').dataset.state === 'live', null, { timeout: 25000 }).catch(async error => {
      console.error(JSON.stringify({ sockets, lastMessage: quotes.at(-1), display: await page.locator('#live-price-panel').innerText(), now: Date.now() }));
      throw error;
    });
    const eth = await page.locator('.live-price-value').innerText();
    assert.notEqual(btc, eth); assert.equal(priceRequests, 0); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', mode: live ? 'public-live-WebSocket' : 'fixture', btc, eth, priceRequests, sockets,
      receivedMessages: quotes.length, lastMessage: quotes.at(-1), output }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
