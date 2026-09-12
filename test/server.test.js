const test = require('node:test');
const assert = require('node:assert/strict');
const { createWarriorServer, parseCliOutput, resolveConfig } = require('../server');

async function withServer(walletCli, callback, overrides = {}) {
  const server = createWarriorServer({ walletCli, chainId: '56', maxPredictionOrderUsdt: 10, ...overrides });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await callback(origin);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function request(origin, pathname, options = {}) {
  return fetch(`${origin}${pathname}`, {
    ...options,
    headers: {
      ...(options.method === 'POST' ? { origin, 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
}

function command(args) {
  return args.join(' ');
}

test('reports Binance Agentic configuration and the constrained live-order policy', async () => {
  const walletCli = async args => {
    assert.equal(command(args), 'wallet status');
    return { success: true, data: { status: 'UNCONNECTED' } };
  };
  await withServer(walletCli, async origin => {
    const config = await (await request(origin, '/api/config')).json();
    assert.equal(config.provider, 'binance');
    assert.equal(config.network, 'production');
    assert.equal(config.chainId, '56');
    assert.equal(config.liveWalletEnabled, true);
    assert.equal(config.tradingEnabled, true);
    assert.deepEqual(config.predictionOrderPolicy, {
      side: 'BUY',
      orderType: 'MARKET',
      maxAmountUsdt: 10,
      confirmationRequired: true,
    });

    const network = await (await request(origin, '/api/network')).json();
    assert.equal(network.serviceAvailable, true);
    assert.equal(network.connected, false);
    assert.equal(network.walletStatus, 'UNCONNECTED');
  });
});

test('starts QR sign-in and keeps verification running in the background', async () => {
  let verifyStarted = false;
  let resolveVerify;
  let status = 'UNCONNECTED';
  const verification = new Promise(resolve => { resolveVerify = resolve; });
  const walletCli = async args => {
    switch (command(args)) {
      case 'wallet status': return { success: true, data: { status } };
      case 'auth signin': return {
        success: true,
        data: {
          urlForWeb: 'https://web3.binance.com/en/agent-login?expireAt=9999999999999&url=test',
          qrCodeId: 'qr-test-id',
          expireAt: '9999999999999',
          pairingCode: '654321',
        },
      };
      case 'auth verify --qrCodeId qr-test-id':
        verifyStarted = true;
        return verification;
      default: throw new Error(`Unexpected command: ${command(args)}`);
    }
  };
  await withServer(walletCli, async origin => {
    const response = await request(origin, '/api/wallet/signin', { method: 'POST', body: '{}' });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.auth.status, 'awaiting_scan');
    assert.equal(result.auth.pairingCode, '654321');
    assert.match(result.auth.qrImage, /^data:image\/png;base64,/);
    assert.equal(Object.hasOwn(result.auth, 'qrCodeId'), false);
    assert.equal(verifyStarted, true);

    status = 'CONNECTED';
    resolveVerify({ success: true, data: { status: 'SUCCESS' } });
    await new Promise(resolve => setImmediate(resolve));
    const auth = await (await request(origin, '/api/wallet/auth')).json();
    assert.equal(auth.auth.status, 'connected');
  });
});

test('returns a sanitized connected-wallet snapshot and detects a transaction lock', async () => {
  const walletCli = async args => {
    switch (command(args)) {
      case 'wallet status': return { success: true, data: { status: 'CONNECTED' } };
      case 'wallet address': return { success: true, data: { addresses: [
        { binanceChainId: '56', chainName: 'BNB Smart Chain', address: '0x1111111111111111111111111111111111111111', secret: 'hidden' },
      ] } };
      case 'wallet balance': return { success: true, data: [
        { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', binanceChainId: '56', balance: '12.5', price: '1', value: '12.5', secret: 'hidden' },
      ] };
      case 'wallet settings': return { success: true, data: {
        predictionEnabled: true,
        predictionDailyLimit: 50,
        predictionQuotaUsed: 10,
        predictionQuotaLeft: 40,
        abnormalTxnHandling: 'NeedConfirmation',
        sessionExpireTime: '2026-09-12T10:00:00+08:00',
      } };
      case 'wallet tx-lock --binanceChainId 56': return { success: true, data: { status: 'LOCKED' } };
      default: throw new Error(`Unexpected command: ${command(args)}`);
    }
  };
  await withServer(walletCli, async origin => {
    const result = await (await request(origin, '/api/wallet')).json();
    assert.equal(result.wallet.status, 'connected');
    assert.equal(result.wallet.primaryAddress.chainName, 'BNB Smart Chain');
    assert.equal(Object.hasOwn(result.wallet.primaryAddress, 'secret'), false);
    assert.equal(result.accountValue, 12.5);
    assert.equal(result.settings.predictionQuotaLeft, 40);
    assert.equal(result.settings.abnormalTxnHandling, 'NeedConfirmation');
    assert.deepEqual(result.txLock, { status: 'LOCKED', chainId: '56' });
  });
});

test('signs out only through a same-origin mutation request', async () => {
  let signoutCalls = 0;
  const walletCli = async args => {
    if (command(args) === 'auth signout') {
      signoutCalls += 1;
      return { success: true, data: { status: 'LOGGED_OUT' } };
    }
    throw new Error(`Unexpected command: ${command(args)}`);
  };
  await withServer(walletCli, async origin => {
    const rejected = await request(origin, '/api/wallet/signout', {
      method: 'POST',
      body: '{}',
      headers: { origin: 'https://attacker.example' },
    });
    assert.equal(rejected.status, 403);
    assert.equal(signoutCalls, 0);

    const accepted = await request(origin, '/api/wallet/signout', { method: 'POST', body: '{}' });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).status, 'LOGGED_OUT');
    assert.equal(signoutCalls, 1);
  });
});

test('parses CLI JSON and preserves its exact error message', () => {
  const success = parseCliOutput('{"success":true,"data":{"status":"CONNECTED"}}', '', 0);
  assert.equal(success.data.status, 'CONNECTED');
  assert.throws(
    () => parseCliOutput('{"success":false,"error":{"name":"AUTH_REJECTED","message":"QR expired"}}', '', 1),
    error => error.code === 'AUTH_REJECTED' && error.message === 'QR expired',
  );
});

test('validates the configured Binance chain id', () => {
  assert.equal(resolveConfig({ chainId: 'CT_501' }).chainId, 'CT_501');
  assert.throws(() => resolveConfig({ chainId: 'not-a-chain' }), /Unsupported BINANCE_AGENT_CHAIN_ID/);
  assert.throws(() => resolveConfig({ maxPredictionOrderUsdt: 0 }), /MAX_PREDICTION_ORDER_USDT/);
});

test('exposes balances and prediction market reads through exact CLI commands', async () => {
  const seen = [];
  const walletCli = async args => {
    seen.push(command(args));
    if (command(args) === 'wallet status') return { success: true, data: { status: 'CONNECTED' } };
    if (command(args) === 'wallet balance --symbol USDT --binanceChainId 56') {
      return { success: true, data: [{ symbol: 'USDT', balance: '12', sessionToken: 'hidden' }] };
    }
    if (command(args) === 'prediction market search --query Bitcoin 5 minute --limit 5') {
      return { success: true, data: [{ marketTopicId: 'm1', title: 'Bitcoin 5 minute' }] };
    }
    throw new Error(`Unexpected command: ${command(args)}`);
  };
  await withServer(walletCli, async origin => {
    const balances = await (await request(origin, '/api/balances?symbol=USDT&chainId=56')).json();
    assert.equal(balances.data[0].balance, '12');
    assert.equal(Object.hasOwn(balances.data[0], 'sessionToken'), false);

    const markets = await (await request(origin, '/api/prediction/markets/search?q=Bitcoin%205%20minute&limit=5')).json();
    assert.equal(markets.data[0].marketTopicId, 'm1');
  });
  assert.deepEqual(seen, [
    'wallet status',
    'wallet balance --symbol USDT --binanceChainId 56',
    'wallet status',
    'prediction market search --query Bitcoin 5 minute --limit 5',
  ]);
});

test('quotes a BUY market order, requires human confirmation, and submits only once', async () => {
  let placeCalls = 0;
  const walletCli = async args => {
    switch (command(args)) {
      case 'wallet status': return { success: true, data: { status: 'CONNECTED' } };
      case 'wallet settings': return { success: true, data: { predictionEnabled: true, predictionQuotaLeft: 25 } };
      case 'wallet tx-lock --binanceChainId 56': return { success: true, data: { status: 'UNLOCKED' } };
      case 'prediction trade quote --binanceChainId 56 --tokenId token-yes --marketTopicId topic-1 --side BUY --amount 2.5 --orderType MARKET --slippageBps 250':
        return { success: true, data: {
          quoteId: 'quote-live-1', amountIn: '2.5', expectedShares: '4.2', expireAt: Date.now() + 120_000,
        } };
      case 'prediction trade place-order --quoteId quote-live-1 --slippageBps 250 --orderType MARKET':
        placeCalls += 1;
        return { success: true, data: { orderId: 'order-1', status: 'SUBMITTED', accessToken: 'hidden' } };
      default: throw new Error(`Unexpected command: ${command(args)}`);
    }
  };
  await withServer(walletCli, async origin => {
    const quoteResponse = await request(origin, '/api/prediction/quotes', {
      method: 'POST',
      body: JSON.stringify({
        tokenId: 'token-yes', marketTopicId: 'topic-1', side: 'BUY', amount: '2.5',
        orderType: 'MARKET', slippageBps: 250,
      }),
    });
    assert.equal(quoteResponse.status, 200);
    const quote = await quoteResponse.json();
    assert.equal(quote.confirmationRequired, true);
    assert.equal(quote.quote.expectedShares, '4.2');
    assert.equal(Object.hasOwn(quote.quote, 'quoteId'), false);

    const unconfirmed = await request(origin, '/api/prediction/orders', {
      method: 'POST', body: JSON.stringify({ confirmationId: quote.confirmationId }),
    });
    assert.equal(unconfirmed.status, 400);
    assert.equal((await unconfirmed.json()).code, 'HUMAN_CONFIRMATION_REQUIRED');
    assert.equal(placeCalls, 0);

    const submitted = await request(origin, '/api/prediction/orders', {
      method: 'POST', body: JSON.stringify({ confirmationId: quote.confirmationId, confirmed: true }),
    });
    assert.equal(submitted.status, 200);
    const order = await submitted.json();
    assert.equal(order.status, 'SUBMITTED');
    assert.equal(order.order.orderId, 'order-1');
    assert.equal(Object.hasOwn(order.order, 'accessToken'), false);
    assert.equal(placeCalls, 1);

    const duplicate = await request(origin, '/api/prediction/orders', {
      method: 'POST', body: JSON.stringify({ confirmationId: quote.confirmationId, confirmed: true }),
    });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).code, 'CONFIRMATION_ALREADY_USED');
    assert.equal(placeCalls, 1);
  });
});

test('fails closed when the order exceeds the cap or the wallet is locked', async () => {
  let quoteCalls = 0;
  const walletCli = async args => {
    switch (command(args)) {
      case 'wallet status': return { success: true, data: { status: 'CONNECTED' } };
      case 'wallet settings': return { success: true, data: { predictionEnabled: true, predictionQuotaLeft: 25 } };
      case 'wallet tx-lock --binanceChainId 56': return { success: true, data: { status: 'LOCKED' } };
      default:
        if (command(args).startsWith('prediction trade quote')) quoteCalls += 1;
        throw new Error(`Unexpected command: ${command(args)}`);
    }
  };
  await withServer(walletCli, async origin => {
    const overCap = await request(origin, '/api/prediction/quotes', {
      method: 'POST', body: JSON.stringify({ tokenId: 'token-yes', marketTopicId: 'topic-1', amount: 11 }),
    });
    assert.equal(overCap.status, 400);
    assert.equal((await overCap.json()).code, 'ORDER_LIMIT_EXCEEDED');

    const locked = await request(origin, '/api/prediction/quotes', {
      method: 'POST', body: JSON.stringify({ tokenId: 'token-yes', marketTopicId: 'topic-1', amount: 1 }),
    });
    assert.equal(locked.status, 409);
    assert.equal((await locked.json()).code, 'WALLET_TRANSACTION_LOCKED');
    assert.equal(quoteCalls, 0);
  });
});
