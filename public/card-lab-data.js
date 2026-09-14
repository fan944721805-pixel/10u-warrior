/* Shared deterministic card definitions. No network or ledger side effects. */
((root, catalog) => {
  const original=catalog.profiles;
  const order=['kzgMask','liangXi','diviner','czBrother','sunBrother','showoff','contrarian','fengShui','aggressive','smart','conservative','trendFollowing','meanReversion','breakout','orderFlow','volatilityGuard','consensus','priceAction','firstLady'];
  const assets={sunBrother:'sun-brother-blond-v2',kzgMask:'kzg-mask-bro-concept-lavender',liangXi:'liang-xi-lavender',diviner:'diviner',czBrother:'cz-brother-v2-lavender',showoff:'showoff-lavender',contrarian:'contrarian-lavender',fengShui:'feng-shui-master',aggressive:'../delivery-rider-avatar',smart:'super-ai',conservative:'miser',trendFollowing:'trend-chaser',meanReversion:'bottom-top-hunter',breakout:'rocket-bro',orderFlow:'whale-detective',volatilityGuard:'steady-dog',consensus:'six-vote-warrior',priceAction:'candlestick-bro',firstLady:'first-lady-lavender'};
  const ranges={sunBrother:[[25,85],[15,65],[15,65]],liangXi:[[25,95],[75,100],[15,75]],aggressive:[[60,100],[60,100],[50,100]],smart:[[35,85],[5,45],[20,75]],conservative:[[10,50],[30,80],[5,35]],trendFollowing:[[35,85],[30,85],[15,65]],meanReversion:[[25,75],[45,95],[10,55]],breakout:[[35,90],[40,90],[20,75]],orderFlow:[[35,90],[15,60],[15,65]],volatilityGuard:[[10,50],[0,20],[0,30]],consensus:[[30,75],[5,45],[10,50]],priceAction:[[50,100],[25,80],[40,95]],czBrother:[[35,85],[10,50],[15,65]],firstLady:[[55,95],[25,75],[30,80]],showoff:[[45,95],[40,95],[35,85]],contrarian:[[25,80],[10,60],[10,60]],diviner:[[30,85],[15,70],[25,80]],fengShui:[[25,80],[10,55],[20,70]],kzgMask:[[20,75],[10,50],[10,50]]};
  const styles={inverse:{delta:[0,0,0],traits:['inverse','patient','rethink'],color:'tech'},wild:{delta:[40,20,30],traits:['eager','snowball','stubborn'],color:'wild'},patient:{delta:[-15,-10,-15],traits:['patient','rethink'],color:'calm'},sniper:{delta:[-10,-5,-10],traits:['confirm','patient','rethink'],color:'tech'},chase:{delta:[15,5,10],traits:['confirm','eager'],color:'wild'},cautious:{delta:[-15,-10,-10],traits:['patient','retreat'],color:'calm'},stubborn:{delta:[10,10,10],traits:['stubborn','rethink'],color:'wild'},precise:{delta:[-5,-5,-5],traits:['confirm','protect'],color:'tech'},trend:{delta:[0,0,-5],traits:['confirm','patient'],color:'tech'},original:{delta:[0,0,0],traits:['core'],color:'calm'}};
  // CT-1 is the executable trait contract. Legacy lists above remain immutable
  // for historical schema 1/2 hashes; new battles and collection previews use this.
  function traitsFor(card,version='CT-1'){
    if(version==='CT-0')return [...styles[card.styleId].traits];
    if(version!=='CT-1')throw new Error('CARD_TRAITS_VERSION_INVALID');
    const list={wild:['eager','snowball','insight'],patient:['patient','rethink','waitFatigue'],sniper:['confirm','patient'],chase:['confirm','eager','waitFatigue'],cautious:['patient','retreat','cooldown'],stubborn:['rethink','stubborn'],precise:['confirm','protect'],trend:['confirm','patient'],inverse:['inverse','patient','rethink'],original:['core']}[card.styleId];
    if(!list)throw new Error('Invalid card style');
    return card.personaId==='kzgMask'&&['sniper','trend'].includes(card.styleId)?[...list,'resonance']:[...list];
  }
  const compatible={sunBrother:['inverse'],liangXi:['wild','patient'],aggressive:['wild','chase'],smart:['sniper','precise'],conservative:['cautious','precise'],trendFollowing:['chase','trend'],meanReversion:['patient','stubborn'],breakout:['chase','sniper'],orderFlow:['chase','sniper'],volatilityGuard:['cautious','precise'],consensus:['cautious','precise'],priceAction:['wild','sniper'],czBrother:['chase','trend'],firstLady:['chase','trend'],showoff:['stubborn','sniper'],contrarian:['precise','sniper'],diviner:['cautious','chase'],fengShui:['cautious','chase'],kzgMask:['sniper','chase','trend','wild']};
  const sourceFor=id=>['diviner','fengShui'].includes(id)?'oracle':['showoff','contrarian'].includes(id)?'peers':'technical';
  const personas=Object.fromEntries(order.map(id=>{
    const p=original[id]||{label:'KZG口罩哥',enLabel:'KZG Mask Bro',actionUrge:35,emotionSensitivity:25,variance:20,maxStakePct:20,required:['ema','adx','longReturns','candles','donchian','volume','takerFlow','orderbook','atr','spread','odds']};
    return [id,{id,label:p.label,enLabel:p.enLabel,base:[p.actionUrge,p.emotionSensitivity,p.variance],ranges:ranges[id],styles:compatible[id],source:sourceFor(id),image:'strategy-icons/'+assets[id]+'.png',required:[...p.required],cap:p.maxStakePct}];
  }));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function makeCard(personaId,styleId,seed=1,id){
    const p=personas[personaId];if(!p||!styles[styleId]||styleId!=='original'&&!p.styles.includes(styleId))throw new Error('Invalid concept card');
    let state=seed>>>0;const next=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
    const stats=p.base.map((v,i)=>styleId==='original'?v:clamp(v+styles[styleId].delta[i]+(seed===0?0:Math.floor(next()*7)-3),...p.ranges[i]));
    return {id:id||'card-'+personaId+'-'+styleId+'-'+seed,personaId,styleId,seed,stats,version:'UI-2.0',createdAt:new Date().toISOString()};
  }
  function draw(){
    const values=new Uint32Array(3);crypto.getRandomValues(values);
    const p=personas[order[values[0]%order.length]];
    return makeCard(p.id,p.styles[values[1]%p.styles.length],values[2],crypto.randomUUID());
  }
  function validCard(c){
    if(!c||typeof c.id!=='string'||c.id.length>100||!personas[c.personaId]||!styles[c.styleId]||!Number.isInteger(c.seed)||c.version!=='UI-2.0')return false;
    try{const original=makeCard(c.personaId,c.styleId,c.seed);if(c.attributeSeed!==undefined&&(!Number.isInteger(c.attributeSeed)||c.attributeSeed<0||c.attributeSeed>0xffffffff))return false;return JSON.stringify(c.attributeSeed===undefined?original.stats:attributeStats(c.personaId,c.attributeSeed))===JSON.stringify(c.stats);}catch{return false;}
  }
  function attributeStats(personaId,seed){
    let value=seed>>>0;
    return personas[personaId].ranges.map(([min,max])=>{value=(Math.imul(1664525,value)+1013904223)>>>0;return min+Math.floor(value/4294967296*(max-min+1));});
  }
  function rerollCard(c,seed){
    if(!validCard(c))throw new Error('Invalid card');
    let attributeSeed=seed>>>0,stats=attributeStats(c.personaId,attributeSeed);
    while(JSON.stringify(stats)===JSON.stringify(c.stats)){attributeSeed=(attributeSeed+1)>>>0;stats=attributeStats(c.personaId,attributeSeed);}
    return {...c,attributeSeed,stats,revision:(c.revision||0)+1};
  }
  // Invert only a clear technical direction; missing/conflicting evidence remains a wait.
  const counterTechnicalDirection=signal=>signal==='up'?'down':signal==='down'?'up':'wait';
  const api={counterTechnicalDirection,personas,order,styles,traitsFor,makeCard,draw,validCard,clamp,rerollCard};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CardLabData=api;
})(typeof window==='undefined'?null:window,typeof module==='object'&&module.exports?require('./strategy-catalog'):window.WarriorStrategyCatalog);
