const test = require('node:test');
const assert = require('node:assert/strict');
const { createPriceStream } = require('../public/price-stream');

function fixture() {
  let time = 1800000000000, id = 0;
  const tasks = new Map(), sockets = [], updates = [], statuses = [];
  const timers = { setTimeout(fn, ms) { const key = ++id; tasks.set(key, { fn, at: time + ms }); return key; }, clearTimeout(key) { tasks.delete(key); } };
  class Socket {
    constructor(url) { this.url = url; this.closed = false; sockets.push(this); }
    close() { this.closed = true; }
    send(trade) { this.onmessage?.({ data: JSON.stringify({ e: 'aggTrade', s: 'BTCUSDT', p: '100', T: time, ...trade }) }); }
  }
  function advance(ms) {
    const end = time + ms;
    for (;;) {
      const next = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      tasks.delete(next[0]); time = next[1].at; next[1].fn();
    }
    time = end;
  }
  const stream = createPriceStream({ timers, now: () => time, WebSocketImpl: Socket,
    random: () => .5, onUpdate: quote => updates.push({ at: time, quote }), onStatus: status => statuses.push(status) });
  return { stream, sockets, updates, statuses, advance, now: () => time, tasks };
}

test('WebSocket: one symbol, 250ms coalescing uses newest trade instead of repainting each message', () => {
  const f = fixture(); f.stream.start('BTCUSDT'); f.stream.start('BTCUSDT');
  assert.equal(f.sockets.length, 1);
  assert.equal(f.sockets[0].url, 'wss://data-stream.binance.vision/ws/btcusdt@aggTrade');
  f.sockets[0].send(); f.advance(0);
  for (let i = 1; i <= 1000; i++) f.sockets[0].send({ p: String(100 + i) });
  assert.equal(f.updates.length, 1);
  f.advance(249); assert.equal(f.updates.length, 1);
  f.advance(1); assert.equal(f.updates.length, 2); assert.equal(f.updates[1].quote.price, 1100);
  for (let i = 0; i < 100; i++) { f.sockets[0].send({ p: String(1200 + i) }); f.advance(10); }
  assert.equal(f.updates.length, 6);
  for (let i = 1; i < f.updates.length; i++) assert.ok(f.updates[i].at - f.updates[i - 1].at >= 250);
  f.stream.stop(); assert.equal(f.tasks.size, 0);
});

test('WebSocket: invalid, stale, future and out-of-order messages are ignored; switch drops old socket', () => {
  const f = fixture(); f.stream.start('BTCUSDT'); const old = f.sockets[0];
  for (const trade of [{ e: 'ticker' }, { s: 'ETHUSDT' }, { p: 'NaN' }, { p: '-1' }, { T: f.now() - 15001 }, { T: f.now() + 2001 }]) old.send(trade);
  f.advance(250); assert.equal(f.updates.length, 0);
  old.send({ p: '110' }); f.advance(0); old.send({ p: '90', T: f.now() - 1 }); f.advance(250);
  assert.equal(f.updates.length, 1);
  const oldMessage = old.onmessage;
  f.stream.start('ETHUSDT'); assert.ok(old.closed);
  oldMessage({ data: JSON.stringify({ e: 'aggTrade', s: 'BTCUSDT', p: '999', T: f.now() }) });
  f.sockets[1].send({ s: 'ETHUSDT', p: '200' }); f.advance(0);
  assert.equal(f.updates.at(-1).quote.symbol, 'ETHUSDT'); assert.equal(f.updates.at(-1).quote.price, 200);
  f.stream.stop();
});

test('WebSocket: silence expires the price, backoff is bounded and background stop cancels every timer', () => {
  const f = fixture(); f.stream.start('BTCUSDT'); f.sockets[0].send(); f.advance(0);
  f.advance(16000); assert.ok(f.sockets[0].closed); assert.equal(f.statuses.at(-1), 'reconnecting');
  f.advance(999); assert.equal(f.sockets.length, 1); f.advance(1); assert.equal(f.sockets.length, 2);
  f.sockets[1].onerror(); f.advance(1999); assert.equal(f.sockets.length, 2); f.advance(1); assert.equal(f.sockets.length, 3);
  f.stream.stop(); assert.equal(f.tasks.size, 0); assert.ok(f.sockets.every(s => s.closed));
  f.advance(60000); assert.equal(f.sockets.length, 3);
  f.stream.start('BTCUSDT'); assert.equal(f.sockets.length, 4); f.stream.stop();
  f.stream.start('INVALID'); assert.equal(f.sockets.length, 4); assert.equal(f.statuses.at(-1), 'unavailable');
});
