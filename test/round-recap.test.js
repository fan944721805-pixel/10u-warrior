const test = require('node:test');
const assert = require('node:assert/strict');
const { completedRounds, createTracker } = require('../public/round-recap');
const order = (start, status = 'WON', payout = 18) => ({ id: `order-${start}`, start, end: start + 300000, settledAt:start + 300100, status, amount:10, payout });
const battle = (orders = [], id = 'battle-1') => ({ id, agents:[{ id:'a', policy:{name:'A'}, orders }, {id:'b',policy:{name:'B'},orders:[]}] });

test('refresh emits latest completed round only, repeated polls never repeat it', () => {
  const tracker = createTracker(), data = battle([order(1000),order(301000)]);
  const before = structuredClone(data);
  assert.deepEqual(tracker.update(data).map(row=>row.start), [301000]);
  assert.deepEqual(tracker.update(data), []);
  assert.deepEqual(data, before);
  assert.equal(createTracker().update(data).length, 1);
});
test('empty startup and placeholders do not notify; a later settlement does', () => {
  const tracker = createTracker();
  assert.deepEqual(tracker.update({...battle(),placeholder:true}), []);
  assert.deepEqual(tracker.update(battle([order(1000,'OPEN',undefined)])), []);
  assert.equal(tracker.update(battle([order(1000)])).length, 1);
  assert.deepEqual(tracker.update(battle([order(1000)])), []);
});
test('waits for every participating Agent, then combines payouts and marks skipped Agents', () => {
  const tracker = createTracker(), data = battle([order(1000)]);
  data.agents[1].orders = [order(1000,'OPEN',undefined)];
  assert.deepEqual(tracker.update(data), []);
  data.agents[1].orders = [order(1000,'LOST',0)];
  data.agents.push({id:'c',policy:{name:'C'},orders:[]});
  const [round] = tracker.update(data);
  assert.equal(round.stake,20); assert.equal(round.payout,18);
  assert.equal(round.rows[2].count,0);
  assert.equal(round.rows[1].profit,-10);
});
test('detects delayed older rounds, and queues multiple new completed rounds once', () => {
  const tracker = createTracker(); tracker.update(battle([order(301000)]));
  assert.equal(tracker.update(battle([order(1000),order(301000),order(601000)])).length,2);
  assert.deepEqual(tracker.update(battle([order(1000),order(301000),order(601000)])),[]);
});
test('switching battles does not replay historical notifications', () => {
  const tracker = createTracker(); tracker.update(battle([order(1000)]));
  assert.deepEqual(tracker.update(battle([order(1000)],'battle-2')),[]);
  assert.deepEqual(tracker.update(battle([order(1000)])),[]);
  assert.equal(tracker.update(battle([order(1000),order(301000)],'battle-2')).length,1);
});
test('uses exact recorded payouts and only permits odds fallback for labelled offline orders', () => {
  const data = battle([{...order(1000),payout:18.125,quote:{odds:1.81}}]);
  assert.equal(completedRounds(data)[0].payout,18.125);
  data.agents[0].orders[0].payout=undefined;
  assert.deepEqual(completedRounds(data),[]);
  data.agents[0].orders[0].quote.source='offline-simulated';
  assert.equal(completedRounds(data)[0].payout,18.1);
});
test('canceled or still-open orders are not reported as finished settlement rounds', () => {
  assert.deepEqual(completedRounds(battle([order(1000,'CANCELLED',10)])),[]);
  const split=completedRounds(battle([order(1000,'SPLIT',5)]))[0];
  assert.equal(split.payout-split.stake,-5);
});

