const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');
const { profiles } = require('../public/strategy-catalog');

(async () => {
  const server = createWarriorServer({
    paperFile: null,
    aiDecisionMode: 'off',
    liveTradingEnabled: false,
    marketFetch: async () => { throw new Error('ISOLATED'); },
    walletCli: async () => { throw new Error('NO_WALLET'); },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-strategy-cards-'));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 393, height: 900 } });
    await require('./price-socket-fixture.cjs')(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.Warrior?.state?.simulation && window.agentSetup?.getAgents().length === 12);

    const expectedStrategies = Object.keys(profiles).sort();
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['zh', 'en']) {
        if (await page.locator('.language-toggle').inputValue() !== locale) await page.locator('.language-toggle').selectOption(locale);
        await page.locator('#sim-create button[type=submit]').click();
        assert.equal(await page.locator('#create-dialog').isVisible(), true);
        assert.equal(await page.locator('.ai-config-list .ai-config').count(), 12);
        assert.deepEqual(await page.locator('.ai-config-list .ai-config').evaluateAll(cards => cards.map(card => card.dataset.strategy).sort()), expectedStrategies);
        assert.equal(await page.locator('input[name=models]:checked').count(), 3);
        const labels = await page.locator('.ai-config-list .ai-choice strong').allTextContents();
        assert.deepEqual(labels, Object.values(profiles).map(profile => locale === 'en' ? profile.enLabel : profile.label));
        const visuals = await page.locator('.ai-config-list .strategy-avatar').evaluateAll(avatars => avatars.map(avatar => ({
          background: getComputedStyle(avatar).backgroundImage,
          width: avatar.getBoundingClientRect().width,
          height: avatar.getBoundingClientRect().height,
        })));
        assert.equal(visuals.length, 12);
        assert.ok(visuals[0].background.includes('delivery-rider-scooter.png'));
        assert.ok(visuals.slice(1).every(item => item.background.includes('/strategy-icons/')));
        assert.ok(visuals.every(item => item.width >= 48 && item.height >= 48));
        const imagesLoaded = await page.locator('.ai-config-list .strategy-avatar').evaluateAll(async avatars => Promise.all(avatars.map(avatar => new Promise(resolve => {
          const source = getComputedStyle(avatar).backgroundImage.slice(5, -2);
          const image = new Image();
          image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
          image.onerror = () => resolve(false);
          image.src = source;
        }))));
        assert.ok(imagesLoaded.every(Boolean));
        const layout = await page.evaluate(() => {
          const dialog = document.querySelector('#create-dialog');
          return document.documentElement.scrollWidth <= innerWidth && dialog.scrollWidth <= dialog.clientWidth + 1;
        });
        assert.equal(layout, true, `${width} ${locale}`);
        await page.screenshot({ path: path.join(output, `${width}-${locale}.png`), animations: 'disabled' });
        await page.locator('#create-dialog .close-dialog').click();
      }
    }

    if (await page.locator('.language-toggle').inputValue() !== 'zh') await page.locator('.language-toggle').selectOption('zh');
    await page.locator('#sim-create button[type=submit]').click();
    for (const strategy of ['trendFollowing', 'meanReversion', 'breakout']) {
      await page.locator(`.ai-config[data-strategy="${strategy}"] .ai-choice`).click();
    }
    assert.equal(await page.locator('input[name=models]:checked').count(), 6);
    await page.locator('.ai-config[data-strategy="orderFlow"] .ai-choice').click();
    assert.equal(await page.locator('.ai-config[data-strategy="orderFlow"] input').isChecked(), false);
    assert.match(await page.locator('#form-error').innerText(), /6/);
    await page.locator('input[name=models]:checked').evaluateAll(inputs => inputs.forEach(input => {
      input.checked = false;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }));
    for (const strategy of ['trendFollowing', 'orderFlow']) {
      await page.locator(`.ai-config[data-strategy="${strategy}"] .ai-choice`).click();
    }
    await page.locator('#create-form button[type=submit]').click();
    assert.match(await page.locator('#create-confirm-dialog').innerText(), /跟风侠.*大单侦探/s);
    await page.locator('#confirm-create').click();
    await page.waitForFunction(() => window.Warrior.state.simulation?.agents?.length === 2);
    assert.deepEqual(await page.evaluate(() => window.Warrior.state.simulation.agents.map(agent => agent.policy.strategy).sort()), ['orderFlow', 'trendFollowing']);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', output, checks: '12 strategy cards, generated icons, top warrior icon reuse, max-6 selection, new-strategy battle creation, zh/en 360/768/1440; isolated UI only' }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
