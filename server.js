const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const QRCode = require('qrcode');
const { createPaperTrading } = require('./paper-trading');
const { createPredictionSource } = require('./prediction-sim');
const { createSimulationMarketSource } = require('./simulation-market-source');
const { createPositionValuation } = require('./position-valuation');
const { createSimulationBattles } = require('./simulation-battles');
const { createExecutionBridge } = require('./execution-bridge');
const { createDeepSeekDecisionProvider, createMockDecisionProvider, createOffDecisionProvider, normalizePolicy, buildDecisionContext, validateDecision, decisionAudit } = require('./ai-decision');
const { createBinanceIndicatorSource } = require('./market-indicators');
const { createAiConnections } = require('./ai-connections');
const { createCardCollection } = require('./card-collection.cjs');

const {allowed: clientAssetAllowed} = require('./client-assets.cjs');
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const BAW_ENTRY = require.resolve('@binance/agentic-wallet');
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
};
const MAX_CLI_OUTPUT = 1024 * 1024;

function resolveConfig(overrides = {}) {
  const chainId = String(overrides.chainId || process.env.BINANCE_AGENT_CHAIN_ID || '56').trim();
  if (!/^(?:\d+|CT_501)$/.test(chainId)) {
    throw new Error(`Unsupported BINANCE_AGENT_CHAIN_ID: ${chainId}`);
  }
  const maxPredictionOrderUsdt = Number(
    overrides.maxPredictionOrderUsdt ?? process.env.MAX_PREDICTION_ORDER_USDT ?? 10,
  );
  if (!Number.isFinite(maxPredictionOrderUsdt) || maxPredictionOrderUsdt <= 0 || maxPredictionOrderUsdt > 1000) {
    throw new Error('MAX_PREDICTION_ORDER_USDT must be greater than 0 and no more than 1000.');
  }
  const aiDecisionMode = String(overrides.aiDecisionMode ?? process.env.AI_DECISION_MODE ?? 'mock').trim().toLowerCase();
  if (!['mock', 'deepseek', 'off'].includes(aiDecisionMode)) throw new Error('AI_DECISION_MODE must be mock, deepseek, or off.');
  return {
    chainId,
    liveTradingEnabled: overrides.liveTradingEnabled ?? process.env.ENABLE_LIVE_TRADING === 'true',
    liveQuotesEnabled: overrides.liveQuotesEnabled ?? process.env.ENABLE_LIVE_QUOTES === 'true',
    maxPredictionOrderUsdt,
    aiDecisionMode,
    port: Number(overrides.port ?? process.env.PORT ?? 5174),
  };
}

function cliError(payload, fallback) {
  const detail = payload?.error || {};
  const error = new Error(detail.message || fallback || 'Binance Agentic Wallet command failed.');
  error.statusCode = 502;
  error.code = detail.name || 'BINANCE_CLI_ERROR';
  error.cliCode = detail.code;
  return error;
}

function parseCliOutput(stdout, stderr, exitCode) {
  const text = String(stdout || '').trim();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    const error = new Error(String(stderr || '').trim() || `Binance Agentic Wallet CLI exited with code ${exitCode}.`);
    error.statusCode = 502;
    error.code = 'BINANCE_CLI_INVALID_RESPONSE';
    throw error;
  }
  if (exitCode !== 0 || payload?.success === false) throw cliError(payload);
  return payload;
}

function createBawRunner(options = {}) {
  const cliEntry = options.cliEntry || BAW_ENTRY;
  return function runBaw(args, runOptions = {}) {
    return new Promise((resolve, reject) => {
      const fullArgs = [cliEntry, ...args, '--json'];
      const child = spawn(process.execPath, fullArgs, {
        cwd: ROOT,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const timeoutMs = runOptions.timeoutMs || 20_000;
      let timer;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        runOptions.signal?.removeEventListener('abort', onAbort);
        callback(value);
      };
      const stopForOutput = () => {
        child.kill();
        const error = new Error('Binance Agentic Wallet CLI returned too much output.');
        error.statusCode = 502;
        error.code = 'BINANCE_CLI_OUTPUT_LIMIT';
        finish(reject, error);
      };
      child.stdout.on('data', chunk => {
        stdout += chunk;
        if (stdout.length + stderr.length > MAX_CLI_OUTPUT) stopForOutput();
      });
      child.stderr.on('data', chunk => {
        stderr += chunk;
        if (stdout.length + stderr.length > MAX_CLI_OUTPUT) stopForOutput();
      });
      child.on('error', error => {
        error.statusCode = 502;
        error.code = error.code === 'ENOENT' ? 'BINANCE_CLI_MISSING' : 'BINANCE_CLI_START_FAILED';
        finish(reject, error);
      });
      child.on('close', exitCode => {
        if (settled) return;
        try {
          finish(resolve, parseCliOutput(stdout, stderr, exitCode));
        } catch (error) {
          finish(reject, error);
        }
      });
      const onAbort = () => {
        child.kill();
        const error = new Error('Binance Agentic Wallet verification was canceled.');
        error.statusCode = 409;
        error.code = 'BINANCE_AUTH_CANCELED';
        finish(reject, error);
      };
      if (runOptions.signal?.aborted) {
        onAbort();
        return;
      }
      runOptions.signal?.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => {
        child.kill();
        const error = new Error('Binance Agentic Wallet command timed out.');
        error.statusCode = 504;
        error.code = 'BINANCE_CLI_TIMEOUT';
        finish(reject, error);
      }, timeoutMs);
      timer.unref?.();
    });
  };
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(data));
}

function appError(message, statusCode = 400, code = 'INVALID_REQUEST') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function readJson(request, maxBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(appError('Request body is too large.', 413, 'REQUEST_TOO_LARGE'));
        request.destroy();
      }
    });
    request.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        const value = JSON.parse(body);
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('JSON body must be an object.');
        }
        resolve(value);
      } catch {
        reject(appError('Request body must be valid JSON.', 400, 'INVALID_JSON'));
      }
    });
    request.on('error', reject);
  });
}

function requiredId(value, name) {
  const result = String(value ?? '').trim();
  if (!result || result.length > 256 || !/^[A-Za-z0-9_.:-]+$/.test(result)) {
    throw appError(`${name} is invalid.`, 400, 'INVALID_PARAMETER');
  }
  return result;
}

