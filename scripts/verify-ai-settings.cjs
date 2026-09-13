const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');
(async () => {
  const server = createWarriorServer({ paperFile: null, aiDecisionMode: 'off', liveTradingEnabled: false,
    marketFetch: async () => { throw new Error('ISOLATED'); }, walletCli: async () => { throw new Error('NO_WALLET'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-ai-settings-'));
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?offline=1`);
    await page.waitForFunction(() => window.Warrior?.state?.simulation);
    const initial = await page.evaluate(() => window.agentSetup.getAgents());
    const battleConfig = await page.evaluate(() => window.Warrior.state.simulation.config);
    const target = initial.find(agent => agent.strategy === 'smart');
    assert.ok(target);
    await page.locator('#api-connect').click();
    await page.locator('#api-key').fill('fixture-unsaved-key');
    await page.locator('#ai-settings-strategy-tab').click();
    assert.equal(await page.locator('.ai-strategy-toolbar, #api-add-agent, #ai-strategy-agent').count(), 0);
    assert.equal(await page.locator('#add-coin').isVisible(), false);
    assert.equal(await page.locator('#agent-editor').count(), 1);
    await page.locator('[data-agent-strategy=smart]').click();
    await page.locator('#ai-editor-policy-tab').click();
    await page.locator('#decision-variance').fill('37');
    await page.locator('#decision-variance').dispatchEvent('input');
    await page.locator('#ai-settings-connections-tab').click();
    assert.equal(await page.locator('#api-key').inputValue(), 'fixture-unsaved-key');
    await page.locator('#ai-settings-strategy-tab').click();
    assert.equal(await page.locator('#decision-variance').inputValue(), '37');
    await page.locator('#save-agent').click();
    const saved = await page.evaluate(() => window.agentSetup.getAgents());
    assert.equal(saved.length, initial.length);
    assert.equal(saved.find(agent => agent.id === target.id).decisionVariance, 37);
    assert.deepEqual(saved.filter(agent => agent.id !== target.id), initial.filter(agent => agent.id !== target.id));
    assert.deepEqual(await page.evaluate(() => window.Warrior.state.simulation.config), battleConfig);
    // Every existing strategy remains reachable through its card.
    for (const strategy of new Set(initial.map(agent => agent.strategy))) {
      await page.locator(`[data-agent-strategy="${strategy}"]`).click();
      assert.equal(await page.locator('[data-agent-strategy].selected').getAttribute('data-agent-strategy'), strategy);
    }
    for (const width of [360, 393, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const lang of ['zh', 'en']) {
        await page.locator('.api-dialog-close').click();
        await page.locator('.language-toggle').selectOption(lang);
        await page.locator('#api-connect').click();
        await page.locator('#ai-settings-strategy-tab').click();
        for (const section of ['basic', 'policy', 'inputs']) {
          await page.locator(`#ai-editor-${section}-tab`).click();
          const layout = await page.evaluate(() => {
            const dialog = document.querySelector('#api-dialog');
            return { page: document.documentElement.scrollWidth <= innerWidth, dialog: dialog.scrollWidth <= dialog.clientWidth + 1,
              tabs: [...document.querySelectorAll('.ai-settings-tabs button')].filter(button => button.checkVisibility()).every(button => button.getBoundingClientRect().height >= 48) };
          });
          assert.ok(layout.page && layout.dialog && layout.tabs, JSON.stringify({ width, lang, section, layout }));
        }
        await page.locator('#ai-editor-basic-tab').click();
        await page.locator('#api-dialog').screenshot({ path: path.join(output, `${width}-${lang}.png`) });
      }
    }
    await page.locator('.api-dialog-close').click();
    await page.reload();
    await page.waitForFunction(id => window.agentSetup?.getAgents().find(agent => agent.id === id)?.decisionVariance === 37, target.id);
    assert.equal(await page.evaluate(() => window.agentSetup.getAgents().length), initial.length);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', output, checks: 'Toolbar removed; no add entry; existing strategy selection; isolated save/reload; unchanged other strategies and battle; bilingual responsive tabs; offline UI only' }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
