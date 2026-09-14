const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../public/card-battles');
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const battle=id=>({id,name:id,createdAt:1,config:{initialBalance:10},agents:[{cash:10,equity:10,orders:[]}]});
test('an uncertain create retries the persisted request after reload, without a second request identity',async()=>{
 const saved=storage(),calls=[],config={agents:[{id:'card-1'}]};let first=true;
 const api={create:async(...args)=>{calls.push(args);if(first){first=false;throw Error('lost response');}return battle('created');}};
 const a=create({api,storage:saved,uuid:()=> 'request-1'});
 await assert.rejects(a.start('第一局',config));assert.ok(a.snapshot().pending);
 const b=create({api,storage:saved,uuid:()=> 'MUST-NOT-USE'});await b.start('different',{});
 assert.deepEqual(calls[0],calls[1]);assert.equal(b.snapshot().battle.id,'created');assert.equal(b.snapshot().pending,null);
});
test('busy clicks do not create twice and a known validation error allows correcting the form',async()=>{
 let release,count=0;const api={create:()=>{count++;return new Promise(r=>release=r);}};
 const client=create({api,storage:storage(),uuid:()=> 'request-1'});
 const first=client.start('one',{agents:[{}]});assert.equal(await client.start('two',{}),null);release(battle('one'));await first;assert.equal(count,1);
 const invalid=create({api:{create:async()=>{throw Object.assign(Error('invalid'),{status:422});}},storage:storage(),uuid:()=> 'request-2'});
 await assert.rejects(invalid.start('invalid',{agents:[{}]}));assert.equal(invalid.snapshot().pending,null);
});
test('selection reads saved ledgers, stale responses cannot overwrite a new selection, failures keep labelled prior data',async()=>{
 const saved=storage();let release,fail=false;
 const api={list:async()=>({battles:[battle('a'),battle('b')]}),report:async id=>{if(fail)throw Error('offline');if(id==='a')return new Promise(r=>release=r);return battle(id);}};
 const client=create({api,storage:saved});const earlier=client.refresh('a');await new Promise(r=>setImmediate(r));await client.refresh('b');release(battle('a'));await earlier;
 assert.equal(client.snapshot().battle.id,'b');fail=true;await client.refresh();assert.equal(client.snapshot().status,'error');assert.equal(client.snapshot().battle.id,'b');
});
test('damaged pending request cannot become a fresh default battle',async()=>{
 const saved=storage();saved.setItem('warrior-card-pending-creation','{"name":"old"}');let calls=0;
 const client=create({api:{create:()=>calls++},storage:saved});await assert.rejects(client.start('new',{}),/BATTLE_PENDING_INVALID/);assert.equal(calls,0);
});
