const initialCards=require('./fixtures/cards.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../public/card-collection'),{createCardCollection}=require('../card-collection.cjs'),D=require('../public/card-lab-data');
const key='warrior-single-card-concept-v2';
function storage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
function setup(store=storage(),api=createCardCollection({now:()=>1800000000000})){let n=0;const request=async(path,body)=>body?api.transact(body):api.read();return {api,store,request,options:{storage:store,request,data:D,clock:()=>100,uuid:()=>`client-operation-${++n}`}};}

test('local cards and a pending duplicate migrate once with exact source backup and no additional charge',async()=>{
 const f=setup(),old={cards:initialCards,roster:['sample-kzg'],featured:initialCards[1],pendingDraw:D.makeCard('kzgMask','wild',44,'pending-old-card')};
 f.store.setItem(key,JSON.stringify(old));f.store.setItem(key+'-draws',JSON.stringify({remaining:2,nextAt:1800000500000}));
 const client=create(f.options);assert.equal(await client.refresh(),true);const s=client.snapshot();assert.equal(s.data.cards.length,6);assert.equal(s.data.pending.id,'pending-old-card');assert.equal(s.data.budget.remaining,2);
 assert.equal(JSON.parse(f.store.getItem(key+'-service-backup')).collection,JSON.stringify(old));assert.equal(f.store.getItem(key),JSON.stringify(old));
 assert.equal(await create(f.options).refresh(),true);assert.equal(f.api.read().revision,1);
});

test('uncertain draw survives reload and retries the same receipt without another draw',async()=>{
 const f=setup();let lost=true;const client=create({...f.options,request:async(path,body)=>{const value=await f.request(path,body);if(body&&lost){lost=false;throw Error('CONNECTION_LOST');}return value;}});
 assert.equal(await client.refresh(),true);await assert.rejects(client.mutate('draw'));assert.ok(client.snapshot().pending);assert.equal(f.api.read().budget.remaining,4);
 await assert.rejects(client.mutate('draw'),{code:'COLLECTION_UNCONFIRMED'});
 const reopened=create(f.options);assert.equal(await reopened.refresh({retry:true}),true);assert.equal(reopened.snapshot().pending,null);assert.equal(reopened.snapshot().data.budget.remaining,4);assert.equal(reopened.snapshot().data.cards.length,1);
});

test('stale revision clears only the rejected request and requires refresh before any new action',async()=>{
 const f=setup(),client=create(f.options);await client.refresh();f.api.transact({action:'draw',revision:0,requestId:'other-client-draw'});
 await assert.rejects(client.mutate('draw'),{code:'COLLECTION_CHANGED'});assert.equal(client.snapshot().pending,null);assert.equal(client.snapshot().status,'error');await client.refresh();assert.equal(client.snapshot().data.budget.remaining,4);
});

test('corrupt legacy or recovery storage blocks draws and keeps the original source',async()=>{
 const f=setup();f.store.setItem(key,'not-json');const client=create(f.options);assert.equal(await client.refresh(),false);assert.equal(client.snapshot().error,'COLLECTION_MIGRATION_INVALID');assert.equal(f.store.getItem(key),'not-json');assert.equal(f.api.read().cards.length,0);
 const g=setup();g.store.setItem('warrior-card-collection-pending','not-json');const bad=create(g.options);assert.equal(await bad.refresh({retry:true}),false);assert.equal(bad.snapshot().error,'COLLECTION_PENDING_INVALID');
});

test('client countdown uses service time plus monotonic elapsed time and never grants quota locally',async()=>{
 const f=setup();let elapsed=100;const c=create({...f.options,clock:()=>elapsed});await c.refresh();await c.mutate('draw');elapsed+=99999999;assert.equal(c.time(),1800000000000+99999999);assert.equal(c.snapshot().data.budget.remaining,4);
});


test('another client cannot overwrite an unresolved outbox request; closing its tab does not lose recovery',async()=>{
 const f=setup(),a=create({...f.options,uuid:()=> 'client-one-request',request:async(path,body)=>{const result=await f.request(path,body);if(body)throw Error('RESPONSE_LOST');return result;}}),b=create({...f.options,uuid:()=> 'client-two-request'});
 await a.refresh();await b.refresh();await assert.rejects(a.mutate('draw'));await assert.rejects(b.mutate('draw'),{code:'COLLECTION_UNCONFIRMED'});
 assert.equal(f.api.read().budget.remaining,4);assert.equal(await b.refresh({retry:true}),true);assert.equal(b.snapshot().pending,null);assert.equal(b.snapshot().data.budget.remaining,4);
});

test('a conflicting local import can explicitly keep service cards without deleting its backup',async()=>{
 const f=setup();f.api.transact({action:'draw',revision:0,requestId:'existing-service-card'});f.store.setItem(key,JSON.stringify({cards:initialCards}));
 const c=create(f.options);assert.equal(await c.refresh(),false);assert.equal(c.snapshot().error,'COLLECTION_MIGRATION_CONFLICT');const before=f.api.read().cards;
 assert.equal(await c.useService(),true);assert.deepEqual(c.snapshot().data.cards,before);assert.ok(f.store.getItem(key+'-service-backup'));assert.ok(f.store.getItem(key));
});
