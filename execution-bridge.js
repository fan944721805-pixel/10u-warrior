const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const fail = code => Object.assign(new Error(code), { code, statusCode: 409 });

// Separate from the immutable paper ledger: this journal contains external execution evidence.
function createExecutionBridge({ file, now = Date.now, getIntent, requestQuote, submitOrder, readOrders, readTransaction,
  quotesEnabled = false, tradingEnabled = false, maxOrder = 10 }) {
  let rows = [], storageFailed = false;
  if (file && fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved.version !== 1 || !Array.isArray(saved.executions) || saved.executions.some(row => !row.id || !row.intent?.id || !Array.isArray(row.events))) throw fail('INVALID_EXECUTION_JOURNAL');
    rows = saved.executions;
    for (const row of rows) {
      if (row.status === 'QUOTING') row.status = 'QUOTE_INTERRUPTED';
      if (row.status === 'SUBMITTING') row.status = 'UNKNOWN';
    }
  }
  const copy = value => structuredClone(value);
  function save() {
    if (storageFailed) throw fail('EXECUTION_STORAGE_ERROR');
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify({ version: 1, executions: rows }), { mode: 0o600 });
      fs.renameSync(file + '.tmp', file);
    } catch { storageFailed = true; throw fail('EXECUTION_STORAGE_ERROR'); }
  }
  function view(row) {
    const { privateQuoteId, ...result } = row;
    return copy(result);
  }
  function get(id) { const row = rows.find(item => item.id === id); if (!row) throw fail('EXECUTION_NOT_FOUND'); return row; }
  function resolve(battleId, intentId) {
    const { battle, agent, intent } = getIntent(battleId, intentId);
    if (!battle.enabled || battle.status !== 'running') throw fail('BATTLE_NOT_RUNNING');
    if (!intent || intent.mode !== 'paper' || intent.side !== 'BUY' || intent.orderType !== 'MARKET') throw fail('INTENT_NOT_ELIGIBLE');
    if (intent.marketSource && intent.marketSource !== 'binance-prediction') throw fail('PRACTICE_INTENT_NOT_EXECUTABLE');
    if (intent.id !== intentId || intent.agentId !== agent.id || battle.id !== battleId || !intent.tokenId || !intent.marketTopicId) throw fail('INTENT_IDENTITY_MISMATCH');
    if (!Number.isFinite(intent.expiresAt) || now() >= intent.expiresAt) throw fail('INTENT_EXPIRED');
    if (!Number.isFinite(intent.amount) || intent.amount <= 0 || intent.amount > maxOrder) throw fail('INTENT_OVER_LIMIT');
    return { battle, agent, intent: copy(intent) };
  }
  function preview(battleId, intentId) {
    const { battle, agent, intent } = resolve(battleId, intentId);
    return { battleId, battleName: battle.name, agentId: agent.id, agentName: agent.policy.name, intent,
      quotesEnabled, tradingEnabled, confirmationRequired: true, mode: 'preview-only' };
  }
  async function quote(battleId, intentId, slippageBps = 1000) {
    if (!quotesEnabled) throw fail('LIVE_QUOTES_DISABLED');
    if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 5000) throw fail('INVALID_SLIPPAGE');
    const { battle, agent, intent } = resolve(battleId, intentId);
    if (rows.some(row => row.battleId === battleId && row.intent.id === intentId && !['QUOTE_FAILED', 'QUOTE_INTERRUPTED'].includes(row.status))) throw fail('INTENT_ALREADY_BRIDGED');
    const allocated = rows.filter(row => row.battleId === battleId && row.agentId === agent.id && !['QUOTE_FAILED', 'QUOTE_INTERRUPTED'].includes(row.status)).reduce((sum, row) => sum + row.intent.amount, 0);
    if (allocated + intent.amount > battle.config.initialBalance + 1e-8) throw fail('LIVE_BATTLE_BUDGET_EXCEEDED');
    const row = { id: crypto.randomUUID(), battleId, agentId: agent.id, intent, slippageBps, status: 'QUOTING', createdAt: now(), events: [] };
    rows.push(row); save();
    try {
      const quote = await requestQuote(intent, slippageBps, () => resolve(battleId, intentId));
      resolve(battleId, intentId); // No quote survives pause/end/expiry while the request was in flight.
      const amount = Number(quote.amountIn ?? quote.inputAmount);
      let expiry = typeof quote.expireAt === 'number' ? quote.expireAt : Number(quote.expireAt ?? quote.expiresAt);
      if (!Number.isFinite(expiry)) expiry = Date.parse(quote.expireAt ?? quote.expiresAt);
      else if (expiry < 10000000000) expiry *= 1000;
      if (!quote.quoteId || !Number.isFinite(amount) || !Number.isFinite(expiry) || expiry <= now() || Math.abs(amount - intent.amount) > 1e-8) throw fail('UNSAFE_LIVE_QUOTE');
      row.privateQuoteId = String(quote.quoteId);
      const { quoteId, ...publicQuote } = quote;
      row.quote = copy(publicQuote); row.expiresAt = Math.min(expiry, intent.expiresAt);
      row.status = 'QUOTED'; row.events.push({ type: 'QUOTED', at: now() }); save();
      return view(row);
    } catch (error) { row.status = 'QUOTE_FAILED'; row.error = error.code || 'QUOTE_FAILED'; save(); throw error; }
  }
  async function submit(id, confirmed) {
    if (!tradingEnabled) throw fail('LIVE_TRADING_DISABLED');
    if (confirmed !== true) throw fail('HUMAN_CONFIRMATION_REQUIRED');
    const row = get(id);
    if (row.status !== 'QUOTED') throw fail('EXECUTION_ALREADY_CONSUMED');
    resolve(row.battleId, row.intent.id);
    if (now() >= row.expiresAt) throw fail('QUOTE_EXPIRED');
    row.status = 'SUBMITTING'; row.events.push({ type: 'HUMAN_CONFIRMED', at: now() }); save();
    try {
      const guard = () => {
        resolve(row.battleId, row.intent.id);
        if (now() >= row.expiresAt) throw fail('QUOTE_EXPIRED');
      };
      row.order = copy(await submitOrder(row.privateQuoteId, row.intent, row.slippageBps, guard));
      row.status = 'SUBMITTED'; row.events.push({ type: 'SUBMITTED_NOT_YET_FILLED', at: now() }); save();
      return view(row);
    } catch (error) { row.status = 'UNKNOWN'; row.error = error.code || 'SUBMISSION_UNKNOWN'; save(); throw error; }
  }
  async function reconcile(id) {
    const row = get(id);
    if (!['SUBMITTED', 'UNKNOWN', 'RECONCILED'].includes(row.status)) throw fail('EXECUTION_NOT_SUBMITTED');
    if (!row.order?.orderId) { row.reconciliation = { status: 'UNRESOLVED', reason: 'MISSING_OFFICIAL_ORDER_ID' }; save(); return view(row); }
    const history = await readOrders();
    const list = Array.isArray(history) ? history : history?.orders ?? history?.list;
    const matches = Array.isArray(list) ? list.filter(item => String(item.orderId) === String(row.order.orderId)) : [];
    if (matches.length !== 1) { row.reconciliation = { status: 'UNRESOLVED', reason: 'EXACT_ORDER_NOT_FOUND' }; save(); return view(row); }
    const official = copy(matches[0]);
    const txHash = official.txHash || official.transactionHash || row.order.txHash || row.order.transactionHash;
    let transaction = null;
    let walletResponse = null;
    if (typeof txHash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      walletResponse = await readTransaction(txHash);
      const candidates = Array.isArray(walletResponse) ? walletResponse : walletResponse?.transactions ?? walletResponse?.list ?? [walletResponse];
      const exact = Array.isArray(candidates) ? candidates.filter(item => String(item?.txHash || item?.transactionHash || item?.hash || '').toLowerCase() === txHash.toLowerCase()) : [];
      if (exact.length === 1) transaction = copy(exact[0]);
    }
    row.reconciliation = { status: transaction ? 'EVIDENCE_LINKED' : 'ORDER_ONLY', observedAt: now(), officialOrder: official,
      transactionHash: txHash || null, walletEvidence: transaction, walletResponse: copy(walletResponse), walletReceiptVerified: false };
    // Linked source records are not automatically proof of payout or wallet receipt.
    row.status = 'RECONCILED'; row.events.push({ type: 'RECONCILIATION_READ', at: now() }); save();
    return view(row);
  }
  return { preview, quote, submit, reconcile, list: battleId => rows.filter(row => !battleId || row.battleId === battleId).map(view), get: id => view(get(id)) };
}

module.exports = { createExecutionBridge };