function optionalEnum(value, name, allowed) {
  if (value == null || value === '') return null;
  const result = String(value).trim().toUpperCase();
  if (!allowed.includes(result)) {
    throw appError(`${name} must be one of: ${allowed.join(', ')}.`, 400, 'INVALID_PARAMETER');
  }
  return result;
}

function optionalInteger(value, name, minimum, maximum) {
  if (value == null || value === '') return null;
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw appError(`${name} must be an integer from ${minimum} to ${maximum}.`, 400, 'INVALID_PARAMETER');
  }
  return result;
}

function positiveAmount(value, maximum) {
  const text = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(text)) {
    throw appError('amount must be a positive decimal with at most 8 decimal places.', 400, 'INVALID_AMOUNT');
  }
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw appError('amount must be greater than 0.', 400, 'INVALID_AMOUNT');
  }
  if (amount > maximum) {
    throw appError(`amount exceeds the ${maximum} USDT per-order limit.`, 400, 'ORDER_LIMIT_EXCEEDED');
  }
  return { amount, text };
}

const SENSITIVE_KEYS = new Set([
  'sessiontoken', 'accesstoken', 'refreshtoken', 'clientid', 'apikey', 'secret',
  'privatekey', 'seed', 'seedphrase', 'password', 'qrcodeid',
]);

function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase()))
    .map(([key, item]) => [key, redactSensitive(item)]));
}

function cliData(payload) {
  return redactSensitive(payload?.data ?? null);
}

function addOption(args, flag, value) {
  if (value != null && value !== '') args.push(flag, String(value));
}

function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return;
  let originHost = '';
  try { originHost = new URL(origin).host; } catch {}
  if (!originHost || originHost !== request.headers.host) {
    const error = new Error('Cross-origin mutation requests are not allowed.');
    error.statusCode = 403;
    throw error;
  }
}

function authPublic(authState) {
  if (!authState) return { status: 'idle' };
  return {
    status: authState.status,
    urlForWeb: authState.urlForWeb,
    pairingCode: authState.pairingCode,
    qrImage: authState.qrImage,
    expireAt: authState.expireAt,
    error: authState.error,
  };
}

function sanitizeAddresses(payload) {
  const addresses = Array.isArray(payload?.data?.addresses) ? payload.data.addresses : [];
  return addresses.map(item => ({
    binanceChainId: String(item.binanceChainId || ''),
    chainName: String(item.chainName || ''),
    address: String(item.address || ''),
  })).filter(item => item.address);
}

function sanitizeBalances(payload) {
  const balances = Array.isArray(payload?.data) ? payload.data : [];
  return balances.map(item => ({
    symbol: String(item.symbol || ''),
    address: String(item.address || ''),
    binanceChainId: String(item.binanceChainId || ''),
    balance: String(item.balance || '0'),
    price: String(item.price || '0'),
    value: item.value == null || item.value === '' ? null : String(item.value),
  })).filter(item => item.symbol);
}

function sanitizeSettings(payload) {
  const data = payload?.data || {};
  return {
    maxSigninDuration: data.maxSigninDuration || null,
    inactiveSignoutDuration: data.inactiveSignoutDuration || null,
    sessionExpireTime: data.sessionExpireTime || null,
    inactiveSignOutTime: data.inactiveSignOutTime || null,
    abnormalTxnHandling: data.abnormalTxnHandling || null,
    tradeAllTokens: Boolean(data.tradeAllTokens),
    predictionEnabled: Boolean(data.predictionEnabled),
    predictionDailyLimit: data.predictionDailyLimit ?? null,
    predictionQuotaUsed: data.predictionQuotaUsed ?? null,
    predictionQuotaLeft: data.predictionQuotaLeft ?? null,
  };
}