// Exercise the real popup controller in a minimal DOM, without a live ledger.
function popupHarness(storage = new Map()) {
  const vm = require('node:vm'), fs = require('node:fs');
  const listeners = new Map(), nodes = [];
  let otherDialogOpen = false, modalCalls = 0, focusCalls = 0;
  const document = { hidden:false, documentElement:{lang:'zh-CN'},
    createElement(tag) {
      const events = new Map();
      const element = { tag, children:[], dataset:{}, open:false,
        addEventListener(name, callback) { events.set(name,callback); },
        dispatch(name) { events.get(name)?.({preventDefault(){}}); },
        setAttribute() {}, append(...children) { this.children.push(...children); },
        replaceChildren(...children) { this.children = children; },
        focus() { focusCalls++; },
        showModal() { modalCalls++; this.open = true; },
        close() { this.open = false; document.dispatch('close'); } };
      nodes.push(element); return element;
    },
    addEventListener(name, callback) { listeners.set(name, callback); },
    dispatch(name) { listeners.get(name)?.(); },
    querySelector(selector) {
      if (selector === 'dialog[open]:not(#round-recap-dialog)') return otherDialogOpen ? {} : null;
      throw new Error('Unexpected selector: ' + selector);
    }
  };
  document.body = document.createElement('body');
  const app = {state:{bettingMode:'paper'},on(){}};
  const rootEvents = new Map();
  const window = {document,Warrior:app,page(){},
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
    addEventListener(name, callback) { rootEvents.set(name,callback); }};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/round-recap'),'utf8'), {window,document,queueMicrotask});
  return { update: data=>app.roundRecap.update(data,'第一局'),
    dialog:nodes.find(node=>node.id==='round-recap-dialog'),
    dismiss(text) { nodes.find(node=>node.tag==='button'&&node.textContent===text).onclick(); },
    storageEvent(key) { rootEvents.get('storage')({key:'warrior-round-recap-read:v1:'+key,newValue:'1'}); },
    block() { otherDialogOpen = true; },
    unblock() { otherDialogOpen = false; document.dispatch('close'); },
    get modalCalls() { return modalCalls; }, get focusCalls() { return focusCalls; } };
}
test('an open recap is replaced in place with only the latest round, without refocusing', async () => {
  const ui = popupHarness(); ui.update(battle([order(1000)]));
  assert.equal(ui.modalCalls,1);
  ui.update(battle([order(1000),order(301000),order(601000)]));
  assert.equal(ui.dialog.dataset.roundKey,'battle-1:601000');
  assert.equal(ui.modalCalls,1); assert.equal(ui.focusCalls,1);
  ui.dialog.close(); await Promise.resolve();
  assert.equal(ui.dialog.open,false); assert.equal(ui.modalCalls,1);
});
test('while another dialog is open, multiple settlements collapse into a single newest pending recap', async () => {
  const ui = popupHarness(); ui.block(); ui.update(battle([order(1000)]));
  ui.update(battle([order(1000),order(301000)]));
  ui.update(battle([order(1000),order(301000),order(601000)]));
  assert.equal(ui.modalCalls,0);
  ui.unblock(); await Promise.resolve();
  assert.equal(ui.dialog.dataset.roundKey,'battle-1:601000'); assert.equal(ui.modalCalls,1);
  ui.dialog.close(); await Promise.resolve();
  assert.equal(ui.modalCalls,1); assert.equal(ui.dialog.open,false);
});
test('late arrival of older data cannot replace the newest popup', () => {
  const ui = popupHarness(); ui.update(battle([order(301000)]));
  ui.update(battle([order(1000),order(301000)]));
  assert.equal(ui.dialog.dataset.roundKey,'battle-1:301000'); assert.equal(ui.modalCalls,1);
});
test('changing battles discards the previous pending popup', async () => {
  const ui = popupHarness(); ui.block(); ui.update(battle([order(1000)]));
  ui.update(battle([],'battle-2'));
  ui.unblock(); await Promise.resolve();
  assert.equal(ui.modalCalls,0);
  ui.update(battle([order(1000)],'battle-2'));
  assert.equal(ui.dialog.dataset.roundKey,'battle-2:1000');
});

test('acknowledged recaps stay dismissed after refresh; new rounds still notify', () => {
  for (const action of ['知道了','×','查看完整战报','Escape']) {
    const storage = new Map(), ui = popupHarness(storage);
    ui.update(battle([order(1000)]));
    if (action === 'Escape') ui.dialog.dispatch('cancel'); else ui.dismiss(action);
    assert.equal(ui.dialog.open,false);
    const refreshed = popupHarness(storage);
    refreshed.update(battle([order(1000)]));
    assert.equal(refreshed.modalCalls,0);
    refreshed.update(battle([order(1000),order(301000)]));
    assert.equal(refreshed.modalCalls,1);
    assert.equal(refreshed.dialog.dataset.roundKey,'battle-1:301000');
  }
});

test('automatic battle switch does not mark an unseen recap acknowledged', () => {
  const storage = new Map(), ui = popupHarness(storage);
  ui.update(battle([order(1000)])); ui.update(battle([],'battle-2'));
  const refreshed = popupHarness(storage); refreshed.update(battle([order(1000)]));
  assert.equal(refreshed.modalCalls,1);
});

test('acknowledgement in another tab closes matching recap and drops deferred duplicates', async () => {
  const ui = popupHarness(); ui.update(battle([order(1000)]));
  ui.storageEvent('battle-1:1000'); assert.equal(ui.dialog.open,false);
  ui.block(); ui.update(battle([order(1000),order(301000)]));
  ui.storageEvent('battle-1:301000'); ui.unblock(); await Promise.resolve();
  assert.equal(ui.modalCalls,1);
});
