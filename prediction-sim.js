const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { roundContext } = require('./round-direction');
const { atomicWriteJson } = require('./atomic-json');
const { assertDecisionInputs, buildDecisionContext, decisionAudit, entrySignal, normalizePolicy, rejectedDecisionAudit, validateDecision } = require('./ai-decision');
const { decisionStage, peerSnapshot } = require('./public/strategy-catalog');
const PERIODS = Object.freeze({
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
});
const ROUND = PERIODS['5m'];
const EASTERN_NOON_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const STAKE = 5;
const MIN_STAKE = 1;
const ENTRY_POLL_MS = 5000;
const ENTRY_COOLDOWN_MS = 30000;
const ENTRY_CLOSE_BUFFER_MS = 30000;
const error = code => Object.assign(new Error(code), { code });
function normalizeBattleEmotion(value = 0) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) throw error('INVALID_BATTLE_EMOTION');
  return value;
}
function normalizeBattleActionUrge(value = 0) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) throw error('INVALID_BATTLE_ACTION_URGE');
  return value;
}
function normalizeRealtimeEntry(value = false) {
  if (typeof value !== 'boolean') throw error('INVALID_REALTIME_ENTRY');
  return value;
}

function decisionDiversity(auditTrail = [], windowSize = 50) {
  const grouped = new Map();
  for (const event of auditTrail) {
    if (event?.type !== 'DECISION' || !event.agentId || !['BET','SKIP'].includes(event.decision?.action)) continue;
    const key = String(event.roundId ?? event.decision.roundId ?? '');
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, new Map());
    grouped.get(key).set(String(event.agentId), event.decision);
  }
  const rounds = [...grouped.values()].filter(items=>items.size>=2).slice(-Math.max(1,windowSize));
  let pairs=0,collisions=0,directionPairs=0,directionMatches=0;
  for(const items of rounds){
    const decisions=[...items.values()];
    for(let left=0;left<decisions.length;left++)for(let right=left+1;right<decisions.length;right++){
      const a=decisions[left],b=decisions[right];pairs++;
      if(a.action==='BET'&&b.action==='BET'){
        directionPairs++;if(a.direction===b.direction)directionMatches++;
        const aPct=Number(a.stakePct),bPct=Number(b.stakePct),sameStake=Number.isFinite(aPct)&&Number.isFinite(bPct)
          ? Math.abs(aPct-bPct)<=.5
          : Math.abs(Number(a.stake)-Number(b.stake))<=.01;
        if(a.direction===b.direction&&sameStake)collisions++;
      }else if(a.action==='SKIP'&&b.action==='SKIP')collisions++;
    }
  }
  return {
    window:Math.max(1,windowSize),rounds:rounds.length,pairs,
    collisionRate:pairs?collisions/pairs:null,
    directionAgreementRate:directionPairs?directionMatches/directionPairs:null,
  };
}

function normalizePeriod(value = '5m') {
  const period = String(value || '5m').toLowerCase();
  if (!Object.hasOwn(PERIODS, period)) throw error('INVALID_BATTLE_PERIOD');
  return period;
}

function easternParts(value) {
  return Object.fromEntries(EASTERN_NOON_FORMATTER.formatToParts(new Date(value))
    .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

function easternNoon(year, month, day) {
  const target = Date.UTC(year, month - 1, day, 12, 0, 0);
  let candidate = target;
  for (let index = 0; index < 3; index += 1) {
    const parts = easternParts(candidate);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    candidate += target - represented;
  }
  return candidate;
}

function nextRoundSlot(value, roundMs = ROUND) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || !Object.values(PERIODS).includes(roundMs)) throw error('INVALID_BATTLE_PERIOD');
  if (roundMs !== PERIODS['1d']) return (Math.floor(timestamp / roundMs) + 1) * roundMs;
  const local = easternParts(timestamp);
  let candidate = easternNoon(local.year, local.month, local.day);
  if (candidate <= timestamp) {
    const nextDate = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
    candidate = easternNoon(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate());
  }
  return candidate;
}

function isRoundBoundary(value, roundMs = ROUND) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return false;
  if (roundMs !== PERIODS['1d']) return timestamp % roundMs === 0;
  const local = easternParts(timestamp);
  return local.hour === 12 && local.minute === 0 && local.second === 0 && easternNoon(local.year, local.month, local.day) === timestamp;
}

function validateMarket(topic, slot, symbol = 'BTCUSDT', roundMs = ROUND) {
  const market = topic?.markets?.[0];
  if (topic?.symbol !== symbol || topic.marketVariant !== 'CRYPTO_UP_DOWN' || topic.collateral !== 'USDT' ||
      Number(topic.startDate) !== slot || Number(topic.endDate) !== slot + roundMs || !isRoundBoundary(slot, roundMs) ||
      topic.markets?.length !== 1 || market?.outcomes?.length !== 2 ||
      !['Up', 'Down'].every(name => market.outcomes.some(o => o.name === name && o.tokenId))) throw error('INVALID_MARKET');
  return topic;
}

// Walk real asks; never use the market's indicative last price as a fill price.
function quoteFromBook(book, tokenId, now, amount = STAKE) {
  const timestamp = Number(book?.timestamp);
  if (String(book?.tokenId) !== String(tokenId) || !Number.isFinite(timestamp) || now - timestamp > 10000 || timestamp > now + 2000) throw error('STALE_BOOK');
  if (!Array.isArray(book.asks) || !book.asks.length) throw error('NO_LIQUIDITY');
  const asks = book.asks.map(row => ({ price: Number(row.price), size: Number(row.size) }));
  if (asks.some(row => !Number.isFinite(row.price) || row.price <= 0 || row.price >= 1 || !Number.isFinite(row.size) || row.size <= 0)) throw error('INVALID_BOOK');
  asks.sort((a, b) => a.price - b.price);
  let remaining = amount, shares = 0;
  const fills = [];
  for (const row of asks) {
    const quantity = Math.min(row.size, remaining / row.price);
    shares += quantity;
    remaining -= quantity * row.price;
    fills.push({ price: row.price, shares: quantity });
    if (remaining < 1e-8) break;
  }
  if (remaining > 1e-8) throw error('INSUFFICIENT_LIQUIDITY');
  if (!Number.isFinite(shares) || shares <= 0) throw error('INVALID_BOOK');
  return { amount, shares, averagePrice: amount / shares, odds: shares / amount, bookTime: timestamp, fills, feesIncluded: false };
}

