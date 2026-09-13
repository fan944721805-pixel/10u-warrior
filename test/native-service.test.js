const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs');
const { create } = require('../public/native-service-client');
const { install } = require('../public/runtime-scheduler');
const { storageBridge, fixture, loadRuntime } = require('./fixtures/mobile-runtime.cjs');

test('native timer cancellation, repeat and callback arguments do not depend on page visibility', () => {
  const native = new Map(), page = { document: { hidden: true } };
  const scheduler = install({ schedule:(id,delay,repeat)=>native.set(id,{delay,repeat}), cancel:id=>native.delete(id) }, page);
  let count = 0;
  const once = page.setTimeout(n => { count += n; }, 10, 3);
  scheduler.fire(once); scheduler.fire(once); assert.equal(count, 3);
  const repeat = page.setInterval(() => count++, 1000);
  scheduler.fire(repeat); scheduler.fire(repeat); assert.equal(count,5);
  page.clearInterval(repeat); scheduler.fire(repeat); assert.equal(count,5);
  const cancelled = page.setTimeout(()=>count++,0); page.clearTimeout(cancelled); scheduler.fire(cancelled);
  assert.equal(count,5); assert.equal(native.has(repeat),false);
});

test('two UI clients share one service ledger; leaving/reloading UI does not pause or duplicate bets', async () => {
  const storage = storageBridge(), f = fixture(), runtime = loadRuntime(storage, f);
  const clients = new Set(), replies = new Map(), events = [];
  let next = 0, activeDemand;
  const context = vm.createContext({ window:null, crypto:require('node:crypto').webcrypto, console, setTimeout, clearTimeout, setInterval:()=>0, clearInterval,
    WarriorNativeScheduler:{install:()=>({fire(){}})},
    WarriorMobileRuntime:{create:()=>runtime},
    Warrior:{createPriceStream:()=>({start(){},stop(){}})},
    WarriorServiceNative:{
      demand:(active,open)=>{activeDemand={active,open};}, ready(){}, failed:code=>{throw Error(code);},
      reply:(id,raw)=>{replies.get(id)(JSON.parse(raw));replies.delete(id);},
      event:(name,raw)=>{events.push(name);for(const handlers of clients)handlers[name]?.(JSON.parse(raw));},
    }, addEventListener(){} });
  context.window=context;
  vm.runInContext(fs.readFileSync(require.resolve('../public/runtime-host.js'),'utf8'),context);
  function plugin() {
    const handlers={};clients.add(handlers);
    return { addListener:async(name,fn)=>{handlers[name]=fn;return {remove:()=>delete handlers[name]};},
      invoke:({method,args})=>new Promise(resolve=>{const id=++next;replies.set(id,resolve);void context.WarriorServiceHost.dispatch(id,method,args);}),
      status:async()=>({ready:true}) };
  }
  const ui1=create(plugin()),ui2=create(plugin());
  const config={initialBalance:100,rounds:10,period:'5m',agents:[{id:'A',strategy:'czBrother',coin:'BNB',maxStakePct:10}]};
  const battle=await ui1.api.create('Keep custom 名称',config,'background-shared-1');
  assert.equal((await ui2.api.create('Keep custom 名称',config,'background-shared-1')).id,battle.id);
  assert.equal(ui1.api.release(battle.id),false);
  await ui1.api.dispose();
  await runtime.api.tick();f.setTime(1800000000000);await runtime.api.tick();
  const snapshot=await ui2.api.report(battle.id);
  assert.equal(snapshot.agents[0].orders.length,1);assert.equal(snapshot.enabled,true);
  assert.equal(snapshot.name,'Keep custom 名称');assert.ok(events.includes('simulation'));
  // The notification action uses the same control path and retains unsettled orders.
  await plugin().invoke({method:'pauseAll',args:[]});
  assert.equal((await ui2.api.report(battle.id)).enabled,false);
  assert.deepEqual(activeDemand,{active:0,open:1});
  await runtime.api.tick();assert.equal((await ui2.api.report(battle.id)).agents[0].orders.length,1);
  await ui2.api.dispose();
});

test('price subscription survives UI stop, and native failures never fall back to a new local runtime', async () => {
  let receiver, calls=[];
  const plugin={addListener:async(name,fn)=>{if(name==='price')receiver=fn;return{remove(){}};},
    invoke:async({method,args})=>{calls.push(method);return{ok:true,value:{symbol:args[0],status:'live'}};}};
  const client=create(plugin);const updates=[];
  const stream=client.api.createPriceStream({onUpdate:q=>updates.push(q)});
  stream.start('BTCUSDT');await new Promise(setImmediate);
  receiver({symbol:'BTCUSDT',status:'live',quote:{price:100}});assert.equal(updates.length,1);
  stream.stop();receiver({symbol:'BTCUSDT',status:'live',quote:{price:101}});assert.equal(updates.length,1);
  assert.deepEqual(calls,['watchPrice']);
  plugin.invoke=async()=>({ok:false,code:'MOBILE_STORAGE_FAILED'});
  await assert.rejects(client.api.list(),{code:'MOBILE_STORAGE_FAILED'});
  await client.api.dispose();assert.throws(()=>create(null),{code:'MOBILE_SERVICE_UNAVAILABLE'});
});
