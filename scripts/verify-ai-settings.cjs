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
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await require('./price-socket-fixture.cjs')(context);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.Warrior?.state?.simulation);
    const initialAgentCount = await page.evaluate(() => window.agentSetup.getAgents().length);
    assert.equal(initialAgentCount, 9);
    console.log(await page.locator('#api-connect').ariaSnapshot());
    await page.locator('#api-connect').click();
    assert.equal(await page.locator('#api-form').isVisible(), true);
    await page.locator('#api-key').fill('fixture-unsaved-key');
    await page.locator('#ai-settings-strategy-tab').click();
    assert.equal(await page.locator('#api-form').isVisible(), false);
    assert.equal(await page.locator('#ai-strategy-agent').inputValue(), 'claude');
    assert.equal(await page.locator('#ai-strategy-agent option:checked').textContent(), 'Claude');
    assert.equal(await page.locator('#agent-editor').count(), 1);
    assert.equal(await page.locator('#create-dialog #agent-editor').count(), 0);
    await page.locator('#ai-editor-basic-tab').click();
    assert.equal(await page.locator('#agent-editor [data-agent-model]').count(), 0);
    assert.equal(await page.locator('#agent-editor [data-agent-coin]').count(), 0);
    await page.locator('#agent-name').fill('Tab draft');
    await page.locator('#ai-settings-connections-tab').click();
    assert.equal(await page.locator('#api-key').inputValue(), 'fixture-unsaved-key');
    await page.locator('#ai-settings-strategy-tab').click();
    assert.equal(await page.locator('#agent-name').inputValue(), 'Tab draft');
    await page.locator('#ai-editor-basic-tab').click();
    assert.equal(await page.locator('#ai-editor-basic-panel [data-agent-options=strategy]').count(), 1);
    assert.equal(await page.locator('#ai-editor-policy-panel [data-agent-options=strategy]').count(), 0);
    await page.locator('[data-agent-strategy=conservative]').click();
    await page.locator('#save-agent').click();
    assert.equal(await page.evaluate(() => window.agentSetup.getAgents()[0].strategy), 'conservative');
    assert.equal(await page.evaluate(() => window.agentSetup.getAgents()[0].name), 'Tab draft');
    await page.locator('#ai-editor-policy-tab').press('ArrowRight');
    assert.equal(await page.locator('#ai-editor-inputs-tab').getAttribute('aria-selected'), 'true');
    await page.locator('#agent-indicator-auto').uncheck();
    await page.locator('.agent-indicator-grid input').evaluateAll(inputs => inputs.forEach(input => { input.checked = false; input.dispatchEvent(new Event('change')); }));
    await page.locator('#save-agent').click();
    assert.ok((await page.locator('#agent-editor-error').innerText()).includes('3'));
    await page.locator('#cancel-agent-editor').click();
    await page.locator('#ai-strategy-agent').selectOption('claude');
    for (const width of [360, 393, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const lang of ['zh-CN', 'en']) {
        await page.locator('.api-dialog-close').click();
        if (await page.locator('html').getAttribute('lang') !== lang) await page.locator('.language-toggle').selectOption(lang === 'zh-CN' ? 'zh' : lang);
        await page.locator('#api-connect').click();
        await page.locator('#ai-settings-strategy-tab').click();
        for (const section of ['basic', 'policy', 'inputs']) {
          await page.locator(`#ai-editor-${section}-tab`).click();
          const layout = await page.evaluate(() => {
            const dialog = document.querySelector('#api-dialog');
            return { document: document.documentElement.scrollWidth <= innerWidth, dialog: dialog.scrollWidth <= dialog.clientWidth + 1,
              tabs: [...document.querySelectorAll('.ai-settings-tabs button')].every(button => button.getBoundingClientRect().height >= 48) };
          });
          assert.ok(layout.document && layout.dialog && layout.tabs, JSON.stringify({ width, lang, section, layout }));
        }
        await page.locator('#ai-editor-policy-tab').click();
        await page.screenshot({ path: path.join(output, `${width}-${lang}.png`) });
      }
    }
    await page.locator('.api-dialog-close').click();
    await page.locator('#sim-create button[type=submit]').click();
    await page.locator('#budget').fill('42');
    await page.locator('[data-battle-coin=ETH]').click();
    await page.locator('#create-form button[type=submit]').click();
    assert.ok((await page.locator('#create-confirm-dialog').innerText()).includes('Binance Prediction · ETH'));
    await page.locator('#create-confirm-dialog button.secondary').click();
    assert.equal(await page.locator('#create-dialog .agent-settings-button').count(), 0);
    assert.equal(await page.locator('#budget').inputValue(), '42');
    await page.locator('#create-dialog .close-dialog').click();
    await page.locator('#api-connect').click();
    await page.locator('#ai-settings-strategy-tab').click();
    await page.locator('#ai-strategy-agent').selectOption('gpt');
    assert.equal(await page.locator('#ai-strategy-agent').inputValue(), 'gpt');
    await page.locator('#api-add-agent').click();
    assert.equal(await page.locator('#ai-strategy-agent').inputValue(), 'gpt');
    await page.locator('#ai-strategy-agent').selectOption('deepseek');
    await page.locator('#ai-strategy-agent').selectOption('gpt');
    assert.equal(await page.locator('#ai-editor-basic-tab').getAttribute('aria-selected'), 'true');
    await page.locator('#agent-name').fill('Custom AI');
    await page.locator('#save-agent').click();
    assert.equal(await page.evaluate(() => window.agentSetup.getAgents().length), initialAgentCount + 1);
    assert.equal(await page.evaluate(() => window.agentSetup.getAgents().at(-1).provider), 'gpt');
    assert.equal(await page.locator('#create-dialog .agent-settings-button').count(), 0);
    assert.equal(await page.locator('#ai-strategy-agent option:checked').textContent(), 'GPT · Custom AI');
    await page.locator('.api-dialog-close').click();
    await page.reload();
    await page.waitForFunction(() => window.agentSetup?.getAgents()[0].name === 'Tab draft');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', output, checks: 'Tab navigation, drafts, save/reload, validation, keyboard, selection-only cards, responsive bilingual UI; isolated only' }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
