// Browser-only fixture; never connects to an external endpoint.
module.exports = async context => context.addInitScript(() => {
  window.__priceSilent = false;
  window.__priceSockets = [];
  window.WebSocket = class {
    constructor(url) {
      if (!/^wss:\/\/data-stream\.binance\.vision\/ws\/(btc|eth)usdt@aggTrade$/.test(url)) throw new Error('UNEXPECTED_TEST_SOCKET');
      this.url = url; this.closed = false; window.__priceSockets.push(this);
      const symbol = url.includes('btcusdt') ? 'BTCUSDT' : 'ETHUSDT';
      this.timer = setInterval(() => {
        if (!window.__priceSilent && !this.closed) this.onmessage?.({ data: JSON.stringify({ e: 'aggTrade', s: symbol, p: symbol === 'BTCUSDT' ? '65000.12' : '3500.34', T: Date.now() }) });
      }, 100);
    }
    close() { this.closed = true; clearInterval(this.timer); }
  };
});
