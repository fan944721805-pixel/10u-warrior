// Persisted CT-1 transitions. Only real settlements and completed decision
// rounds advance this state; reads, forecasts, failed calls and wall time do not.
const VERSION='CT-1';
const durations={snowball:2,stubborn:2,retreat:3,insight:2,cooldown:2,resonance:1};
const cooling={insight:5,cooldown:5,resonance:3};
const fail=()=>{throw Object.assign(Error('INVALID_CARD_TRAIT_STATE'),{code:'INVALID_CARD_TRAIT_STATE'});};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const object=o=>o&&typeof o==='object'&&!Array.isArray(o);
function restore(value){
 if(value==null)return {version:VERSION,serial:0,settlements:[],wins:0,losses:0,waits:0,protected:false,active:{},cooling:{},rounds:{},completedThrough:null};
 const s=structuredClone(value);
 if(s.version!==VERSION||!['serial','wins','losses','waits'].every(k=>integer(s[k]))||s.waits>3||typeof s.protected!=='boolean'||!Array.isArray(s.settlements)||s.settlements.some(id=>typeof id!=='string')||new Set(s.settlements).size!==s.settlements.length||s.completedThrough!==null&&!integer(s.completedThrough))fail();
 for(const [field,limits] of [['active',durations],['cooling',cooling]]){
  if(!object(s[field]))fail();
  for(const [id,item] of Object.entries(s[field]))if(!limits[id]||!object(item)||!integer(item.remaining)||item.remaining<1||item.remaining>limits[id]||!integer(item.serial)||item.serial>s.serial)fail();
 }
 if(!object(s.rounds))fail();
 for(const [slot,r] of Object.entries(s.rounds)){
  if(!integer(Number(slot))||s.completedThrough!==null&&Number(slot)<=s.completedThrough||!object(r)||!['wait','bet','paused'].includes(r.outcome))fail();
  for(const key of ['active','cooling'])if(!Array.isArray(r[key])||r[key].some(n=>!integer(n)||n>s.serial))fail();
 }
 return s;
}
function activate(s,id){
 if(s.active[id]||s.cooling[id])return false;
 s.active[id]={remaining:durations[id],serial:++s.serial};return true;
}
function end(s,id){
 if(!s.active[id])return;
 delete s.active[id];if(cooling[id])s.cooling[id]={remaining:cooling[id],serial:++s.serial};
}
function protect(s,netEquity,initial){
 if(netEquity>=initial*1.5)s.protected=true;else if(netEquity<initial*1.3)s.protected=false;
}
function settle(s,traits,{id,status,netProfit,netEquity,initial}){
 if(typeof id!=='string'||!id||!['WON','LOST','SPLIT'].includes(status)||![netProfit,netEquity,initial].every(Number.isFinite)||initial<=0)fail();
 if(s.settlements.includes(id))return false;
 s.settlements.push(id);protect(s,netEquity,initial);
 // Streaks use economic wins/losses. A neutral settlement breaks a streak;
 // its positive/negative return still counts as profit/loss for exit rules.
 const win=status==='WON'&&netProfit>0,loss=status==='LOST'&&netProfit<0;
 s.wins=win?s.wins+1:0;s.losses=loss?s.losses+1:0;
 if(netProfit<0)end(s,'snowball');
 if(netProfit>0){end(s,'stubborn');end(s,'retreat');}
 const has=id=>traits.includes(id);
 if(has('snowball')&&s.wins>=2)activate(s,'snowball');
 if(has('stubborn')&&s.losses>=2)activate(s,'stubborn');
 if(has('retreat')&&s.losses>=2)activate(s,'retreat');
 if(has('insight')&&s.wins>=3)activate(s,'insight');
 if(has('cooldown')&&netProfit>=initial*.1-1e-8)activate(s,'cooldown');
 return true;
}
function mark(s,traits,slot,outcome,{resonant=false}={}){
 if(!integer(slot)||!['wait','bet','paused'].includes(outcome))fail();
 if(s.completedThrough!==null&&slot<=s.completedThrough)return false;
 if(resonant&&traits.includes('resonance'))activate(s,'resonance');
 const before=JSON.stringify(s),r=s.rounds[slot]||{outcome,active:[],cooling:[]};
 if(outcome==='bet'||r.outcome!=='bet'&&outcome==='paused')r.outcome=outcome;
 for(const key of ['active','cooling'])r[key]=[...new Set([...r[key],...Object.values(s[key]).map(x=>x.serial)])];
 s.rounds[slot]=r;
 if(outcome==='bet')s.waits=0;
 return before!==JSON.stringify(s);
}
function complete(s,slots){
 let changed=false;
 for(const slot of [...new Set(slots)].sort((a,b)=>a-b)){
  if(!integer(slot))fail();
  const r=s.rounds[slot];if(!r)continue;
  // Snapshot serials prevent a late settlement's newly activated effect from
  // being consumed by a decision made before that settlement was observed.
  for(const [id,item] of Object.entries(s.cooling))if(r.cooling.includes(item.serial)&&!--item.remaining)delete s.cooling[id];
  for(const [id,item] of Object.entries(s.active))if(r.active.includes(item.serial)&&!--item.remaining)end(s,id);
  if(r.outcome==='wait')s.waits=Math.min(3,s.waits+1);
  else if(r.outcome==='bet')s.waits=0;
  delete s.rounds[slot];s.completedThrough=slot;changed=true;
 }
 return changed;
}
function effects(s,traits,{netEquity,initial,resonant=false}={}){
 const has=id=>traits.includes(id),active=id=>has(id)&&Boolean(s?.active[id]);
 const protectedNow=Number.isFinite(netEquity)&&initial>0&&(netEquity>=initial*1.5||s?.protected&&netEquity>=initial*1.3);
 return {version:VERSION,paused:active('cooldown'),
  urgeBonus:(active('stubborn')?10:0)+(active('insight')?10:0)+(has('waitFatigue')?(s?.waits||0)*5:0),
  stakeBonus:(active('snowball')?15:0)+(active('insight')?15:0),
  stakeMultiplier:(active('retreat')||has('protect')&&protectedNow)? .7 : 1,
  nextTier:has('resonance')&&resonant&&!s?.cooling.resonance,
  active:traits.filter(id=>active(id)||id==='protect'&&protectedNow),
  remaining:Object.fromEntries(Object.entries(s?.active||{}).map(([id,v])=>[id,v.remaining])),
  cooling:Object.fromEntries(Object.entries(s?.cooling||{}).map(([id,v])=>[id,v.remaining]))};
}
function strongResonance(snapshot,strategy){
 if(strategy!=='kzgMask')return false;
 const {ema:e,adx:a,donchian:d,takerFlow:f,longReturns:l}=snapshot||{};
 if(!e||!a||!d?.previous||!f||!l)return false;
 const side=d.close>d.upper&&d.previous.close>d.previous.upper?1:d.close<d.lower&&d.previous.close<d.previous.lower?-1:0;
 return Boolean(side&&a.adx>=25&&snapshot.volumeRatio>=1.3&&snapshot.atr?.percent<=.8&&Math.sign(e.ema5-e.ema20)===side&&Math.sign(a.plusDI-a.minusDI)===side&&l.fifteenMinutes*side>0&&l.sixtyMinutes*side>0&&(f.buyRatio-.5)*side>=.1&&snapshot.spotOrderBookImbalance*side>=.15);
}
module.exports={VERSION,restore,settle,mark,complete,effects,strongResonance};