function createWarriorServer(options = {}) {
  const config = resolveConfig(options);
  const paper = createPaperTrading({ file: options.paperFile === null ? undefined : options.paperFile || path.join(ROOT, '.data', 'paper-ledger.json'), fetchImpl: options.marketFetch, now: options.now });
  const walletCli = options.walletCli || createBawRunner(options);
  const indicatorSource = options.indicatorSource || createBinanceIndicatorSource({ fetchImpl: options.marketFetch, now: options.now });
  const fallbackDecisionProvider = options.decisionProvider || (config.aiDecisionMode === 'deepseek'
    ? createDeepSeekDecisionProvider({
      apiKey: options.deepseekApiKey ?? process.env.DEEPSEEK_API_KEY,
      baseUrl: options.deepseekBaseUrl ?? process.env.DEEPSEEK_BASE_URL,
      model: options.deepseekModel ?? process.env.DEEPSEEK_MODEL,
      fetchImpl: options.aiFetch,
    })
    : config.aiDecisionMode === 'off' ? createOffDecisionProvider() : createMockDecisionProvider());
  const aiConnections = createAiConnections({ file: options.aiConnectionsFile ?? (options.walletCli ? undefined : path.join(ROOT, '.data', 'ai-connections.json')),
    fetchImpl: options.aiFetch, now: options.now, fallback: fallbackDecisionProvider });
  const collection = createCardCollection({file:options.collectionFile ?? (options.walletCli ? undefined : path.join(ROOT,'.data','card-collection.json')),now:options.now});
  const decisionProvider = aiConnections.router;
  const predictionSource = options.predictionSource || (options.simulation ? createPredictionSource(walletCli) : createSimulationMarketSource({
    official: createPredictionSource(walletCli), walletStatus, run: walletCli,
    chainId: config.chainId, fetchImpl: options.marketFetch, now: options.now,
  }));
  const estimatePositions = createPositionValuation({ source: predictionSource, now: options.now });
  const simulation = options.simulation || createSimulationBattles({ source: predictionSource, indicatorSource, decisionProvider,
    file: options.walletCli ? undefined : path.join(ROOT, '.data', 'rule-ai-ledger.json'), now: options.now,
    leaseEnabled: false, pauseOnRestore: true, pauseOnError: true });
  let authState = null;
  const pendingQuotes = new Map();
  const simulationStreams = new Set();
  const executionBridge = createExecutionBridge({
    file: options.walletCli ? options.executionFile : path.join(ROOT, '.data', 'execution-journal.json'),
    now: options.now || Date.now, quotesEnabled: config.liveQuotesEnabled || config.liveTradingEnabled,
    tradingEnabled: config.liveTradingEnabled, maxOrder: config.maxPredictionOrderUsdt,
    getIntent(battleId, intentId) {
      const battle = simulation.snapshot(battleId);
      const agent = battle.agents.find(a => a.orders.some(order => order.intent?.id === intentId));
      const order = agent?.orders.find(order => order.intent?.id === intentId);
      if (!order || order.status !== 'OPEN') throw appError('Intent is missing or no longer open.', 409, 'INTENT_NOT_FOUND');
      return { battle, agent, intent: order.intent };
    },
    async requestQuote(intent, slippageBps, guard) {
      await predictionPreflight(intent.amount);
      guard();
      if (predictionSource.executionQuote) return predictionSource.executionQuote(intent, slippageBps);
      return cliData(await walletCli(['prediction', 'trade', 'quote', '--binanceChainId', config.chainId,
        '--tokenId', String(intent.tokenId), '--marketTopicId', String(intent.marketTopicId), '--side', 'BUY',
        '--amount', String(intent.amount), '--orderType', 'MARKET', '--slippageBps', String(slippageBps)]));
    },
    async submitOrder(quoteId, intent, slippageBps, guard) {
      await predictionPreflight(intent.amount);
      guard();
      return cliData(await walletCli(['prediction', 'trade', 'place-order', '--quoteId', quoteId,
        '--slippageBps', String(slippageBps), '--orderType', 'MARKET'], { timeoutMs: 60000 }));
    },
    async readOrders() { await requireConnected(); return cliData(await walletCli(['prediction', 'order', 'history', '--limit', '100'])); },
    async readTransaction(hash) { await requireConnected(); return cliData(await walletCli(['wallet', 'tx-history', '--tx', hash, '--binanceChainId', config.chainId])); },
  });

  function expirePendingAuth() {
    if (authState?.status !== 'awaiting_scan') return;
    const expires = Date.parse(authState.expireAt || '');
    if (Number.isFinite(expires) && Date.now() >= expires) {
      authState.controller?.abort();
      authState = { status: 'expired', error: 'QR code expired. Start a new sign-in.' };
    }
  }

  async function walletStatus() {
    const result = await walletCli(['wallet', 'status']);
    return String(result?.data?.status || 'UNCONNECTED').toUpperCase();
  }

  async function requireConnected() {
    const status = await walletStatus();
    if (status !== 'CONNECTED') {
      throw appError('Binance Agentic Wallet is not connected.', 401, 'WALLET_NOT_CONNECTED');
    }
  }

  async function predictionPreflight(amount) {
    await requireConnected();
    const [settingsResult, lockResult] = await Promise.all([
      walletCli(['wallet', 'settings']),
      walletCli(['wallet', 'tx-lock', '--binanceChainId', config.chainId]),
    ]);
    const settings = sanitizeSettings(settingsResult);
    if (!settings.predictionEnabled) {
      throw appError('Prediction trading is disabled in Binance Agentic Wallet settings.', 409, 'PREDICTION_DISABLED');
    }
    const quotaLeft = Number(settings.predictionQuotaLeft);
    if (!Number.isFinite(quotaLeft)) {
      throw appError('Prediction quota is unavailable. No order was created.', 409, 'PREDICTION_QUOTA_UNAVAILABLE');
    }
    if (amount > quotaLeft) {
      throw appError('Prediction quota is insufficient for this order.', 409, 'PREDICTION_QUOTA_INSUFFICIENT');
    }
    const lockStatus = String(lockResult?.data?.status || 'UNKNOWN').toUpperCase();
    if (lockStatus !== 'UNLOCKED') {
      throw appError(
        'Wallet transaction lock is not clear. Check Binance App or wait for the pending transaction; no order was submitted.',
        409,
        'WALLET_TRANSACTION_LOCKED',
      );
    }
    return { settings, lockStatus };
  }

  function pruneQuotes() {
    const now = Date.now();
    for (const [id, quote] of pendingQuotes) {
      if (quote.expiresAtMs + 10 * 60_000 < now) pendingQuotes.delete(id);
    }
  }

  function quoteExpiry(value) {
    const numeric = Number(value);
    let parsed = Number.isFinite(numeric)
      ? (numeric < 10_000_000_000 ? numeric * 1000 : numeric)
      : Date.parse(String(value || ''));
    if (!Number.isFinite(parsed) || parsed <= Date.now()) parsed = Date.now() + 60_000;
    return Math.min(parsed, Date.now() + 60_000);
  }

  async function beginVerification(pending) {
    try {
      const verified = await walletCli(
        ['auth', 'verify', '--qrCodeId', pending.qrCodeId],
        { timeoutMs: 310_000, signal: pending.controller.signal },
      );
      if (authState !== pending) return;
      const status = await walletStatus();
      if (verified?.data?.status === 'SUCCESS' && status === 'CONNECTED') {
        authState = { status: 'connected' };
      } else {
        authState = {
          status: 'error',
          error: 'The Binance App confirmed sign-in, but the local wallet session is not connected. Start again.',
        };
      }
    } catch (error) {
      if (authState !== pending || error.code === 'BINANCE_AUTH_CANCELED') return;
      const expired = error.code === 'AUTH_REJECTED' || /expired|does not exist/i.test(error.message || '');
      authState = {
        status: expired ? 'expired' : 'error',
        error: error.message,
      };
    }
  }

  async function startSignin() {
    expirePendingAuth();
    if (authState?.status === 'awaiting_scan') return authPublic(authState);
    if (await walletStatus() === 'CONNECTED') {
      authState = { status: 'connected' };
      return authPublic(authState);
    }
    const result = await walletCli(['auth', 'signin']);
    if (result?.data?.status === 'ALREADY_CONNECTED') {
      authState = { status: 'connected' };
      return authPublic(authState);
    }
    const data = result?.data || {};
    if (!data.urlForWeb || !data.qrCodeId || !data.pairingCode || !data.expireAt) {
      const error = new Error('Binance Agentic Wallet did not return a complete sign-in request.');
      error.statusCode = 502;
      error.code = 'BINANCE_AUTH_INVALID_RESPONSE';
      throw error;
    }
    const loginUrl = new URL(data.urlForWeb);
    if (loginUrl.protocol !== 'https:' || !/(^|\.)binance\.com$/i.test(loginUrl.hostname)) {
      const error = new Error('Binance Agentic Wallet returned an untrusted sign-in URL.');
      error.statusCode = 502;
      error.code = 'BINANCE_AUTH_UNTRUSTED_URL';
      throw error;
    }
    const pending = {
      status: 'awaiting_scan',
      urlForWeb: data.urlForWeb,
      qrCodeId: data.qrCodeId,
      pairingCode: String(data.pairingCode),
      expireAt: new Date(Number(data.expireAt)).toISOString(),
      qrImage: await QRCode.toDataURL(data.urlForWeb, { errorCorrectionLevel: 'M', margin: 1, width: 280 }),
      controller: new AbortController(),
    };
    authState = pending;
    void beginVerification(pending);
    return authPublic(pending);
  }

  async function walletSnapshot() {
    expirePendingAuth();
    const status = await walletStatus();
    if (status !== 'CONNECTED') {
      return {
        wallet: { provider: 'binance', status: status.toLowerCase() },
        accountValue: null,
        balances: [],
        settings: null,
        txLock: null,
        auth: authPublic(authState),
      };
    }
    if (authState?.status === 'awaiting_scan') authState.controller?.abort();
    authState = { status: 'connected' };
    const [addressesResult, balancesResult, settingsResult, lockResult] = await Promise.allSettled([
      walletCli(['wallet', 'address']),
      walletCli(['wallet', 'balance']),
      walletCli(['wallet', 'settings']),
      walletCli(['wallet', 'tx-lock', '--binanceChainId', config.chainId]),
    ]);
    const addresses = addressesResult.status === 'fulfilled' ? sanitizeAddresses(addressesResult.value) : [];
    const balances = balancesResult.status === 'fulfilled' ? sanitizeBalances(balancesResult.value) : [];
    const settings = settingsResult.status === 'fulfilled' ? sanitizeSettings(settingsResult.value) : null;
    const txLock = lockResult.status === 'fulfilled'
      ? { status: String(lockResult.value?.data?.status || 'UNKNOWN').toUpperCase(), chainId: config.chainId }
      : null;
    const balancesAvailable = balancesResult.status === 'fulfilled' && Array.isArray(balancesResult.value?.data);
    const accountValue = balancesAvailable && balances.every(item => item.value != null && Number.isFinite(Number(item.value)))
      ? balances.reduce((total, item) => total + Number(item.value), 0) : null;
    const primaryAddress = addresses.find(item => item.binanceChainId === config.chainId) || addresses[0] || null;
    return {
      wallet: {
        provider: 'binance',
        status: 'connected',
        primaryAddress,
        addresses,
      },
      accountValue,
      balancesAvailable,
      balances,
      settings,
      txLock,
      auth: authPublic(authState),
    };
  }

  async function apiHandler(request, response, url) {
    if (url.pathname.startsWith('/api/ai/')) {
      assertSameOrigin(request);
      // Reject DNS-rebound Host headers and browser cross-site credential operations.
      const host = new URL(`http://${request.headers.host}`).hostname;
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host) || request.headers['sec-fetch-site'] === 'cross-site') throw appError('Forbidden', 403, 'AI_ORIGIN_REJECTED');
      if (request.method === 'GET' && url.pathname === '/api/ai/settings') return sendJson(response, 200, aiConnections.snapshot());
      if (request.method === 'POST') {
        if (!String(request.headers['content-type']).startsWith('application/json')) throw appError('JSON required', 415, 'AI_JSON_REQUIRED');
        const body = await readJson(request);
        if (url.pathname === '/api/ai/connections' || url.pathname === '/api/ai/connections/test') return sendJson(response, 200, await aiConnections.save(body, url.pathname.endsWith('/test')));
        if (url.pathname === '/api/ai/connections/remove') return sendJson(response, 200, aiConnections.remove(body.provider));
        if (url.pathname === '/api/ai/connections/check') return sendJson(response, 200, await aiConnections.testConnection(body.provider, body.revision));
        if (url.pathname === '/api/ai/assignments') return sendJson(response, 200, aiConnections.assign(body.strategy, body.connectionId));
        if (url.pathname === '/api/ai/preview') {
          if (!Object.hasOwn(require('./public/strategy-catalog').profiles, body.strategy)) throw appError('Invalid strategy', 422, 'AI_STRATEGY_INVALID');
          const previewPolicy = normalizePolicy({strategy:body.strategy,coin:'BTC',maxStakePct:10,allowAllIn:false}, 'preview');
          const indicators = await indicatorSource.snapshot('BTCUSDT');
          const time = (options.now || Date.now)();
          const input = buildDecisionContext({ market:{roundId:`preview-${time}`,timeframe:'5m',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:indicators.dataTimestamp}, indicators, policy:previewPolicy,
            account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0} });
          const engine=decisionProvider.describeFor(input);
          if(!['mock','off','offline','legacy'].includes(engine.mode))input.policy.review_mode='model';
          let modelRequest=null;
          const raw = await decisionProvider.decide(input, {deadlineMs:time+10000,now:options.now||Date.now,onRequest:request=>{modelRequest=request;}});
          let plan, rejection = null;
          try { plan = validateDecision(raw,{input,indicators,policy:previewPolicy,now:(options.now||Date.now)()}); }
          catch(e) { rejection = e.code || 'AI_RESPONSE_INVALID'; }
          return sendJson(response,200,{mode:'preview',ordersCreated:0,assumptions:{balance:100,upOdds:2,downOdds:2,maxStakePct:10},
            engine:decisionProvider.describeFor(input),raw,plan:plan||null,rejection,modelRequest,
            ...(plan?{audit:decisionAudit({provider:decisionProvider,input,plan,indicators,raw})}:{})});
        }
      }
      return false;
    }
    if (request.method === 'GET' && url.pathname === '/api/simulation/events') {
      if (typeof simulation.subscribe !== 'function') throw appError('Simulation events are unavailable.', 501, 'SIMULATION_EVENTS_UNAVAILABLE');
      response.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
        'x-content-type-options': 'nosniff',
      });
      response.write(`event: ready\ndata: ${JSON.stringify({ observedAt: (options.now || Date.now)() })}\n\n`);
      const stream = { response, heartbeat: null, unsubscribe: null, closed: false };
      const send = event => {
        if (!response.writableEnded) response.write(`event: simulation\ndata: ${JSON.stringify(event)}\n\n`);
      };
      stream.unsubscribe = simulation.subscribe(send);
      stream.heartbeat = setInterval(() => { if (!response.writableEnded) response.write(': keepalive\n\n'); }, 15000);
      stream.heartbeat.unref?.();
      simulationStreams.add(stream);
      stream.close = (endResponse = false) => {
        if (stream.closed) return;
        stream.closed = true;
        clearInterval(stream.heartbeat); stream.unsubscribe?.(); simulationStreams.delete(stream);
        if (endResponse && !response.writableEnded) response.end();
      };
      response.once('close', stream.close); response.once('error', stream.close);
      return true;
    }
    if (request.method === 'GET' && url.pathname === '/api/simulation/intent') {
      return sendJson(response, 200, executionBridge.preview(requiredId(url.searchParams.get('battleId'), 'battleId'), requiredId(url.searchParams.get('intentId'), 'intentId')));
    }
    if (request.method === 'GET' && url.pathname === '/api/executions') {
      return sendJson(response, 200, { executions: executionBridge.list(url.searchParams.get('battleId')), quotesEnabled: config.liveQuotesEnabled || config.liveTradingEnabled, tradingEnabled: config.liveTradingEnabled });
    }
    if (request.method === 'POST' && ['/api/executions/quote', '/api/executions/submit', '/api/executions/reconcile'].includes(url.pathname)) {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (url.pathname.endsWith('/quote')) {
        if (['amount', 'tokenId', 'marketTopicId', 'side', 'orderType'].some(key => Object.hasOwn(body, key))) throw appError('Use the saved intent without trade overrides.', 400, 'INTENT_OVERRIDE_REJECTED');
        return sendJson(response, 200, await executionBridge.quote(requiredId(body.battleId, 'battleId'), requiredId(body.intentId, 'intentId'), body.slippageBps));
      }
      const id = requiredId(body.executionId, 'executionId');
      return sendJson(response, 200, url.pathname.endsWith('/submit') ? await executionBridge.submit(id, body.confirmed) : await executionBridge.reconcile(id));
    }
    if (request.method === 'GET' && url.pathname === '/api/simulation/valuation') {
      const battleId = url.searchParams.get('battleId') || 'default';
      const battle = simulation.snapshot(battleId);
      const result = await estimatePositions(battle);
      const unavailable = result.agents.find(agent => agent.reason);
      const latest = simulation.snapshot(battleId);
      // Record connection health only; valuation never changes balances or orders.
      if (!latest.recovery && unavailable && latest.stateVersion === battle.stateVersion && result.signature === require('./public/market-values').valuationKey(latest)) simulation.marketFailure?.(battleId, unavailable.reason);
      result.recovery = simulation.snapshot(battleId).recovery || null;
      return sendJson(response, 200, result);
    }
    if (request.method === 'GET' && url.pathname === '/api/simulation') {
      const battleId = url.searchParams.get('battleId') || 'default';
      if (url.searchParams.get('clientId')) simulation.touch(battleId);
      const view = url.searchParams.get('view');
      const data = view === 'live' && typeof simulation.liveSnapshot === 'function'
        ? simulation.liveSnapshot(battleId)
        : simulation.snapshot(battleId);
      return sendJson(response, 200, data);
    }
    if (request.method === 'GET' && url.pathname === '/api/simulation/battles') {
      const full = url.searchParams.get('view') === 'full';
      const battles = !full && typeof simulation.summaries === 'function' ? simulation.summaries() : simulation.list();
      return sendJson(response, 200, { view: full ? 'full' : 'summary', generatedAt: Date.now(), battles, leaderboard: simulation.leaderboard(battles) });
    }
    if (request.method === 'GET' && url.pathname === '/api/simulation/strategies') {
      const catalog = require('./public/strategy-catalog');
      return sendJson(response, 200, { ...simulation.getStrategies(), capabilities: { version: 8, idempotentCreation: true, minInitialBalance: 10, aiPerBattleModels:true, strategies: Object.keys(catalog.profiles), indicators: Object.keys(catalog.indicators), assets: ['BTC', 'ETH', 'BNB'], periods: ['5m', '15m', '1h', '1d'], streakEmotion: true, battleEmotion: true, actionUrge: true, battleActionUrge: true, priceActionCandles: true, realtimeEntry: true } });
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/strategies') {
      assertSameOrigin(request);
      return sendJson(response, 200, simulation.setStrategies(await readJson(request)));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/reset') {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (body.confirmed !== true) throw appError('Reset confirmation required');
      return sendJson(response, 200, await simulation.reset());
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/delete') {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (body.confirmed !== true) throw appError('Delete confirmation required');
      const battleId = requiredId(body.battleId, 'battleId');
      if (executionBridge.list(battleId).length) throw appError('Battle has execution records', 409, 'BATTLE_HAS_EXECUTIONS');
      return sendJson(response, 200, await simulation.remove(battleId));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/battles') {
      assertSameOrigin(request);
      const body = await readJson(request);
      const prior = simulation.findCreation?.(body.requestId, body.name, body.config || {});
      if (prior) return sendJson(response, 200, prior);
      collection.assertSelection(body.config||{});
      aiConnections.assertAgents(body.config?.agents);
      return sendJson(response, 201, simulation.create(body.name, body.config || {}, body.clientId || null, body.requestId));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/control') {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (typeof body.enabled !== 'boolean') throw appError('enabled must be boolean');
      if (body.enabled) {
        const battle = simulation.snapshot(body.battleId || 'default');
        if (battle.aiConnectionFailure) {
          const agents = battle.config.agents;
          aiConnections.assertAgents(agents);
          const connections = new Map(agents.filter(a => a.aiConnectionId && a.aiConnectionId !== 'none').map(a => [a.aiConnectionId, a.aiConnectionRevision]));
          for (const [id, revision] of connections) await aiConnections.testConnection(id, revision);
        }
      }
      if (body.clientId) simulation.touch(body.battleId || 'default');
      return sendJson(response, 200, simulation.setEnabled(body.enabled, body.battleId || 'default'));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/retry') {
      assertSameOrigin(request);
      const body = await readJson(request);
      try { return sendJson(response, 200, simulation.retryConnection(requiredId(body.battleId, 'battleId'))); }
      catch (cause) { throw appError(cause.code || cause.message, 409, cause.code || 'RETRY_FAILED'); }
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/top-up') {
      assertSameOrigin(request);
      const body=await readJson(request);
      // TODO(live): a real-wallet funding flow must be implemented separately. This endpoint credits paper chips only.
      if(body.mode!=='paper')throw appError('Paper funding only',400,'PAPER_ONLY');
      if(typeof body.battleId!=='string'||typeof body.agentId!=='string')throw appError('Invalid target',400,'INVALID_TOP_UP_REQUEST');
      try{return sendJson(response,200,simulation.topUp(body.battleId,body.agentId,body.amount,body.requestId));}
      catch(cause){throw appError(cause.code||cause.message,cause.code==='STORAGE_ERROR'?503:409,cause.code||'TOP_UP_FAILED');}
    }
    if (request.method === 'GET' && url.pathname === '/api/cards/collection') return sendJson(response,200,collection.read());
    if (request.method === 'POST' && url.pathname === '/api/cards/action') {
      assertSameOrigin(request);
      return sendJson(response,200,collection.transact(await readJson(request)));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/global-controls') {
      assertSameOrigin(request);
      const body=await readJson(request);
      return sendJson(response,200,simulation.setGlobalControls(body.controls,body.battleId,body.revision));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/emotion') {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (typeof body.emotionLevel !== 'number' || !Number.isInteger(body.emotionLevel) || body.emotionLevel < 0 || body.emotionLevel > 100) throw appError('emotionLevel must be an integer from 0 to 100', 400, 'INVALID_BATTLE_EMOTION');
      if (body.clientId) simulation.touch(body.battleId || 'default');
      return sendJson(response, 200, simulation.setEmotion(body.emotionLevel, body.battleId || 'default'));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/action-urge') {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (typeof body.actionUrgeLevel !== 'number' || !Number.isInteger(body.actionUrgeLevel) || body.actionUrgeLevel < 0 || body.actionUrgeLevel > 100) throw appError('actionUrgeLevel must be an integer from 0 to 100', 400, 'INVALID_BATTLE_ACTION_URGE');
      if (body.clientId) simulation.touch(body.battleId || 'default');
      return sendJson(response, 200, simulation.setActionUrge(body.actionUrgeLevel, body.battleId || 'default'));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/realtime-entry') {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (typeof body.enabled !== 'boolean') throw appError('enabled must be a boolean', 400, 'INVALID_REALTIME_ENTRY');
      return sendJson(response, 200, simulation.setRealtimeEntry(body.enabled, body.battleId || 'default'));
    }
    if (request.method === 'POST' && url.pathname === '/api/simulation/end') {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (body.clientId) simulation.touch(body.battleId || 'default');
      return sendJson(response, 200, simulation.end(body.battleId || 'default', body.reason || 'MANUAL'));
    }
    if (request.method === 'POST' && ['/api/prediction/quotes', '/api/prediction/orders'].includes(url.pathname) && !config.liveTradingEnabled) {
      throw appError('Live trading is disabled. Use /api/paper/orders for virtual funds.', 403, 'LIVE_TRADING_DISABLED');
    }
    if (request.method === 'GET' && url.pathname === '/api/market/prices') {
      const symbols = url.searchParams.has('symbol') ? [url.searchParams.get('symbol')] : ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
      return sendJson(response, 200, { mode: 'paper', prices: await Promise.all(symbols.map(symbol => paper.price(symbol))) });
    }
    if (request.method === 'GET' && url.pathname === '/api/market/indicators') {
      return sendJson(response, 200, await indicatorSource.snapshot(url.searchParams.get('symbol') || 'BTCUSDT'));
    }
    if (request.method === 'GET' && url.pathname === '/api/paper/account') {
      return sendJson(response, 200, await paper.account());
    }
    if (request.method === 'POST' && url.pathname === '/api/paper/orders') {
      assertSameOrigin(request);
      return sendJson(response, 410, { code: 'LEGACY_PAPER_DISABLED', error: 'Manual paper bets retired. Use GET /api/simulation; rule AIs place orders only at the configured market boundary.' });
    }
    if (request.method === 'GET' && url.pathname === '/api/config') {
      return sendJson(response, 200, {
        provider: 'binance',
        network: 'production',
        networkLabel: 'Binance Agentic Wallet',
        chainId: config.chainId,
        liveWalletEnabled: true,
        tradingMode: config.liveTradingEnabled ? 'live' : 'paper',
        paperTradingEnabled: true,
        tradingEnabled: config.liveTradingEnabled,
        predictionTradingEnabled: config.liveTradingEnabled,
        predictionOrderPolicy: {
          side: 'BUY',
          orderType: 'MARKET',
          maxAmountUsdt: config.maxPredictionOrderUsdt,
          confirmationRequired: true,
        },
        aiDecision: decisionProvider.describe(),
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/capabilities') {
      return sendJson(response, 200, {
        provider: 'binance-agentic-wallet',
        tradingMode: config.liveTradingEnabled ? 'live' : 'paper',
        paper: ['GET /api/market/prices', 'GET /api/paper/account', 'POST /api/paper/orders'],
        aiSimulation: ['GET /api/market/indicators', 'GET /api/simulation/strategies', 'POST /api/simulation/strategies', 'GET /api/simulation'],
        wallet: ['status', 'signin', 'signout', 'addresses', 'balances', 'settings', 'transaction-lock'],
        prediction: ['market-list', 'market-search', 'market-detail', 'positions', 'portfolio', 'order-history', 'quote', 'place-order'],
        liveOrderFlow: ['POST /api/prediction/quotes', 'human confirmation', 'POST /api/prediction/orders', 'GET /api/prediction/orders'],
        policy: {
          side: 'BUY',
          orderType: 'MARKET',
          maxAmountUsdt: config.maxPredictionOrderUsdt,
          confirmationRequired: true,
          automaticRetry: false,
        },
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/network') {
      const startedAt = Date.now();
      const status = await walletStatus();
      return sendJson(response, 200, {
        serviceAvailable: true,
        connected: status === 'CONNECTED',
        walletStatus: status,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/wallet') {
      return sendJson(response, 200, await walletSnapshot());
    }
    if (request.method === 'GET' && url.pathname === '/api/chains') {
      await requireConnected();
      return sendJson(response, 200, { data: cliData(await walletCli(['wallet', 'chains'])) });
    }
    if (request.method === 'GET' && url.pathname === '/api/balances') {
      await requireConnected();
      const args = ['wallet', 'balance'];
      const symbol = url.searchParams.get('symbol');
      const tokenAddress = url.searchParams.get('tokenAddress');
      const chainId = url.searchParams.get('chainId');
      if (symbol) addOption(args, '--symbol', requiredId(symbol, 'symbol'));
      if (tokenAddress) addOption(args, '--tokenAddress', requiredId(tokenAddress, 'tokenAddress'));
      if (chainId) {
        if (!/^(?:\d+|CT_501)$/.test(chainId)) throw appError('chainId is invalid.', 400, 'INVALID_PARAMETER');
        addOption(args, '--binanceChainId', chainId);
      }
      return sendJson(response, 200, { data: cliData(await walletCli(args)) });
    }
    if (request.method === 'GET' && url.pathname === '/api/wallet/auth') {
      expirePendingAuth();
      if (await walletStatus() === 'CONNECTED') authState = { status: 'connected' };
      return sendJson(response, 200, { auth: authPublic(authState) });
    }
    if (request.method === 'POST' && url.pathname === '/api/wallet/signin') {
      assertSameOrigin(request);
      return sendJson(response, 200, { auth: await startSignin() });
    }
    if (request.method === 'POST' && url.pathname === '/api/wallet/signout') {
      assertSameOrigin(request);
      authState?.controller?.abort();
      const result = await walletCli(['auth', 'signout']);
      authState = { status: 'idle' };
      return sendJson(response, 200, { status: result?.data?.status || 'LOGGED_OUT' });
    }
    if (request.method === 'GET' && url.pathname === '/api/prediction/markets') {
      await requireConnected();
      const args = ['prediction', 'market', 'list'];
      addOption(args, '--l1Category', url.searchParams.get('l1Category') ? requiredId(url.searchParams.get('l1Category'), 'l1Category') : null);
      addOption(args, '--l2Category', url.searchParams.get('l2Category') ? requiredId(url.searchParams.get('l2Category'), 'l2Category') : null);
      addOption(args, '--sortBy', optionalEnum(url.searchParams.get('sortBy'), 'sortBy', ['RECOMMENDED', 'VOLUME', 'PARTICIPANTS', 'CREATED_TIME', 'END_DATE']));
      addOption(args, '--orderBy', optionalEnum(url.searchParams.get('orderBy'), 'orderBy', ['ASC', 'DESC']));
      addOption(args, '--offset', optionalInteger(url.searchParams.get('offset'), 'offset', 0, 100_000));
      addOption(args, '--limit', optionalInteger(url.searchParams.get('limit'), 'limit', 1, 100));
      return sendJson(response, 200, { data: cliData(await walletCli(args)) });
    }
    if (request.method === 'GET' && url.pathname === '/api/prediction/markets/search') {
      await requireConnected();
      const query = String(url.searchParams.get('q') || '').trim();
      if (!query || query.length > 200 || /[\u0000-\u001f]/.test(query)) {
        throw appError('q must contain 1 to 200 printable characters.', 400, 'INVALID_PARAMETER');
      }
      const args = ['prediction', 'market', 'search', '--query', query];
      addOption(args, '--limit', optionalInteger(url.searchParams.get('limit'), 'limit', 1, 50));
      return sendJson(response, 200, { data: cliData(await walletCli(args)) });
    }
    if (request.method === 'GET' && url.pathname === '/api/prediction/market') {
      await requireConnected();
      const marketTopicId = requiredId(url.searchParams.get('marketTopicId'), 'marketTopicId');
      return sendJson(response, 200, {
        data: cliData(await walletCli(['prediction', 'market', 'detail', '--marketTopicId', marketTopicId])),
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/prediction/orders') {
      await requireConnected();
      const args = ['prediction', 'order', 'history'];
      addOption(args, '--status', url.searchParams.get('status') ? requiredId(url.searchParams.get('status'), 'status') : null);
      addOption(args, '--l1Category', url.searchParams.get('l1Category') ? requiredId(url.searchParams.get('l1Category'), 'l1Category') : null);
      addOption(args, '--orderType', optionalEnum(url.searchParams.get('orderType'), 'orderType', ['MARKET', 'LIMIT']));
      addOption(args, '--offset', optionalInteger(url.searchParams.get('offset'), 'offset', 0, 100_000));
      addOption(args, '--limit', optionalInteger(url.searchParams.get('limit'), 'limit', 1, 100));
      return sendJson(response, 200, { data: cliData(await walletCli(args)) });
    }
    if (request.method === 'GET' && url.pathname === '/api/prediction/positions') {
      await requireConnected();
      const args = ['prediction', 'position', 'list'];
      addOption(args, '--tab', optionalEnum(url.searchParams.get('tab'), 'tab', ['ONGOING', 'ENDED', 'PENDING_CLAIM']));
      addOption(args, '--offset', optionalInteger(url.searchParams.get('offset'), 'offset', 0, 100_000));
      addOption(args, '--limit', optionalInteger(url.searchParams.get('limit'), 'limit', 1, 100));
      return sendJson(response, 200, { data: cliData(await walletCli(args)) });
    }
    if (request.method === 'GET' && url.pathname === '/api/prediction/portfolio') {
      await requireConnected();
      return sendJson(response, 200, { data: cliData(await walletCli(['prediction', 'position', 'portfolio'])) });
    }
    if (request.method === 'POST' && url.pathname === '/api/prediction/quotes') {
      assertSameOrigin(request);
      const body = await readJson(request);
      const chainId = String(body.chainId ?? config.chainId);
      if (chainId !== config.chainId) {
        throw appError(`chainId must match the configured chain ${config.chainId}.`, 400, 'CHAIN_MISMATCH');
      }
      const tokenId = requiredId(body.tokenId, 'tokenId');
      const marketTopicId = requiredId(body.marketTopicId, 'marketTopicId');
      const side = optionalEnum(body.side ?? 'BUY', 'side', ['BUY']);
      const orderType = optionalEnum(body.orderType ?? 'MARKET', 'orderType', ['MARKET']);
      const slippageBps = optionalInteger(body.slippageBps ?? 1000, 'slippageBps', 0, 5000);
      const amount = positiveAmount(body.amount, config.maxPredictionOrderUsdt);
      await predictionPreflight(amount.amount);
      const args = [
        'prediction', 'trade', 'quote',
        '--binanceChainId', chainId,
        '--tokenId', tokenId,
        '--marketTopicId', marketTopicId,
        '--side', side,
        '--amount', amount.text,
        '--orderType', orderType,
        '--slippageBps', String(slippageBps),
      ];
      const result = await walletCli(args);
      const quoteData = cliData(result) || {};
      const quoteId = requiredId(quoteData.quoteId, 'quoteId');
      const quotedAmount = Number(quoteData.amountIn ?? quoteData.inputAmount ?? amount.amount);
      if (!Number.isFinite(quotedAmount) || quotedAmount <= 0 || quotedAmount > config.maxPredictionOrderUsdt) {
        throw appError('Quote amount is invalid or exceeds the server order limit.', 409, 'UNSAFE_QUOTE');
      }
      pruneQuotes();
      const confirmationId = crypto.randomUUID();
      const expiresAtMs = quoteExpiry(quoteData.expireAt ?? quoteData.expiresAt);
      pendingQuotes.set(confirmationId, {
        quoteId,
        slippageBps,
        orderType,
        amount: amount.amount,
        status: 'quoted',
        expiresAtMs,
      });
      const publicQuote = { ...quoteData };
      delete publicQuote.quoteId;
      return sendJson(response, 200, {
        confirmationId,
        confirmationRequired: true,
        expiresAt: new Date(expiresAtMs).toISOString(),
        quote: publicQuote,
        warning: 'This is a live Binance Prediction order quote. A human must confirm before submission.',
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/prediction/orders') {
      assertSameOrigin(request);
      const body = await readJson(request);
      if (body.confirmed !== true) {
        throw appError('Human confirmation is required before placing a live order.', 400, 'HUMAN_CONFIRMATION_REQUIRED');
      }
      const confirmationId = requiredId(body.confirmationId, 'confirmationId');
      pruneQuotes();
      const pending = pendingQuotes.get(confirmationId);
      if (!pending) throw appError('Confirmation is missing or expired. Request a new quote.', 409, 'CONFIRMATION_NOT_FOUND');
      if (pending.status !== 'quoted') {
        throw appError('This confirmation has already been used. Do not retry the order.', 409, 'CONFIRMATION_ALREADY_USED');
      }
      if (Date.now() >= pending.expiresAtMs) {
        pending.status = 'expired';
        throw appError('The quote expired. Request a new quote and confirm it again.', 409, 'QUOTE_EXPIRED');
      }
      await predictionPreflight(pending.amount);
      pending.status = 'submitting';
      let result;
      try {
        result = await walletCli([
          'prediction', 'trade', 'place-order',
          '--quoteId', pending.quoteId,
          '--slippageBps', String(pending.slippageBps),
          '--orderType', pending.orderType,
        ], { timeoutMs: 60_000 });
      } catch (error) {
        pending.status = 'unknown';
        throw error;
      }
      pending.status = 'submitted';
      let lockStatus = 'UNKNOWN';
      try {
        const lockResult = await walletCli(['wallet', 'tx-lock', '--binanceChainId', config.chainId]);
        lockStatus = String(lockResult?.data?.status || 'UNKNOWN').toUpperCase();
      } catch {}
      return sendJson(response, 200, {
        status: 'SUBMITTED',
        order: cliData(result),
        transactionLock: lockStatus,
        requiresAppReview: lockStatus !== 'UNLOCKED',
        next: 'Query GET /api/prediction/orders. A submitted order is not necessarily filled.',
      });
    }
    return false;
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
    try {
      if (url.pathname.startsWith('/api/')) {
        const handled = await apiHandler(request, response, url);
        if (handled === false) sendJson(response, 404, { error: 'API route not found.' });
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { allow: 'GET, HEAD' });
        response.end();
        return;
      }
      const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^[/\\]+/, '');
      const filePath = path.resolve(PUBLIC_DIR, relativePath);
      const publicPrefix = `${path.resolve(PUBLIC_DIR)}${path.sep}`;
      if (filePath !== path.join(PUBLIC_DIR, 'index.html') && !filePath.startsWith(publicPrefix)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      if (!clientAssetAllowed(relativePath) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, {
        'content-type': CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-cache',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      const statusCode = error.statusCode || (url.pathname.startsWith('/api/') ? 502 : 500);
      sendJson(response, statusCode, {
        error: error.message || 'Unexpected server error.',
        code: error.code || undefined,
      });
    }
  });
  let simulationTimer;
  server.on('listening', () => {
    if (options.walletCli && !options.predictionSource) return;
    void simulation.tick();
    simulationTimer = setInterval(() => void simulation.tick(), 1000);
    simulationTimer.unref();
  });
  const closeSimulationStreams = () => {
    for (const stream of [...simulationStreams]) stream.close?.(true);
  };
  const nativeClose = server.close.bind(server);
  server.close = callback => {
    closeSimulationStreams();
    return nativeClose(callback);
  };
  server.on('close', () => { clearInterval(simulationTimer); closeSimulationStreams(); });
  return server;
}

if (require.main === module) {
  try {
    const config = resolveConfig();
    const server = createWarriorServer(config);
    server.listen(config.port, '127.0.0.1', () => {
      console.log(`10U Warrior: http://127.0.0.1:${config.port} (Binance Agentic Wallet)`);
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  createBawRunner,
  createWarriorServer,
  parseCliOutput,
  resolveConfig,
};
