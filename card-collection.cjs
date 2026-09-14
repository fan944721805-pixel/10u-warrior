// Service-owned collection: one atomic document holds allowance, cards and receipts.
const fs=require('node:fs'),crypto=require('node:crypto');
const {atomicWriteJson}=require('./atomic-json');
const D=require('./public/card-lab-data'),Draws=require('./public/card-lab-draws');
const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,statusCode:status});};
const clone=value=>structuredClone(value);
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const card=c=>D.validCard(c)&&c.id.length>0&&integer(c.revision??0)&&typeof c.createdAt==='string'&&Number.isFinite(Date.parse(c.createdAt));
function validate(s){
 if(!s||s.version!=='COL-1'||!integer(s.revision)||!integer(s.clock)||!Array.isArray(s.cards)||s.cards.length>D.order.length||!s.cards.every(card)||new Set(s.cards.map(c=>c.id)).size!==s.cards.length||new Set(s.cards.map(c=>c.personaId)).size!==s.cards.length)fail('COLLECTION_CORRUPT',503);
 if(!s.budget||!integer(s.budget.remaining)||s.budget.remaining>Draws.CAP||(s.budget.remaining===Draws.CAP?s.budget.nextAt!==null:!integer(s.budget.nextAt)||s.budget.nextAt<=0))fail('COLLECTION_CORRUPT',503);
 if(s.pending!==null&&(!card(s.pending)||s.cards.some(c=>c.id===s.pending.id)||!s.cards.some(c=>c.personaId===s.pending.personaId)))fail('COLLECTION_CORRUPT',503);
 if(s.featuredId!==null&&!s.cards.some(c=>c.id===s.featuredId)&&s.pending?.id!==s.featuredId)fail('COLLECTION_CORRUPT',503);
 if(!s.receipts||typeof s.receipts!=='object'||Array.isArray(s.receipts)||Object.entries(s.receipts).some(([id,r])=>!id||!r||typeof r.fingerprint!=='string'||!integer(r.revision)||r.revision>s.revision||typeof r.action!=='string'))fail('COLLECTION_CORRUPT',503);
 return s;
}
function createCardCollection({file,now=Date.now,randomInt=crypto.randomInt,uuid=crypto.randomUUID,write=atomicWriteJson}={}){
 const timestamp=()=>{const value=now();if(!integer(value))fail('COLLECTION_CLOCK_INVALID',503);return value;};
 let initialized=false;
 let memory={version:'COL-1',revision:0,clock:timestamp(),cards:[],pending:null,featuredId:null,budget:Draws.initial(),receipts:{}};
 function load(){if(!file)return clone(memory);try{const s=validate(JSON.parse(fs.readFileSync(file,'utf8')));initialized=true;return s;}catch(e){if(e.code==='ENOENT'&&!initialized)return clone(memory);if(e.code==='COLLECTION_CORRUPT')throw e;fail('COLLECTION_STORAGE_UNAVAILABLE',503);}}
 function save(s){try{if(file)write(file,s);memory=clone(s);initialized=true;}catch{fail('COLLECTION_STORAGE_UNAVAILABLE',503);}}
 function current(){const s=load();s.clock=Math.max(s.clock,timestamp());s.budget=Draws.refill(s.budget,s.clock);return s;}
 function view(s){return clone({version:s.version,revision:s.revision,serverTime:s.clock,cards:s.cards,pending:s.pending,featuredId:s.featuredId,budget:s.budget});}
 function read(){const s=current();save(s);return view(s);}
 function transact(request){
  if(!request||typeof request.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(request.requestId)||!integer(request.revision)||!['draw','reroll','replace','discard','migrate'].includes(request.action))fail('COLLECTION_REQUEST_INVALID',400);
  const {action,cardId=null,pendingId=null,cardRevision=null,legacy=null}=request;
  const fingerprint=JSON.stringify({action,revision:request.revision,cardId,pendingId,cardRevision,legacy});
  const s=current(),prior=Object.hasOwn(s.receipts,request.requestId)?s.receipts[request.requestId]:null;
  if(prior){if(prior.fingerprint!==fingerprint)fail('COLLECTION_REQUEST_CONFLICT');save(s);return {...view(s),operation:clone(prior),replayed:true};}
  const migrationHash=action==='migrate'?crypto.createHash('sha256').update(JSON.stringify(legacy)).digest('hex'):null;
  if(action==='migrate'&&s.migrationHash===migrationHash)return {...view(s),replayed:true};
  if(request.revision!==s.revision)fail('COLLECTION_CHANGED');
  const at=new Date(s.clock).toISOString();let resultId;
  if(action==='migrate'){
   if(s.revision!==0||s.cards.length||s.pending)fail('COLLECTION_MIGRATION_CONFLICT');
   if(!legacy||!Array.isArray(legacy.cards))fail('COLLECTION_MIGRATION_INVALID',400);
   const imported={...s,cards:clone(legacy.cards),pending:clone(legacy.pending??null),featuredId:legacy.featuredId??null,budget:clone(legacy.budget)};
   try{validate(imported);}catch{fail('COLLECTION_MIGRATION_INVALID',400);}
   imported.budget=Draws.refill(imported.budget,s.clock);
   if(imported.budget.nextAt!==null)imported.budget.nextAt=Math.min(imported.budget.nextAt,s.clock+Draws.INTERVAL);
   Object.assign(s,{cards:imported.cards,pending:imported.pending,featuredId:imported.featuredId,budget:imported.budget,migrationHash});
   resultId=s.featuredId;
  }else if(action==='draw'||action==='reroll'){
   const budget=Draws.spend(s.budget,s.clock);if(!budget)fail('DRAW_COOLDOWN');
   if(action==='draw'){
    const persona=D.order[randomInt(D.order.length)],styles=D.personas[persona].styles;
    const next={...D.makeCard(persona,styles[randomInt(styles.length)],randomInt(0xffffffff),uuid()),createdAt:at,revision:0};
    if(!card(next)||s.cards.some(c=>c.id===next.id)||s.pending?.id===next.id)fail('CARD_GENERATION_FAILED',503);
    s.pending=s.cards.some(c=>c.personaId===next.personaId)?next:null;
    if(!s.pending)s.cards.unshift(next);
    s.featuredId=resultId=next.id;
   }else{
    const index=s.cards.findIndex(c=>c.id===cardId),original=s.cards[index];
    if(!original)fail('CARD_NOT_OWNED');if(!integer(cardRevision)||cardRevision!==(original.revision??0))fail('COLLECTION_CHANGED');
    const next=D.rerollCard(original,randomInt(0xffffffff));if(!card(next))fail('CARD_GENERATION_FAILED',503);
    s.cards[index]=next;resultId=next.id;
   }
   s.budget=budget;
  }else{
   const source=s.pending,target=s.cards.find(c=>c.id===cardId);
   if(!source||source.id!==pendingId||!target||target.personaId!==source.personaId||!integer(cardRevision)||cardRevision!==(target.revision??0))fail('COLLECTION_CHANGED');
   if(action==='replace')s.cards=s.cards.map(c=>c.id===target.id?{...source,id:target.id,createdAt:target.createdAt,revision:(target.revision??0)+1}:c);
   s.pending=null;s.featuredId=resultId=target.id;
  }
  s.revision++;const receipt={fingerprint,action,revision:s.revision,cardId:resultId,at:s.clock};Object.defineProperty(s.receipts,request.requestId,{value:receipt,enumerable:true,writable:true,configurable:true});
  validate(s);save(s);return {...view(s),operation:clone(receipt),replayed:false};
 }
 // Eagerly reject damaged storage. A missing file is initialized by the first read or mutation.
 function assertSelection(config){
  if(config.collectionRevision===undefined)return;
  const s=load();if(!integer(config.collectionRevision)||config.collectionRevision!==s.revision)fail('COLLECTION_CHANGED');
  if(!Array.isArray(config.agents)||!config.agents.length)fail('CARD_NOT_OWNED');
  const identity=c=>JSON.stringify([c.id,c.personaId,c.styleId,c.version,c.seed,c.attributeSeed??null,c.stats,c.revision??0]);
  for(const agent of config.agents){const owned=s.cards.find(c=>c.id===agent.sourceAgentId);if(!owned||!card(agent.cardSnapshot)||identity(owned)!==identity(agent.cardSnapshot))fail('CARD_NOT_OWNED');}
 }
 load();return {read,transact,assertSelection};
}
module.exports={createCardCollection};
