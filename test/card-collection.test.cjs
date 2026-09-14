const initialCards=require('./fixtures/cards.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createCardCollection}=require('../card-collection.cjs'),D=require('../public/card-lab-data'),Draws=require('../public/card-lab-draws');
function fixture(){let time=1800000000000,n=0,persona=0;const dir=fs.mkdtempSync(path.join(os.tmpdir(),'collection-')),file=path.join(dir,'cards.json');const options={file,now:()=>time,randomInt:max=>max===D.order.length?persona:123%max,uuid:()=>`issued-card-${++n}`};return {file,options,close:()=>fs.rmSync(dir,{recursive:true,force:true}),time:value=>time=value,advance:n=>time+=n,persona:i=>persona=i};}
const request=(s,action,extra={})=>({requestId:`operation-${s.revision+1}`,revision:s.revision,action,...extra});

test('server allowance starts empty of cards, refills using saved service time and survives reload',()=>{
 const f=fixture();try{let api=createCardCollection(f.options),s=api.read();assert.equal(s.cards.length,0);assert.equal(s.budget.remaining,5);
 for(let n=0;n<5;n++){f.persona(n);s=api.transact(request(s,'draw'));}
 assert.equal(s.cards.length,5);assert.equal(s.budget.remaining,0);assert.throws(()=>api.transact(request(s,'draw')),{code:'DRAW_COOLDOWN'});
 f.advance(Draws.INTERVAL*2+1);s=api.read();assert.equal(s.budget.remaining,2);const next=s.budget.nextAt;
 f.time(1);s=createCardCollection(f.options).read();assert.equal(s.budget.remaining,2);assert.equal(s.budget.nextAt,next);
 f.time(next+Draws.INTERVAL*10);s=api.read();assert.deepEqual(s.budget,{remaining:5,nextAt:null});
 }finally{f.close();}
});

test('duplicate draw is pending; replacement preserves identity and charges no additional allowance',()=>{
 const f=fixture();try{const api=createCardCollection(f.options);let s=api.read();s=api.transact(request(s,'draw'));const old=structuredClone(s.cards[0]);s=api.transact(request(s,'draw'));const pending=s.pending;
 assert.equal(s.cards.length,1);assert.deepEqual(s.cards[0],old);assert.equal(s.budget.remaining,3);
 const replace=request(s,'replace',{pendingId:pending.id,cardId:old.id,cardRevision:old.revision});s=api.transact(replace);
 assert.equal(s.pending,null);assert.equal(s.cards[0].id,old.id);assert.equal(s.cards[0].createdAt,old.createdAt);assert.equal(s.cards[0].revision,1);assert.equal(s.budget.remaining,3);
 const replay=createCardCollection(f.options).transact(replace);assert.equal(replay.replayed,true);assert.equal(replay.revision,s.revision);
 }finally{f.close();}
});

test('idempotent retries return current state without redrawing; stale clients and reused IDs cannot overwrite',()=>{
 const f=fixture();try{const a=createCardCollection(f.options),b=createCardCollection(f.options);let s=a.read();const r=request(s,'draw');s=a.transact(r);const once=structuredClone(s);
 assert.throws(()=>b.transact({...r,requestId:'other-request'}),{code:'COLLECTION_CHANGED'});
 assert.throws(()=>a.transact({...r,action:'reroll'}),{code:'COLLECTION_REQUEST_CONFLICT'});
 f.persona(1);s=b.transact(request(s,'draw'));const replay=a.transact(r);assert.equal(replay.replayed,true);assert.equal(replay.revision,s.revision);assert.deepEqual(replay.cards,s.cards);assert.equal(replay.operation.cardId,once.operation.cardId);assert.equal(replay.budget.remaining,3);
 }finally{f.close();}
});

test('attribute refresh spends one chance, changes only attributes and revision; discarding a duplicate keeps ownership',()=>{
 const f=fixture();try{const api=createCardCollection(f.options);let s=api.transact(request(api.read(),'draw')),c=structuredClone(s.cards[0]);
 s=api.transact(request(s,'reroll',{cardId:c.id,cardRevision:0}));assert.equal(s.budget.remaining,3);assert.notDeepEqual(s.cards[0].stats,c.stats);
 for(const key of ['id','personaId','styleId','seed','createdAt','version'])assert.equal(s.cards[0][key],c[key]);assert.equal(s.cards[0].revision,1);
 s=api.transact(request(s,'draw'));c=structuredClone(s.cards[0]);s=api.transact(request(s,'discard',{cardId:c.id,cardRevision:c.revision,pendingId:s.pending.id}));assert.deepEqual(s.cards[0],c);assert.equal(s.pending,null);assert.equal(s.budget.remaining,2);
 }finally{f.close();}
});

test('storage and generation failure never debit quota, and damaged or deleted storage cannot reset the collection',()=>{
 const f=fixture();try{let failWrite=false;const {atomicWriteJson}=require('../atomic-json');const api=createCardCollection({...f.options,write:(...args)=>{if(failWrite)throw Error('DISK_FULL');atomicWriteJson(...args);}});const initial=api.read(),r=request(initial,'draw');failWrite=true;
 assert.throws(()=>api.transact(r),{code:'COLLECTION_STORAGE_UNAVAILABLE'});assert.equal(createCardCollection(f.options).read().budget.remaining,5);
 failWrite=false;const s=api.transact(r);assert.equal(s.budget.remaining,4);
 fs.unlinkSync(f.file);assert.throws(()=>api.read(),{code:'COLLECTION_STORAGE_UNAVAILABLE'});
 fs.writeFileSync(f.file,JSON.stringify({...s,clock:s.serverTime,budget:{remaining:10,nextAt:null},receipts:{}}));assert.throws(()=>createCardCollection(f.options),{code:'COLLECTION_CORRUPT'});
 }finally{f.close();}
 const broken=createCardCollection({randomInt:()=>{throw Error('RNG_FAILED');}}),s=broken.read();assert.throws(()=>broken.transact(request(s,'draw')),/RNG_FAILED/);assert.equal(broken.read().budget.remaining,5);
});


test('formal HTTP collection persists draws and rejects foreign-origin mutations and stale revisions',async()=>{
 const f=fixture();let server;
 try{const {createWarriorServer}=require('../server');server=createWarriorServer({paperFile:null,collectionFile:f.file,now:f.options.now,walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`,get=()=>fetch(base+'/api/cards/collection'),post=(body,origin=base)=>fetch(base+'/api/cards/action',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
 let response=await get(),s=await response.json();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const r=request(s,'draw');response=await post(r,'https://unrelated.example');assert.equal(response.status,403);
 response=await post(r);assert.equal(response.status,200);s=await response.json();assert.equal(s.budget.remaining,4);assert.equal(s.cards.length,1);
 assert.equal((await (await post(r)).json()).replayed,true);assert.equal((await post({...r,requestId:'stale-client'})).status,409);
 assert.deepEqual(createCardCollection(f.options).read().cards,s.cards);
 }finally{if(server)await new Promise(r=>server.close(r));f.close();}
});


test('legacy import preserves valid snapshots once, replays identical imports and refuses conflicting ownership',()=>{
 const api=createCardCollection({now:()=>1800000000000}),legacy={cards:initialCards,pending:null,featuredId:initialCards[0].id,budget:{remaining:1,nextAt:1800000000010}};
 const r={requestId:'legacy-client-one',revision:0,action:'migrate',legacy};const s=api.transact(r);assert.deepEqual(s.cards,initialCards);assert.equal(s.budget.remaining,1);
 assert.equal(api.transact({...r,requestId:'legacy-client-two'}).replayed,true);assert.equal(api.read().revision,1);
 assert.throws(()=>api.transact({...r,requestId:'legacy-client-other',revision:1,legacy:{...legacy,cards:[]}}),{code:'COLLECTION_MIGRATION_CONFLICT'});
});


test('collection-backed setup refuses stale or substituted card snapshots but keeps history independent',()=>{
 const api=createCardCollection(),s=api.transact({action:'draw',revision:0,requestId:'setup-owned-card'}),owned=s.cards[0];
 const config={collectionRevision:s.revision,agents:[{sourceAgentId:owned.id,cardSnapshot:owned}]};assert.doesNotThrow(()=>api.assertSelection(config));
 assert.throws(()=>api.assertSelection({...config,agents:[{sourceAgentId:owned.id,cardSnapshot:D.makeCard('smart','precise',888,owned.id)}]}),{code:'CARD_NOT_OWNED'});
 api.transact({action:'reroll',revision:s.revision,cardId:owned.id,cardRevision:owned.revision,requestId:'setup-card-reroll'});assert.throws(()=>api.assertSelection(config),{code:'COLLECTION_CHANGED'});
});
