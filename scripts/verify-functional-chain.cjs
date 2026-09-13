// End-to-end UI + real local HTTP stack; all external calls are injected test fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createWarriorServer } = require('../server');
const { createSimulationBattles } = require('../simulation-battles');
const { ROUND } = require('../prediction-sim');

(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-functional-'));
  let time = 1800000010000, placeCalls = 0, priceUnavailable = false;
  const transactionHash = '0x' + 'a'.repeat(64);
  const topic = start => ({ marketTopicId: String(start), symbol: 'BTCUSDT', marketVariant: 'CRYPTO_UP_DOWN', collateral: 'USDT', startDate: start, endDate: start + ROUND,
    markets: [{ marketId: String(start), status: time >= start + ROUND ? 'RESOLVED' : 'REGISTERED', tradingStatus: 'OPEN', outcomes: [
      { name: 'Up', tokenId: 'up', winner: time >= start + ROUND ? true : null }, { name: 'Down', tokenId: 'down', winner: time >= start + ROUND ? false : null },
    ] }] });
  const marketSource = { marketFor: async start => topic(start), detail: async id => topic(Number(id)), book: async (_, direction) => ({ tokenId: direction === 'UP' ? 'up' : 'down', timestamp: time, asks: [{ price: .4, size: 1000 }], bids: [{ price: .39, size: 1000 }] }) };
  const simulation = createSimulationBattles({ file: path.join(output, 'ledger.json'), now: () => time, leaseEnabled: false,
    source: marketSource,
    indicatorSource: { snapshot: async () => ({ symbol: 'BTCUSDT', dataTimestamp: time, source: 'TEST_FIXTURE', price: 65000.12,
      priceChangePct: { oneMinute: 1, fiveMinutes: 2 }, rsi14: 60, ema: { ema5: 105, ema20: 100 },
      macd: { line: 1, signal: .5, histogram: .5 }, bollinger: { middle: 100, upper: 103, lower: 97, percentB: .7, bandwidthPct: 6 },
      atr: { value: .2, percent: .2 }, adx: { adx: 28, plusDI: 30, minusDI: 10 }, roc: { tenMinutes: .8, twentyMinutes: 1.2 },
      longReturns: { fifteenMinutes: .9, sixtyMinutes: 2.1 }, momentum: 2, volatility: { perMinutePct: .1 }, volumeRatio: 1.2,
      takerFlow: { buyRatio: .65, netBase: 30, totalBase: 100 }, spotOrderBookImbalance: .2,
      spread: { basisPoints: 1, mid: 100, microprice: 100.001, micropriceBiasBps: .1 },
      raw: { klines: [['test fixture']], depth: { bids: [[100, 2]], asks: [[101, 1]] } } }) },
    decisionProvider: { describe: () => ({ mode: 'mock', simulated: true }), decide: async input => ({ round_id: input.market.round_id, action: 'BET', direction: 'UP', stake_usdt: 1, stake_pct: 100 / input.account.balance, confidence: 90, risk_mode: 'NORMAL', factors: [], reason: 'UI test fixture', data_fresh: true, warnings: [] }) },
  });
  const server = createWarriorServer({ simulation, predictionSource: marketSource, paperFile: null, executionFile: path.join(output, 'executions.json'), now: () => time,
    marketFetch: async address => {
      if (priceUnavailable) throw new Error('TEST_PRICE_UNAVAILABLE');
      const url = new URL(address);
      if (!url.pathname.endsWith('/aggTrades')) throw new Error('UNEXPECTED_TEST_PRICE_ENDPOINT');
      return { ok: true, json: async () => [{ p: url.searchParams.get('symbol') === 'BTCUSDT' ? '65000.12' : '3500.34', T: time }] };
    },
    // This is a local fixture-only server; the injected adapter never reaches Binance.
    liveQuotesEnabled: true, liveTradingEnabled: true, walletCli: async args => {
      if (args.join(' ') === 'wallet status') return { data: { status: 'CONNECTED' } };
      if (args.join(' ') === 'wallet settings') return { data: { predictionEnabled: true, predictionQuotaLeft: 10 } };
      if (args[1] === 'tx-lock') return { data: { status: 'UNLOCKED' } };
      if (args[2] === 'quote') return { data: { quoteId: 'fixture-quote', amountIn: 1, expectedShares: 2.5, expireAt: time + 8000 } };
      if (args[2] === 'place-order') { placeCalls++; return { data: { orderId: 'fixture-order', status: 'SUBMITTED', txHash: transactionHash } }; }
      if (args[1] === 'order' && args[2] === 'history') return { data: [{ orderId: 'fixture-order', status: 'FILLED', txHash: transactionHash, shares: 2.5 }] };
      if (args[1] === 'tx-history') return { data: { txHash: transactionHash, status: 'confirmed' } };
      throw new Error('FIXTURE_BLOCKED_COMMAND: ' + args.join(' '));
    } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
    await require('./price-socket-fixture.cjs')(page.context());
    page.setDefaultTimeout(10000); page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({ time: new Date(time) });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.Warrior?.state?.simulation);
    console.log((await page.locator('#simulation-commandbar').ariaSnapshot()).slice(0, 1200));
    await page.locator('#sim-create button[type=submit]').click();
    await page.locator('.strategy-list-toggle').click();
    await page.locator('[data-ai-config=deepseek] .ai-choice').click();
    await page.locator('#rounds [data-rounds="10"]').click();
    await page.locator('#create-form button[type=submit]').click();
    assert.equal(simulation.list().length, 1);
    await page.locator('#confirm-create').click();
    await page.waitForFunction(() => window.Warrior.state.simulation.id !== 'default');
    const id = await page.evaluate(() => window.Warrior.state.simulation.id);
    assert.equal(simulation.snapshot(id).initialTotal, 20);
    await simulation.tick(); time = simulation.snapshot(id).nextSlot; await simulation.tick();
    await page.clock.setFixedTime(new Date(time));
    await page.locator('.bottom-nav [data-page=reports]').click();
    await page.waitForFunction(() => window.Warrior.state.simulation.roundCount === 1);
    const battle = simulation.snapshot(id);
    assert.equal(battle.agents[0].orders.length, 1, JSON.stringify({ error: battle.error, agent: battle.agents[0], audit: battle.auditTrail.slice(-5) }));
    await page.locator('.bottom-nav [data-page=overview]').click();
    await page.clock.runFor(5100);
    await page.waitForFunction(() => document.querySelector('#live-price-panel').dataset.state === 'live');
    assert.equal(parseFloat(await page.locator('.live-price-value').innerText()), 65000.12);
    const cardCount = await page.locator('.model-card').count();
    for (let index = 0; index < cardCount; index++) {
      await page.locator('.model-card').nth(index).click();
      const text = await page.locator('#detail-dialog .agent-order-details').innerText();
      assert.ok(text.includes('2.50×') && text.includes('2.50 U') && text.includes('+1.50 U'), text);
      await page.locator('#detail-dialog .close-dialog').click();
    }
    for (const width of [393, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['zh-CN', 'en']) {
        if (await page.locator('html').getAttribute('lang') !== locale) await page.locator('.language-toggle').selectOption(locale === 'zh-CN' ? 'zh' : locale);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.ok(await page.locator('#live-price-panel').isVisible());
        await page.screenshot({ path: path.join(output, `price-returns-${width}-${locale}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 393, height: 852 });
    await page.locator('.bottom-nav [data-page=reports]').click();
    await page.locator('[data-audit-key="history"]').waitFor();
    console.log((await page.locator('.report-card').ariaSnapshot()).slice(-6000));
    await page.locator('[data-audit-key="history"] > summary').click();
    const snapshotEvent = battle.auditTrail.find(e => e.type === 'MARKET_SNAPSHOT');
    const round = page.locator(`details[data-audit-key="round-${snapshotEvent.roundId}"]`);
    await round.locator('summary').first().click();
    const sourceDetails = page.locator(`[data-audit-key="event-${snapshotEvent.id}"]`);
    await sourceDetails.locator('summary').click();
    assert.ok((await sourceDetails.innerText()).includes('TEST_FIXTURE'));
    for (const width of [393, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['zh-CN', 'en']) {
        if (await page.locator('html').getAttribute('lang') !== locale) await page.locator('.language-toggle').selectOption(locale === 'zh-CN' ? 'zh' : locale);
        await page.locator('.report-card').waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.ok(await round.getAttribute('open') !== null);
        await page.screenshot({ path: path.join(output, `history-${width}-${locale}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 393, height: 852 });
    await page.locator('#betting-mode-toggle').click();
    await page.locator('#live-risk-dialog .primary').click();
    await page.locator('#confirm-live-agents').click();
    const intentButton = page.locator('.agent-live-intent').first();
    await intentButton.waitFor({ state: 'visible' });
    await intentButton.click();
    await page.locator('#quote-intent').waitFor();
    assert.equal(placeCalls, 0);
    await page.locator('#quote-intent').click();
    await page.locator('#execution-consent').waitFor();
    assert.equal(placeCalls, 0);
    assert.equal(await page.locator('#submit-execution').isDisabled(), true);
    await page.screenshot({ path: path.join(output, 'quote-review.png') });
    await page.locator('#execution-consent').check();
    await page.locator('#submit-execution').click();
    await page.getByRole('button', { name: 'Read order and wallet evidence', exact: true }).waitFor();
    assert.equal(placeCalls, 1);
    await page.getByRole('button', { name: 'Read order and wallet evidence', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#execution-dialog').textContent.includes('EVIDENCE_LINKED'));
    await page.locator('#execution-dialog details summary').click();
    assert.ok((await page.locator('#execution-dialog').innerText()).includes('"walletReceiptVerified": false'));
    await page.locator('#execution-dialog > button').last().click();
    const stop = simulation.end(id);
    assert.equal(stop.status, 'settling'); time += ROUND; await simulation.tick();
    await page.clock.setFixedTime(new Date(time));
    const recapConfirm = page.locator('#round-recap-dialog button.primary');
    try { await recapConfirm.waitFor({ state: 'visible', timeout: 3000 }); await recapConfirm.click(); } catch {}
    await page.locator('.bottom-nav [data-page=reports]').click();
    await page.waitForFunction(() => window.Warrior.state.simulation.status === 'ended');
    if (await recapConfirm.isVisible()) await recapConfirm.click();
    const report = simulation.snapshot(id);
    assert.ok(report.agents.every(a => a.reconciliation.matched && a.latest.settlement.payout === 2.5));
    await page.locator('.report-order-heading').first().waitFor();
    const settledOrder = page.locator('.report-order-details').first();
    if (await settledOrder.getAttribute('open') === null) await settledOrder.locator('.report-order-heading').click();
    await settledOrder.locator('.audit-details summary').click();
    assert.ok((await settledOrder.innerText()).includes('official-market'));
    await page.screenshot({ path: path.join(output, 'settlement-393-en.png'), fullPage: true });
    await page.reload(); await page.waitForFunction(() => window.Warrior?.state?.simulation?.status === 'ended');
    const compactReload = await page.evaluate(() => window.Warrior.state.simulation);
    assert.deepEqual(compactReload.auditTrail, []);
    assert.deepEqual(compactReload.agents.map(agent => ({ id: agent.id, cash: agent.cash, status: agent.latest.status })),
      report.agents.map(agent => ({ id: agent.id, cash: agent.cash, status: agent.latest.status })));
    await page.locator('.bottom-nav [data-page=reports]').click();
    await page.locator('.report-order-heading').first().waitFor();
    assert.ok((await page.locator('.report-order').first().innerText()).includes('2.50'));
    const loadedReport = await page.evaluate(battleId => fetch(`/api/simulation?battleId=${encodeURIComponent(battleId)}&view=full`).then(response => response.json()), id);
    assert.deepEqual(loadedReport, report);
    await page.locator('[data-audit-key="history"] > summary').click();
    await page.locator('#view-executions').click();
    await page.waitForFunction(() => document.querySelector('#execution-dialog').textContent.includes('RECONCILED'));
    priceUnavailable = true;
    await page.evaluate(() => { window.__priceSilent = true; });
    time += 16000; // Expire both the server-side cache and the browser timestamp.
    await page.clock.setFixedTime(new Date(time));
    await page.clock.runFor(5100);
    await page.waitForFunction(() => document.querySelector('#live-price-panel').dataset.state === 'unavailable');
    assert.equal(await page.locator('.live-price-value').innerText(), '—');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', checks: ['confirmation before create', 'persisted raw inputs and all decisions in UI', 'paper reconciliation and settlement evidence', 'quote does not submit', 'separate checkbox confirmation', 'exact order/hash linkage', 'compact live reload and on-demand full report', '393/768/1440 zh/en'], placeCalls, externalCalls: 0, output }));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
