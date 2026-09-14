/* Collection client: the service owns cards and allowance; local storage holds recovery requests only. */
((root)=>{
 const key='warrior-single-card-concept-v2',pendingKey='warrior-card-collection-pending',ackKey='warrior-card-collection-migrated',outboxPrefix='warrior-card-collection-request-';
 const fail=code=>Object.assign(Error(code),{code});
 function create({request,storage,data,onChange=()=>{},uuid=()=>crypto.randomUUID(),clock=()=>performance.now()}){
  let view={status:'idle',data:null,busy:false,error:null,pending:null},generation=0,receivedAt=0;
  let pendingStorageKey=null;
  function recover(){
   if(view.pending)return;
   const keys=[pendingKey];for(let i=0;i<(storage.length||0);i++){const k=storage.key(i);if(k?.startsWith(outboxPrefix))keys.push(k);}
   for(const k of keys){const raw=storage.getItem(k);if(!raw)continue;let p;try{p=JSON.parse(raw);}catch{throw fail('COLLECTION_PENDING_INVALID');}
    if(!p||typeof p.requestId!=='string'||!Number.isSafeInteger(p.revision)||!['draw','reroll','replace','discard','migrate'].includes(p.action))throw fail('COLLECTION_PENDING_INVALID');
    view.pending=p;pendingStorageKey=k;break;}
  }
  function enqueue(p){recover();if(view.pending)throw fail('COLLECTION_UNCONFIRMED');const k=outboxPrefix+p.requestId;storage.setItem(k,JSON.stringify(p));pendingStorageKey=k;view.pending=p;}
  function clearPending(){storage.removeItem(pendingStorageKey);view.pending=null;pendingStorageKey=null;}
  try{recover();}catch{view.status='error';view.error='COLLECTION_PENDING_INVALID';}
  const snapshot=()=>structuredClone(view),emit=()=>onChange(snapshot());
  function accept(s){
   if(s?.version!=='COL-1'||!Number.isSafeInteger(s.revision)||!Number.isFinite(s.serverTime)||!Array.isArray(s.cards)||!s.cards.every(data.validCard)||!Number.isInteger(s.budget?.remaining)||s.budget.remaining<0||s.budget.remaining>5||s.pending&&!data.validCard(s.pending))throw fail('COLLECTION_DATA_INVALID');
   if(view.data&&s.revision<view.data.revision)return;
   view.data=structuredClone(s);receivedAt=clock();view.status='ready';view.error=null;
  }
  function legacy(){
   if(storage.getItem(ackKey))return null;
   const raw=storage.getItem(key);if(raw===null)return null;
   const budgetRaw=storage.getItem(key+'-draws');
   // Keep the exact source, including duplicate personas, before normalizing anything.
   if(storage.getItem(key+'-service-backup')===null)storage.setItem(key+'-service-backup',JSON.stringify({collection:raw,budget:budgetRaw}));
   let saved,budget;try{saved=JSON.parse(raw);budget=budgetRaw===null?{remaining:5,nextAt:null}:JSON.parse(budgetRaw);}catch{throw fail('COLLECTION_MIGRATION_INVALID');}
   if(!saved||!Array.isArray(saved.cards)||!saved.cards.every(data.validCard))throw fail('COLLECTION_MIGRATION_INVALID');
   const rank=id=>{const i=saved.roster?.indexOf(id)??-1;return i<0?Infinity:i;},groups=new Map();
   for(const c of saved.cards){if(saved.removedCards?.[c.id])continue;const prior=groups.get(c.personaId);if(!prior||rank(c.id)<rank(prior.id)||rank(c.id)===rank(prior.id)&&Date.parse(c.createdAt)>Date.parse(prior.createdAt))groups.set(c.personaId,c);}
   const cards=[...groups.values()],pending=saved.pendingDraw??null;
   if(pending&&(!data.validCard(pending)||!cards.some(c=>c.personaId===pending.personaId)||cards.some(c=>c.id===pending.id)))throw fail('COLLECTION_MIGRATION_INVALID');
   const featuredId=pending?.id??cards.find(c=>c.id===saved.featured?.id)?.id??cards[0]?.id??null;
   return {cards,pending,featuredId,budget};
  }
  async function sendPending(){
   const pending=view.pending;if(!pending)throw fail('COLLECTION_REQUEST_INVALID');
   try{
    const result=await request('/api/cards/action',pending);accept(result);
    if(pending.action==='migrate')storage.setItem(ackKey,'COL-1');
    clearPending();return result;
   }catch(e){
    if([400,403,404,409,422].includes(e.status??e.statusCode)){
     try{clearPending();}catch{}
     if(pending.action==='migrate'&&[409,422].includes(e.status??e.statusCode))throw fail('COLLECTION_MIGRATION_CONFLICT');
    }
    throw e;
   }
  }
  async function refresh({retry=false}={}){
   if(view.busy||view.error==='COLLECTION_PENDING_INVALID')return false;
   view.busy=true;const version=++generation;if(!view.data)view.status='loading';emit();
   try{
    recover();if(view.pending){if(!retry)throw fail('COLLECTION_UNCONFIRMED');await sendPending();}
    else{const s=await request('/api/cards/collection');if(version!==generation)return false;accept(s);const source=legacy();if(source){const pending={action:'migrate',legacy:source,revision:s.revision,requestId:uuid()};enqueue(pending);emit();await sendPending();}}
    return true;
   }catch(e){view.status='error';view.error=e.code||'COLLECTION_UNAVAILABLE';return false;}
   finally{view.busy=false;emit();}
  }
  async function mutate(action,details={}){
   if(view.busy)return null;
   if(view.pending||view.status!=='ready')throw fail('COLLECTION_UNCONFIRMED');
   view.busy=true;generation++;
   try{const pending={...details,action,revision:view.data.revision,requestId:uuid()};enqueue(pending);emit();return await sendPending();}
   catch(e){view.status='error';view.error=e.code||'COLLECTION_UNAVAILABLE';throw e;}
   finally{view.busy=false;emit();}
  }
  async function useService(){if(view.busy||view.pending||!['COLLECTION_MIGRATION_INVALID','COLLECTION_MIGRATION_CONFLICT'].includes(view.error))return false;storage.setItem(ackKey,'COL-1');return refresh();}
  return {snapshot,refresh,mutate,useService,time:()=>view.data?view.data.serverTime+Math.max(0,clock()-receivedAt):null};
 }
 const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.WarriorCardCollection=api;
})(globalThis);