function createPredictionSource(run) {
  const detail = async id => (await run(['prediction', 'market', 'detail', '--marketTopicId', String(id)])).data;
  return {
    detail,
    async marketFor(slot, symbol = 'BTCUSDT', roundMs = ROUND) {
      const query = ({ BTCUSDT: 'Bitcoin', ETHUSDT: 'Ethereum', BNBUSDT: 'BNB' })[symbol];
      if (!query || !Object.values(PERIODS).includes(roundMs)) throw error('INVALID_MARKET');
      const { data } = await run(['prediction', 'market', 'search', '--query', query, '--limit', '50']);
      const candidates = Array.isArray(data)
        ? data.filter(item => item?.symbol === symbol && item.marketVariant === 'CRYPTO_UP_DOWN' && Number(item.endDate) - Number(item.startDate) === roundMs)
        : [];
      if (!candidates.length) throw error('MARKET_NOT_FOUND');
      const direct = candidates.find(item => Number(item.startDate) === slot && Number(item.endDate) === slot + roundMs);
      const timeline = candidates.flatMap(item => Array.isArray(item.timeline) ? item.timeline : [])
        .find(item => Number(item.startDate) === slot && Number(item.endDate) === slot + roundMs);
      if (direct || timeline) return validateMarket(await detail((direct || timeline).marketTopicId), slot, symbol, roundMs);

      // Search results are not ordered reliably. Inspect a few closest roots in parallel instead of
      // assuming the first result owns the requested five-minute timeline.
      const closest = candidates.slice().sort((left, right) =>
        Math.abs(Number(left.startDate) - slot) - Math.abs(Number(right.startDate) - slot)).slice(0, 3);
      const roots = await Promise.allSettled(closest.map(item => detail(item.marketTopicId)));
      for (const result of roots) {
        if (result.status !== 'fulfilled') continue;
        const root = result.value;
        if (Number(root?.startDate) === slot && Number(root?.endDate) === slot + roundMs) return validateMarket(root, slot, symbol, roundMs);
        const item = root?.timeline?.find(entry => Number(entry.startDate) === slot && Number(entry.endDate) === slot + roundMs);
        if (item) return validateMarket(await detail(item.marketTopicId), slot, symbol, roundMs);
      }
      throw error('MARKET_NOT_FOUND');
    },
    async book(topic, direction) {
      const market = topic.markets[0];
      const token = market.outcomes.find(o => o.name === (direction === 'UP' ? 'Up' : 'Down'));
      return (await run(['prediction', 'market', 'order-book', '--marketId', String(market.marketId), '--tokenId', token.tokenId])).data;
    },
  };
}

function createPredictionSimulation({ source, indicatorSource, decisionProvider, policyFor, agentPolicies, initialBalance = 100, maxRounds = null,
  asset = 'BTCUSDT', period = '5m', emotionLevel = 0, actionUrgeLevel = 0, realtimeEntry = false, file, now = Date.now, random = () => crypto.randomInt(2), enabled = true, leaseEnabled = false, leaseMs = 30000, pauseOnRestore = false, pauseOnError = false, onChange = () => {} }) {
  let normalizedAsset = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'].includes(String(asset).toUpperCase()) ? String(asset).toUpperCase() : 'BTCUSDT';
  const normalizedPeriod = normalizePeriod(period);
  let roundMs = PERIODS[normalizedPeriod];
  const startingPolicies = Array.isArray(agentPolicies) && agentPolicies.length ? agentPolicies : ['A', 'B', 'C'].map(id => ({ id }));
  const startingBalance = Math.max(0.01, Math.round(Number(initialBalance) * 100) / 100 || 100);
  const roundLimit = maxRounds === 'until-loss' || maxRounds == null ? null : Math.max(1, Math.floor(Number(maxRounds)) || 1);
  const makeInitialAgents = () => startingPolicies.map((item, index) => {
    const id = String(item?.id || ['A', 'B', 'C'][index] || `agent-${index + 1}`);
    return { id, cash: startingBalance, orders: [], lastStatus: 'WAITING', lastDecision: null, policy: normalizePolicy({ ...(policyFor?.(id) || {}), ...item }, id) };
  });
  let state = {
    version: 2,
    enabled,
    lifecycle: enabled ? 'running' : 'paused',
    endReason: null,
    endedAt: null,
    rounds: [],
    auditTrail: [],
    config: { initialBalance: startingBalance, maxRounds: roundLimit, asset: normalizedAsset, period: normalizedPeriod, roundMs, emotionLevel: normalizeBattleEmotion(emotionLevel), actionUrgeLevel: normalizeBattleActionUrge(actionUrgeLevel), realtimeEntry: normalizeRealtimeEntry(realtimeEntry) },
    agents: makeInitialAgents(),
    lastSeenAt: leaseEnabled ? now() : null,
  };
  const restored = Boolean(file && fs.existsSync(file));
  if (restored) {
    state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (![1, 2].includes(state.version) || !Array.isArray(state.agents) || !state.agents.length || !Array.isArray(state.rounds) ||
      state.agents.some(a => typeof a.id !== 'string' || !Number.isFinite(a.cash) || a.cash < 0 || !Array.isArray(a.orders))) throw error('INVALID_SIM_LEDGER');
    state.version = 2;
    state.lifecycle = state.lifecycle || (state.enabled === false ? 'paused' : 'running');
    state.endReason = state.endReason || null;
    state.endedAt = state.endedAt || null;
    state.config = { initialBalance: startingBalance, maxRounds: roundLimit, asset: normalizedAsset, period: normalizedPeriod, roundMs, ...(state.config || {}) };
    try {
      state.config.period = normalizePeriod(state.config.period ?? normalizedPeriod);
      state.config.roundMs = PERIODS[state.config.period];
    } catch { throw error('INVALID_SIM_LEDGER'); }
    try { state.config.emotionLevel = normalizeBattleEmotion(state.config.emotionLevel ?? 0); }
    catch { throw error('INVALID_SIM_LEDGER'); }
    try { state.config.actionUrgeLevel = normalizeBattleActionUrge(state.config.actionUrgeLevel ?? 0); }
    catch { throw error('INVALID_SIM_LEDGER'); }
    try { state.config.realtimeEntry = normalizeRealtimeEntry(state.config.realtimeEntry ?? false); }
    catch { throw error('INVALID_SIM_LEDGER'); }
    state.auditTrail = Array.isArray(state.auditTrail) ? state.auditTrail : [];
    state.lastSeenAt = state.lastSeenAt ?? (leaseEnabled ? now() : null);
  }
  normalizedAsset = state.config.asset;
  roundMs = state.config.roundMs;
  for (const agent of state.agents) agent.policy = normalizePolicy(agent.policy || policyFor?.(agent.id), agent.id);
  let storageFailed = false, storageIssue = null, controlVersion = 0;
  state.viewInstance = typeof state.viewInstance === 'string' && state.viewInstance ? state.viewInstance : crypto.randomUUID();
  state.viewRevision = Number.isSafeInteger(state.viewRevision) && state.viewRevision >= 0 ? state.viewRevision : 0;
  state.updatedAt = Number.isFinite(state.updatedAt) ? state.updatedAt : now();
  const referencePrices = new Map(state.auditTrail.filter(event => event.type === 'MARKET_SNAPSHOT' && Number.isFinite(Number(event.indicators?.price)))
    .map(event => [event.id, Number(event.indicators.price)]));
  function markChanged(reason = 'state') {
    state.viewRevision += 1; state.updatedAt = now();
    try { onChange({ version: `${state.viewInstance}:${state.viewRevision}`, updatedAt: state.updatedAt, reason }); } catch {}
  }
  const viewMeta = () => ({ stateVersion: `${state.viewInstance}:${state.viewRevision}`, updatedAt: state.updatedAt });
  function record(type, fields = {}) {
    const event = structuredClone({ id: state.auditTrail.length + 1, type, recordedAt: now(), ...fields });
    event.hash = crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex');
    state.auditTrail.push(event);
    if (type === 'MARKET_SNAPSHOT' && Number.isFinite(Number(event.indicators?.price))) referencePrices.set(event.id, Number(event.indicators.price));
    return event.id;
  }
  function save(reason = 'state') {
    markChanged(reason);
    if (!file) return;
    if (storageFailed) throw error('STORAGE_ERROR');
    try {
      atomicWriteJson(file, state);
    } catch (cause) {
      storageFailed = true; state.enabled = false;
      if (!['ended', 'settling'].includes(state.lifecycle)) state.lifecycle = 'paused';
      state.endReason = 'STORAGE_ERROR';
      storageIssue = { code: cause.code || cause.name || 'UNKNOWN', operation: cause.storageOperation || cause.syscall || 'save', file: path.basename(file), at: now() };
      markChanged('storage-error');
      throw Object.assign(error('STORAGE_ERROR'), { storageIssue });
    }
  }
  if (restored && pauseOnRestore && state.enabled && !['ended', 'settling'].includes(state.lifecycle)) {
    state.enabled = false;
    state.lifecycle = 'paused';
    state.endReason = 'SERVER_RESTARTED';
    record('PAUSED', { reason: state.endReason });
    save();
  }
  for (const a of state.agents) if (a.lastStatus === 'QUOTING') a.lastStatus = 'SKIPPED';
  let nextSlot = nextRoundSlot(now(), roundMs);
  let prepared = null, busy = false, lastPrepare = 0, lastSettle = 0, failure = null;
  const { RETRY_DELAYS, recoveryKind } = require('./recovery-policy');
  let recoveryProbe = false;
  state.recovery = state.recovery || null;
  function enterRecovery(cause, stage = 'market') {
    if (storageFailed || state.lifecycle === 'ended' || cause?.code === 'RECOVERY_WAIT') return;
    if (state.recovery) return; // Concurrent requests share one retry budget.
    const code = cause?.code || cause?.name || 'MARKET_UNAVAILABLE';
    controlVersion++;
    prepared = null;
    state.entryRound = null;
    state.recovery = { status: 'retrying', code, kind: recoveryKind(code), stage,
      attempts: 0, maxAttempts: RETRY_DELAYS.length, since: now(), lastAttemptAt: null,
      nextRetryAt: now() + RETRY_DELAYS[0] };
    record('RECOVERY_STARTED', { code, stage });
    save('recovery-started');
  }
  async function readSource(method, ...args) {
    if (state.recovery && !recoveryProbe) throw error('RECOVERY_WAIT');
    try { return await source[method](...args); }
    catch (cause) {
      // A missed entry window or thin buy depth is an ordinary skipped bet.
      if (!['QUOTE_WINDOW_MISSED', 'INSUFFICIENT_LIQUIDITY', 'INSUFFICIENT_DEPTH'].includes(cause.code)) enterRecovery(cause, method);
      throw cause;
    }
  }
  async function recover() {
    const recovery = state.recovery;
    if (!recovery || recovery.status === 'exhausted') return;
    if (recovery.attempts >= RETRY_DELAYS.length) {
      recovery.status = 'exhausted'; recovery.nextRetryAt = null; save('recovery-exhausted'); return;
    }
    if (now() < recovery.nextRetryAt) return;
    recovery.attempts++;
    recovery.lastAttemptAt = now();
    // Consume the attempt before I/O. A restart cannot replenish its budget.
    recovery.nextRetryAt = now() + RETRY_DELAYS[Math.min(recovery.attempts, RETRY_DELAYS.length - 1)];
    save('recovery-attempt');
    recoveryProbe = true;
    try {
      await settle(); // Reconcile all expired orders before allowing new decisions.
      const groups = new Map();
      for (const agent of state.agents) for (const order of agent.orders.filter(o => o.status === 'OPEN')) {
        const key = `${order.topicId}:${order.tokenId}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(order);
      }
      for (const orders of groups.values()) {
        const order = orders[0], topic = await readSource('detail', order.topicId);
        validateMarket(topic, order.start, normalizedAsset, roundMs);
        const token = topic.markets[0].outcomes.find(o => o.name === (order.direction === 'UP' ? 'Up' : 'Down'));
        if (String(topic.marketTopicId) !== String(order.topicId) || String(token?.tokenId) !== String(order.tokenId)) throw error('MARKET_MISMATCH');
        if (order.end <= now() || ['RESOLVED', 'SETTLED', 'CLOSED'].includes(topic.markets[0].status)) throw error('AWAITING_SETTLEMENT');
        const book = await readSource('book', topic, order.direction);
        // Lazy import avoids the valuation module's market-validation dependency cycle.
        require('./position-valuation').sellValue(book, order.tokenId, orders.reduce((sum,o)=>sum+o.quote.shares,0), now());
      }
      if (recovery.stage === 'indicators') await indicatorSource.snapshot(normalizedAsset, state.config.period);
      nextSlot = nextRoundSlot(now(), roundMs);
      if (state.lifecycle !== 'settling') {
        const candidate = await readSource('marketFor', nextSlot, normalizedAsset, roundMs);
        validateMarket(candidate, nextSlot, normalizedAsset, roundMs);
        if (state.enabled) prepared = candidate;
      }
      state.recovery = null; failure = null; lastSettle = now();
      record('RECOVERY_SUCCEEDED', { attempts: recovery.attempts });
      save('recovery-succeeded');
    } catch (cause) {
      if (storageFailed) throw cause;
      recovery.code = cause.code || cause.name || 'MARKET_UNAVAILABLE';
      recovery.kind = recoveryKind(recovery.code);
      recovery.status = recovery.attempts >= RETRY_DELAYS.length ? 'exhausted' : 'retrying';
      recovery.nextRetryAt = recovery.status === 'exhausted' ? null : now() + RETRY_DELAYS[recovery.attempts];
      prepared = null;
      record('RECOVERY_FAILED', { code: recovery.code, attempt: recovery.attempts, exhausted: recovery.status === 'exhausted' });
      save('recovery-failed');
    } finally { recoveryProbe = false; }
  }
  let lastEntryPoll = -Infinity;
  const integratedDecisions = Boolean(indicatorSource && decisionProvider && policyFor);
  const restoredRound = state.rounds.at(-1);
  if (!state.entryRound && restoredRound != null && now() < restoredRound + roundMs) {
    const evidence = state.auditTrail.find(e => e.type === 'MARKET_SNAPSHOT' && e.roundId === String(restoredRound));
    if (evidence) {
      state.entryRound = { slot: restoredRound, market: evidence.market, oracles: {}, attempts: {} };
      for (const event of state.auditTrail.filter(e => e.type === 'DECISION_INPUT' && e.roundId === String(restoredRound))) {
        if (event.input.divination) state.entryRound.oracles[event.agentId] = event.input.divination;
      }
    }
  }
  function policy(id) { return structuredClone(state.agents.find(agent => agent.id === id).policy); }
  function streaks(orders) {
    const settled = orders.filter(order => ['WON', 'LOST'].includes(order.status)).slice().reverse();
    if (!settled.length) return { winStreak: 0, lossStreak: 0 };
    const status = settled[0].status;
    const count = settled.findIndex(order => order.status !== status);
    const length = count === -1 ? settled.length : count;
    return status === 'WON' ? { winStreak: length, lossStreak: 0 } : { winStreak: 0, lossStreak: length };
  }
  function account(a) {
    const open = a.orders.filter(order => order.status === 'OPEN');
    const wins = a.orders.filter(order => order.status === 'WON').length;
    const losses = a.orders.filter(order => order.status === 'LOST').length;
    return { balance: a.cash, initialBalance: state.config.initialBalance + (a.addedCapital || 0), wins, losses, openStake: open.reduce((sum, order) => sum + order.amount, 0), ...streaks(a.orders) };
  }
  function touchState() {
    if (leaseEnabled) state.lastSeenAt = now();
  }
  const hasOpenOrders = () => state.agents.some(agent => agent.orders.some(order => order.status === 'OPEN'));
  function finish(reason = 'MANUAL') {
    if (['ended', 'settling'].includes(state.lifecycle)) return;
    controlVersion++;
    state.enabled = false;
    state.lifecycle = 'settling';
    state.endReason = reason;
    finalize();
    save();
  }
  function finalize() {
    if (storageFailed) return;
    if (state.lifecycle !== 'settling' || hasOpenOrders() || busy) return;
    state.lifecycle = 'ended';
    state.endedAt = now();
    prepared = null;
    state.recovery = null;
    failure = null;
    state.report = snapshot();
    save();
  }
  function compactOrder(order, references) {
    const settlement = order.settlement ? { ...order.settlement } : null;
    if (settlement) delete settlement.evidence;
    const referencePrice = Number(order.referencePrice ?? references.get(order.intent?.snapshotId));
    return {
      id: order.id, topicId: order.topicId, start: order.start, end: order.end, tokenId: order.tokenId,
      direction: order.direction, amount: order.amount,
      marketSource: order.marketSource,
      quote: order.quote ? { amount: order.quote.amount, shares: order.quote.shares, averagePrice: order.quote.averagePrice, odds: order.quote.odds, feesIncluded: order.quote.feesIncluded, source: order.quote.source, expiresAt: order.quote.expiresAt, minReceive: order.quote.minReceive, feeShares: order.quote.feeShares, gasIncluded: order.quote.gasIncluded } : null,
      intent: order.intent || null, status: order.status, placedAt: order.placedAt, payout: order.payout,
      settledAt: order.settledAt, settlement, referencePrice: Number.isFinite(referencePrice) && referencePrice > 0 ? referencePrice : null,
    };
  }
  function buildSnapshot({ compact = false, includeOrders = true } = {}) {
    const active = state.agents.flatMap(a => a.orders).find(o => o.start <= now() && o.end > now());
    const status = ['ended', 'settling'].includes(state.lifecycle) ? state.lifecycle : state.recovery ? (state.recovery.status === 'exhausted' ? 'retry-paused' : 'reconnecting') : state.enabled ? 'running' : 'paused';
    const references = compact && includeOrders ? referencePrices : null;
    const marketSource = state.entryRound?.market?.marketSource || prepared?.marketSource || source.describe?.().nextMarketSource || 'binance-prediction';
    const feesIncluded = state.agents.every(a => a.orders.every(o => o.quote?.feesIncluded === true));
    return { mode: 'paper', marketSource, sourceStatus: source.describe?.() || null,
      pricing: marketSource === 'public-spot' ? 'practice-fixed' : source.quote ? 'real-book-fee-estimate' : 'real-order-book', feesIncluded, gasIncluded: false, enabled: state.enabled, status,
      decisionEngine: decisionProvider?.describe?.() || { mode: 'legacy', configured: false, simulated: true },
      diversity:decisionDiversity(state.auditTrail),
      roundCount: state.rounds.length, activeMarket: active ? { id: active.topicId, start: active.start, end: active.end } : null,
      serverTime: now(), nextSlot, market: prepared ? { id: prepared.marketTopicId, title: prepared.title, start: prepared.startDate, end: prepared.endDate } : null,
      config: { ...state.config, rounds: state.config.maxRounds, agents: state.agents.map(a => policy(a.id)) },
      initialTotal: state.agents.length * Number(state.config.initialBalance || startingBalance),
      addedCapital: state.agents.reduce((sum,a)=>sum+(a.addedCapital||0),0),
      endedAt: state.endedAt, endReason: state.endReason,
      error: storageFailed ? 'STORAGE_ERROR' : state.recovery?.code || failure, recovery: state.recovery, storageIssue, ...viewMeta(),
      auditTrail: compact ? [] : state.auditTrail, agents: state.agents.map(a => {
        const open = a.orders.filter(o => o.status === 'OPEN');
        const wins = a.orders.filter(o => o.status === 'WON').length;
        const losses = a.orders.filter(o => o.status === 'LOST').length;
        const totalDebits = a.orders.reduce((sum, order) => sum + order.amount, 0);
        const totalCredits = a.orders.reduce((sum, order) => sum + (order.payout || 0), 0);
        const expectedCash = Math.round((state.config.initialBalance + (a.addedCapital||0) - totalDebits + totalCredits) * 1e8) / 1e8;
        const orders = !includeOrders ? [] : compact ? a.orders.map(order => compactOrder(order, references)) : a.orders;
        const watching = state.enabled && !state.recovery && state.config.realtimeEntry && state.entryRound && now() < state.entryRound.slot + roundMs - ENTRY_CLOSE_BUFFER_MS &&
          a.cash >= MIN_STAKE && a.lastStatus !== 'QUOTING' && !a.orders.some(order => order.start === state.entryRound.slot);
        return { ...a, lastStatus: watching ? 'WATCHING' : a.lastStatus, policy: policy(a.id), orders, reserved: open.reduce((sum, order) => sum + order.amount, 0),
          reconciliation: { mode: 'paper', initialBalance: state.config.initialBalance, addedCapital:a.addedCapital||0, totalDebits, totalCredits, expectedCash, actualCash: a.cash,
            difference: Math.round((a.cash - expectedCash) * 1e8) / 1e8, matched: Math.abs(a.cash - expectedCash) < 1e-7, feesIncluded: a.orders.every(o => o.quote?.feesIncluded === true) },
          equity: a.cash + open.reduce((sum, order) => sum + order.amount, 0),
          wins, losses, winRate: wins + losses ? wins / (wins + losses) : null, latest: orders.at(-1) || null };
      }) };
  }
  function snapshot() {
    if (state.lifecycle === 'ended' && state.report) return { ...structuredClone(state.report), ...viewMeta() };
    return structuredClone(buildSnapshot());
  }
  function liveSnapshot() { return structuredClone(buildSnapshot({ compact: true })); }
  function summary() {
    const full = buildSnapshot({ compact: true, includeOrders: false });
    return structuredClone({
      mode: full.mode, marketSource: full.marketSource, sourceStatus: full.sourceStatus, pricing: full.pricing, feesIncluded: full.feesIncluded,
      enabled: full.enabled, status: full.status, decisionEngine: full.decisionEngine,
      roundCount: full.roundCount, serverTime: full.serverTime, nextSlot: full.nextSlot, market: full.market,
      config: full.config, diversity:full.diversity, initialTotal: full.initialTotal, addedCapital:full.addedCapital, endedAt: full.endedAt, endReason: full.endReason,
      error: full.error, recovery: full.recovery, storageIssue: full.storageIssue, stateVersion: full.stateVersion, updatedAt: full.updatedAt,
      agents: full.agents.map(agent => ({ id: agent.id, cash: agent.cash, addedCapital:agent.addedCapital||0, reserved: agent.reserved, equity: agent.equity,
        wins: agent.wins, losses: agent.losses, winRate: agent.winRate, lastStatus: agent.lastStatus, policy: agent.policy })),
    });
  }
  async function settle() {
    const ids = [...new Set(state.agents.flatMap(a => a.orders.filter(o => o.status === 'OPEN' && o.end <= now()).map(o => o.topicId)))];
    for (const id of ids) {
      let topic;
      topic = await readSource('detail', id);
      if (String(topic?.marketTopicId) !== String(id)) throw error('MARKET_MISMATCH');
      const orders = state.agents.flatMap(a => a.orders.filter(o => o.topicId === id && o.status === 'OPEN'));
      const ref = orders[0];
      validateMarket(topic, ref.start, normalizedAsset, roundMs);
      const market = topic.markets[0];
      if (!['RESOLVED', 'SETTLED'].includes(market.status)) throw error('MARKET_RESULT_PENDING');
      const winners = market.outcomes.filter(o => o.winner === true);
      const split = market.outcomes.every(o => Number(o.price) === 0.5) &&
        Number.isFinite(topic.variantData?.endPrice) && topic.variantData.endPrice === topic.variantData.startPrice;
      if (!split && (winners.length !== 1 || market.outcomes.some(o => typeof o.winner !== 'boolean'))) {
        // Ambiguous/50-50 results need explicit payout evidence, never a spot-price guess.
        throw error('MARKET_RESULT_PENDING');
      }
      const evidenceEventId = record('SETTLEMENT_EVIDENCE', { roundId: String(ref.start), marketTopicId: id, evidence: structuredClone(topic) });
      for (const a of state.agents) for (const o of a.orders) {
        if (o.topicId !== id || o.status !== 'OPEN' || o.end > now()) continue;
        o.status = split ? 'SPLIT' : String(winners[0].tokenId) === o.tokenId ? 'WON' : 'LOST';
        o.payout = split ? o.quote.shares * 0.5 : o.status === 'WON' ? o.quote.shares : 0;
        o.settledAt = now();
        const cashBefore = a.cash;
        a.cash = Math.round((a.cash + o.payout) * 1e8) / 1e8;
        o.settlement = { source: o.marketSource === 'public-spot' ? 'public-spot-practice' : 'official-market', mode: 'paper', observedAt: now(), marketTopicId: id,
          officialStatus: market.status, officialOutcome: split ? 'SPLIT' : winners[0].name,
          shares: o.quote.shares, payoutPerShare: split ? 0.5 : o.status === 'WON' ? 1 : 0,
          payout: o.payout, netProfit: o.payout - o.amount, cashBefore, cashAfter: a.cash, feesIncluded: o.quote.feesIncluded === true,
          evidenceEventId };
        record('SETTLEMENT', { roundId: String(o.start), agentId: a.id, orderId: o.id, settlement: o.settlement });
      }
      save('settlement');
    }
  }
  async function decideRound(market, slot, attemptVersion, signalOnly = false) {
    const deadlineMs = signalOnly ? Math.min(now() + 10000, slot + roundMs - ENTRY_CLOSE_BUFFER_MS) : slot + 10000;
    const validAttempt = () => state.enabled && !state.recovery && attemptVersion === controlVersion && !storageFailed && now() < deadlineMs && (!signalOnly || state.config.realtimeEntry);
    try {
      if (signalOnly && (market.markets[0].tradingStatus !== 'OPEN' || ['RESOLVED','SETTLED'].includes(market.markets[0].status))) throw error('QUOTE_WINDOW_MISSED');
      const [indicators, upBook, downBook] = await Promise.all([
        indicatorSource.snapshot(normalizedAsset, state.config.period).catch(cause => { enterRecovery(cause, 'indicators'); throw cause; }), readSource('book', market, 'UP'), readSource('book', market, 'DOWN'),
      ]);
      if (!validAttempt()) return;
      if (signalOnly && (!Number.isFinite(indicators.dataTimestamp) || now() - indicators.dataTimestamp > 10000 || indicators.dataTimestamp > now() + 2000)) throw error('AI_DATA_STALE');
      let snapshotId;
      const captureSnapshot = () => snapshotId ??= record('MARKET_SNAPSHOT', { roundId: String(slot), market, indicators, books: { up: upBook, down: downBook } });
      if (!signalOnly) captureSnapshot();
      const upToken = String(market.markets[0].outcomes.find(o => o.name === 'Up').tokenId);
      const downToken = String(market.markets[0].outcomes.find(o => o.name === 'Down').tokenId);
      const upPreview = quoteFromBook(upBook, upToken, now(), 1);
      const downPreview = quoteFromBook(downBook, downToken, now(), 1);
      const marketInput = { roundId: slot, timeframe: state.config.period, roundDurationSeconds: roundMs / 1000, secondsToClose: Math.max(0, (slot + roundMs - now()) / 1000),
        upOdds: upPreview.odds, downOdds: downPreview.odds,
        dataTimestamp: Math.min(upPreview.bookTime, downPreview.bookTime, indicators.dataTimestamp),
        roundContext: roundContext(market, indicators, slot, roundMs / 1000, indicators.dataTimestamp) };
      failure = null;
      // Independent Agents finish first; CZ opponents follow; crowd-faders last.
      for (const stage of [0,1,2]) {
        if (signalOnly && !validAttempt()) break;
        const peers = peerSnapshot(state.agents.map(a=>({...a,policy:policy(a.id)})),slot,normalizedAsset,now());
        let oracleChanged = false;
        const decisionJobs = state.agents.filter(a => (signalOnly ? a.cash >= MIN_STAKE && !a.orders.some(o => o.start === slot) : a.lastStatus === 'QUOTING') && decisionStage(policy(a.id).strategy) === stage).flatMap(a => {
          let entryKey;
          const currentPolicy = policy(a.id);
          const input = buildDecisionContext({ market: marketInput, indicators, account: account(a), policy: currentPolicy, battleEmotion: state.config.emotionLevel, battleActionUrge: state.config.actionUrgeLevel, peers,
            frozenDivination: state.entryRound?.oracles[a.id] });
          if (input.divination && state.entryRound && !state.entryRound.oracles[a.id]) {
            state.entryRound.oracles[a.id] = input.divination; oracleChanged = true;
          }
          if (signalOnly) {
            input.market.entry_mode = 'signal';
            input.market.seconds_to_close = Math.max(0, (slot + roundMs - now()) / 1000);
            let signal;
            try { signal = entrySignal(input, indicators.indicatorCandleCloseTime ?? indicators.candles?.bars?.at(-1)?.closeTime); }
            catch { signal = null; }
            const previous = state.entryRound.attempts[a.id];
            if (!signal || (previous && (now() - previous.at < ENTRY_COOLDOWN_MS || previous.keys.includes(signal.key)))) {
              if (a.lastStatus === 'QUOTING') { a.lastStatus = 'SKIPPED'; a.reason = '等待进场信号'; }
              return [];
            }
            state.entryRound.attempts[a.id] = { at: now(), keys: [...(previous?.keys || []), signal.key] };
            entryKey = signal.key;
            a.lastStatus = 'QUOTING';
          }
          const inputEventId = record('DECISION_INPUT', { roundId: String(slot), agentId: a.id, snapshotId: captureSnapshot(), input, policy: currentPolicy });
          return { a, currentPolicy, input, inputEventId, entryKey };
        });
        if (signalOnly && !decisionJobs.length) { if (oracleChanged) save('round-reading'); continue; }
        save('decision-inputs'); // Every raw input survives before any model request starts.
        await Promise.all(decisionJobs.map(async ({ a, currentPolicy, input, inputEventId, entryKey }) => {
          if (a.lastStatus !== 'QUOTING') return;
          try {
            assertDecisionInputs(input);
            if (signalOnly && !validAttempt()) throw error('QUOTE_WINDOW_MISSED');
            const raw = await decisionProvider.decide(input, { deadlineMs, now, isCancelled: () => !validAttempt() });
            record('MODEL_RESPONSE', { roundId: String(slot), agentId: a.id, inputEventId, response: raw });
            if (!state.enabled || attemptVersion !== controlVersion) throw error('QUOTE_WINDOW_MISSED');
            const plan = validateDecision(raw, { input, indicators, policy: currentPolicy, now: now() });
            const audit = decisionAudit({ provider: decisionProvider, input, plan, indicators, raw });
            a.lastDecision = audit;
            if (plan.action === 'SKIP') {
              record('DECISION', { roundId: String(slot), agentId: a.id, inputEventId, risk: 'ACCEPTED_SKIP', decision: audit });
              a.lastStatus = 'SKIPPED'; a.reason = plan.reason || 'AI_SKIPPED'; return;
            }
            if (!validAttempt() || market.markets[0].tradingStatus !== 'OPEN') throw error('QUOTE_WINDOW_MISSED');
            const tokenId = plan.direction === 'UP' ? upToken : downToken;
            let executionBook = plan.direction === 'UP' ? upBook : downBook;
            if (signalOnly) {
              const [freshMarket, freshBook] = await Promise.all([readSource('detail', market.marketTopicId), readSource('book', market, plan.direction)]);
              validateMarket(freshMarket, slot, normalizedAsset, roundMs);
              if (String(freshMarket.marketTopicId) !== String(market.marketTopicId) || freshMarket.markets[0].tradingStatus !== 'OPEN' || ['RESOLVED','SETTLED'].includes(freshMarket.markets[0].status) || !validAttempt()) throw error('QUOTE_WINDOW_MISSED');
              executionBook = freshBook;
              record('ENTRY_EXECUTION_CHECK', { roundId: String(slot), agentId: a.id, inputEventId, market: freshMarket, book: freshBook });
            }
            if (a.orders.some(o => o.start === slot)) throw error('ROUND_ALREADY_ENTERED');
            const quote = source.quote ? await readSource('quote', market, plan.direction, plan.stake, executionBook) : quoteFromBook(executionBook, tokenId, now(), plan.stake);
            if (!validAttempt()) throw error('QUOTE_WINDOW_MISSED');
            const executionEdge = plan.confidence / 100 * quote.odds - 1;
            if (executionEdge <= 0) throw error('AI_EDGE_LOST_TO_SLIPPAGE');
            audit.expectedEdge = executionEdge;
            record('DECISION', { roundId: String(slot), agentId: a.id, inputEventId, risk: 'ACCEPTED_BET', decision: audit });
            const cashBefore = a.cash;
            const intent = { id: `${slot}-${a.id}`, agentId: a.id, roundId: String(slot), inputEventId, snapshotId,
              marketTopicId: market.marketTopicId, tokenId, direction: plan.direction, amount: plan.stake,
              side: 'BUY', orderType: 'MARKET',
              expiresAt: quote.expiresAt ? Math.min(quote.expiresAt, slot + roundMs - ENTRY_CLOSE_BUFFER_MS) : deadlineMs,
              createdAt: now(), mode: 'paper', marketSource: market.marketSource || 'binance-prediction',
              paperEstimate: { shares: quote.shares, averagePrice: quote.averagePrice, source: quote.source || 'real-order-book', feeShares: quote.feeShares ?? null } };
            record('ORDER_INTENT', { roundId: String(slot), agentId: a.id, intent });
            a.cash = Math.round((a.cash - plan.stake) * 1e8) / 1e8;
            const order = { id: `${slot}-${a.id}`, topicId: market.marketTopicId, start: slot, end: slot + roundMs,
              tokenId, direction: plan.direction, amount: plan.stake, quote, marketSource: intent.marketSource, decision: audit, intent, referencePrice: indicators.price,
              cashBefore, cashAfter: a.cash, status: 'OPEN', placedAt: now() };
            if (!Number.isFinite(Number(order.referencePrice)) || Number(order.referencePrice) <= 0) delete order.referencePrice;
            a.orders.push(order);
            record('PAPER_ORDER', { roundId: String(slot), agentId: a.id, orderId: intent.id, cashBefore, cashAfter: a.cash, quote });
            a.lastStatus = 'OPEN'; a.reason = plan.reason;
          } catch (e) {
            // Queued work that never reached the provider may retry after cooldown.
            // This lets later seats receive a turn instead of starving every candle.
            if (signalOnly && e.requestStarted === false && state.entryRound?.slot === slot) {
              const attempt = state.entryRound.attempts[a.id];
              attempt.keys = attempt.keys.filter(key => key !== entryKey);
            }
            a.lastStatus = 'SKIPPED'; a.reason = e.code || 'AI_DECISION_FAILED';
            a.lastDecision = a.lastDecision?.roundId === input.market.round_id
              ? { ...a.lastDecision, action: 'REJECTED', reason: a.reason }
              : rejectedDecisionAudit({ provider: decisionProvider, input, indicators, reason: a.reason });
            record('DECISION', { roundId: String(slot), agentId: a.id, inputEventId, risk: 'REJECTED', decision: a.lastDecision });
          }
        }));
        save('decisions');
      }
    } catch (e) {
      const previousFailure = failure;
      failure = e.code || 'INDICATORS_UNAVAILABLE';
      if (signalOnly && previousFailure === failure) return;
      record('INPUT_FAILED', { roundId: String(slot), reason: failure });
      for (const a of state.agents) if (a.lastStatus === 'QUOTING') { a.lastStatus = 'SKIPPED'; a.reason = failure; }
      save('input-failed');
    }
  }
  async function tick() {
    if (busy || storageFailed) return;
    busy = true;
    try {
      if (leaseEnabled && state.enabled && state.lastSeenAt != null && now() - state.lastSeenAt > leaseMs) {
        state.enabled = false;
        state.lifecycle = 'paused';
        state.endReason = 'CLIENT_DISCONNECTED';
        save();
      }
      if (state.lifecycle === 'ended') return;
      if (state.recovery) { await recover(); return; }
      // Expired stakes must be reconciled before this tick can place another bet.
      if (state.agents.some(a => a.orders.some(o => o.status === 'OPEN' && o.end <= now()))) {
        if (now() - lastSettle < 15000) return;
        lastSettle = now();
        try { await settle(); }
        catch (cause) { enterRecovery(cause, 'settlement'); return; }
      }
      if (state.config.realtimeEntry && state.config.maxRounds && state.rounds.length >= state.config.maxRounds && now() >= state.rounds.at(-1) + roundMs) finish('ROUND_LIMIT');
      const slot = nextSlot;
      const attemptVersion = controlVersion;
      if (now() >= slot) {
        nextSlot = nextRoundSlot(now(), roundMs);
        let market = prepared;
        prepared = null;
        if (state.enabled && !state.rounds.includes(slot)) {
          const onBoundary = now() - slot <= 1500;
          if (onBoundary && source.refreshMarket) {
            try { market = await readSource('refreshMarket', market, slot, normalizedAsset, roundMs); }
            catch (e) { market = null; failure = e.code || 'MARKET_UNAVAILABLE'; }
          }
          if (state.recovery) return;
          state.rounds.push(slot);
          record('ROUND_STARTED', { roundId: String(slot), marketTopicId: market?.marketTopicId || null });
          const eligible = state.enabled && attemptVersion === controlVersion && onBoundary && now() - slot < 10000 && market && Number(market.startDate) === slot;
          state.entryRound = eligible ? { slot, market, oracles: {}, attempts: {} } : null;
          lastEntryPoll = now();
          for (const a of state.agents) a.lastStatus = !state.enabled ? 'PAUSED' : a.cash < (integratedDecisions ? MIN_STAKE : STAKE) ? 'INSUFFICIENT_FUNDS' : eligible ? 'QUOTING' : 'SKIPPED';
          for (const a of state.agents) if (a.lastStatus !== 'QUOTING') record('ROUND_SKIPPED', { roundId: String(slot), agentId: a.id, reason: a.lastStatus === 'INSUFFICIENT_FUNDS' ? a.lastStatus : 'MARKET_OR_BOUNDARY_UNAVAILABLE' });
          save('round-started'); // Persist the attempt before I/O, so restart never duplicates a round.
          if (eligible) {
            if (integratedDecisions) {
              await decideRound(market, slot, attemptVersion, state.config.realtimeEntry);
            } else {
              await Promise.all(state.agents.map(async a => {
                if (a.lastStatus !== 'QUOTING') return;
                const direction = a.id === 'A' ? 'UP' : a.id === 'B' ? 'DOWN' : random() === 0 ? 'UP' : 'DOWN';
                try {
                  const book = await readSource('book', market, direction);
                  if (now() - slot > 10000 || !state.enabled || attemptVersion !== controlVersion || storageFailed || market.markets[0].tradingStatus !== 'OPEN') throw error('QUOTE_WINDOW_MISSED');
                  const tokenId = String(market.markets[0].outcomes.find(o => o.name === (direction === 'UP' ? 'Up' : 'Down')).tokenId);
                  const quote = source.quote ? await readSource('quote', market, direction, STAKE, book) : quoteFromBook(book, tokenId, now());
                  if (now() - slot > 10000 || !state.enabled || attemptVersion !== controlVersion || storageFailed) throw error('QUOTE_WINDOW_MISSED');
                  a.cash = Math.round((a.cash - STAKE) * 1e8) / 1e8;
                  a.orders.push({ id: `${slot}-${a.id}`, topicId: market.marketTopicId, start: slot, end: slot + roundMs,
                    tokenId, direction, amount: STAKE, quote, marketSource: market.marketSource || 'binance-prediction', status: 'OPEN', placedAt: now() });
                  a.lastStatus = 'OPEN';
                } catch (e) { a.lastStatus = 'SKIPPED'; a.reason = e.code || 'BOOK_UNAVAILABLE'; }
              }));
              save('legacy-decisions');
            }
          }
        }
      }
      if (state.recovery) return;
      const entryRound = state.entryRound;
      if (integratedDecisions && state.enabled && state.config.realtimeEntry && entryRound &&
          now() >= entryRound.slot && now() < entryRound.slot + roundMs - ENTRY_CLOSE_BUFFER_MS &&
          now() - lastEntryPoll >= ENTRY_POLL_MS && state.agents.some(a => a.cash >= MIN_STAKE && !a.orders.some(o => o.start === entryRound.slot))) {
        lastEntryPoll = now();
        await decideRound(entryRound.market, entryRound.slot, controlVersion, true);
      }
      if (state.recovery) return;
      if (!state.config.realtimeEntry && state.config.maxRounds && state.rounds.length >= state.config.maxRounds) finish('ROUND_LIMIT');
      if (state.enabled && !prepared && now() - lastPrepare >= 15000 && nextSlot - now() > 15000) {
        lastPrepare = now();
        const targetSlot = nextSlot, startedAt = now();
        try {
          prepared = await readSource('marketFor', targetSlot, normalizedAsset, roundMs); failure = null; markChanged('market-prepared');
        } catch (e) {
          failure = e.code || 'MARKET_UNAVAILABLE';
          const alreadyRecorded = state.auditTrail.some(event => event.type === 'MARKET_PREP_FAILED' && event.roundId === String(targetSlot) && event.reason === failure);
          if (!alreadyRecorded) {
            record('MARKET_PREP_FAILED', { roundId: String(targetSlot), reason: failure, latencyMs: Math.max(0, now() - startedAt), asset: normalizedAsset });
            save('market-prepare-failed');
          } else markChanged('market-prepare-failed');
        }
      }
      if (state.enabled && !hasOpenOrders() && state.agents.every(agent => agent.cash < (integratedDecisions ? MIN_STAKE : STAKE))) finish('BALANCE_DEPLETED');
    } catch (e) {
      failure = e.code || 'SIMULATION_ERROR';
      if (pauseOnError && !['ended', 'settling'].includes(state.lifecycle)) {
        controlVersion++;
        state.enabled = false; state.lifecycle = 'paused'; state.endReason = 'SIMULATION_ERROR';
        record('PAUSED', { reason: state.endReason, error: failure });
        if (!storageFailed) { try { save(); } catch { failure = 'STORAGE_ERROR'; } }
      }
    }
    finally { busy = false; finalize(); }
  }
  return {
    tick,
    marketFailure(code) { enterRecovery({ code }, 'valuation'); },
    retryConnection() {
      if (storageFailed) throw error('STORAGE_ERROR');
      if (busy) throw error('BATTLE_BUSY');
      if (!state.recovery) return snapshot();
      // Only an explicit user action starts a new bounded retry batch.
      state.recovery.attempts = 0; state.recovery.status = 'retrying'; state.recovery.nextRetryAt = now();
      record('RECOVERY_REQUESTED'); save('recovery-requested');
      return snapshot();
    },
    // Paper capital only. TODO(live): wallet funding, receipt reconciliation and explicit authorization;
    // never reuse this virtual credit operation for real balances or real orders.
    topUp(agentId, amount, requestId) {
      if(storageFailed)throw error('STORAGE_ERROR');
      if(typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>1e-7)throw error('INVALID_TOP_UP_AMOUNT');
      if(typeof requestId!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(requestId))throw error('INVALID_TOP_UP_REQUEST');
      const prior=state.agents.flatMap(a=>(a.topUps||[]).map(entry=>({...entry,agentId:a.id}))).find(entry=>entry.requestId===requestId);
      if(prior){if(prior.agentId!==agentId||prior.amount!==amount)throw error('TOP_UP_CONFLICT');return snapshot();}
      if(['ended','settling'].includes(state.lifecycle))throw error('BATTLE_ENDED');
      if(busy)throw error('BATTLE_BUSY');
      const agent=state.agents.find(a=>a.id===agentId);if(!agent)throw error('AGENT_NOT_FOUND');
      if((agent.addedCapital||0)+amount>1e9)throw error('INVALID_TOP_UP_AMOUNT');
      const before={cash:agent.cash,addedCapital:agent.addedCapital,topUps:agent.topUps},auditLength=state.auditTrail.length;
      agent.cash=Math.round((agent.cash+amount)*1e8)/1e8;
      agent.addedCapital=Math.round(((agent.addedCapital||0)+amount)*100)/100;
      agent.topUps=[...(agent.topUps||[]),{requestId,amount,at:now()}];
      record('CAPITAL_ADDED',{agentId,amount,requestId,addedCapital:agent.addedCapital});
      try{save('capital-added');}catch(cause){Object.assign(agent,before);state.auditTrail.length=auditLength;throw cause;}
      return snapshot();
    },
    snapshot,
    liveSnapshot,
    summary,
    touch() { if (!['ended', 'settling'].includes(state.lifecycle)) touchState(); return snapshot(); },
    end(reason = 'MANUAL') { if (storageFailed) throw error('STORAGE_ERROR'); finish(reason); return snapshot(); },
    setEmotionLevel(value) {
      if (storageFailed) throw error('STORAGE_ERROR');
      if (['ended', 'settling'].includes(state.lifecycle)) throw error('BATTLE_ENDED');
      const emotionLevel = normalizeBattleEmotion(value);
      if (state.config.emotionLevel === emotionLevel) return snapshot();
      controlVersion++;
      state.config.emotionLevel = emotionLevel;
      record('EMOTION_CHANGED', { emotionLevel });
      touchState();
      save();
      return snapshot();
    },
    setActionUrgeLevel(value) {
      if (storageFailed) throw error('STORAGE_ERROR');
      if (['ended', 'settling'].includes(state.lifecycle)) throw error('BATTLE_ENDED');
      const actionUrgeLevel = normalizeBattleActionUrge(value);
      if (state.config.actionUrgeLevel === actionUrgeLevel) return snapshot();
      controlVersion++;
      state.config.actionUrgeLevel = actionUrgeLevel;
      record('ACTION_URGE_CHANGED', { actionUrgeLevel });
      touchState();
      save();
      return snapshot();
    },
    setRealtimeEntry(value) {
      if (storageFailed) throw error('STORAGE_ERROR');
      if (['ended', 'settling'].includes(state.lifecycle)) throw error('BATTLE_ENDED');
      const enabled = normalizeRealtimeEntry(value);
      if (enabled && !integratedDecisions) throw error('REALTIME_ENTRY_UNAVAILABLE');
      if (state.config.realtimeEntry === enabled) return snapshot();
      controlVersion++;
      state.config.realtimeEntry = enabled;
      record('REALTIME_ENTRY_CHANGED', { enabled });
      touchState(); save();
      return snapshot();
    },
    setEnabled(value) {
      if (storageFailed) throw error('STORAGE_ERROR');
      if (['ended', 'settling'].includes(state.lifecycle)) {
        if (value) throw error('BATTLE_ENDED');
        return snapshot();
      }
      controlVersion++;
      state.enabled = Boolean(value);
      state.lifecycle = state.enabled ? 'running' : 'paused';
      state.endReason = state.enabled ? null : state.endReason === 'CLIENT_DISCONNECTED' ? state.endReason : 'USER_PAUSED';
      touchState();
      save();
      return snapshot();
    },
  };
}
module.exports = { PERIODS, ROUND, normalizePeriod, nextRoundSlot, isRoundBoundary, validateMarket, quoteFromBook, decisionDiversity, createPredictionSource, createPredictionSimulation };
