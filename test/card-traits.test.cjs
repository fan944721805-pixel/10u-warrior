const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const T=require('../card-traits.cjs'),cards=require('../public/card-lab-data'),capital=require('../card-capital.cjs');
const {freezeCard}=require('../card-policy.cjs');
const {normalizePolicy,buildDecisionContext,createMockDecisionProvider,validateDecision,decisionPrompt}=require('../ai-decision');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const {DEFAULTS}=require('../global-controls.cjs');
const settle=(s,traits,id,profit=5,net=110)=>T.settle(s,traits,{id,status:profit>0?'WON':profit<0?'LOST':'SPLIT',netProfit:profit,netEquity:net,initial:100});
const step=(s,traits,slot,outcome='wait')=>{T.mark(s,traits,slot,outcome);T.complete(s,[slot]);};
const snapshot=now=>({dataTimestamp:now,price:104,priceChangePct:{oneMinute:.4,fiveMinutes:1},ema:{ema5:105,ema20:100},macd:{line:1,signal:.5,histogram:.5},rsi14:62,
 adx:{adx:30,plusDI:30,minusDI:10},volumeRatio:1.5,atr:{percent:.2,value:.2},spread:{basisPoints:1},longReturns:{fifteenMinutes:.3,sixtyMinutes:.8},volatility:{perMinutePct:.1},momentum:2,roc:{tenMinutes:.8,twentyMinutes:1.2},
 takerFlow:{buyRatio:.7,netBase:40,totalBase:100},spotOrderBookImbalance:.2,bollinger:{middle:100,upper:103,lower:97,percentB:.7,bandwidthPct:6},
 candles:{intervalMinutes:1,targetMinutes:5,bars:Array.from({length:20},(_,i)=>({open:100,high:102,low:99,close:101,openTime:now-60000*(21-i),closeTime:now-60000*(20-i)-1}))},
 donchian:{upper:102,lower:98,close:104,breakout:1,previous:{upper:102,lower:98,close:103}}});
function inputFor(persona,style,state,extra={}){
 const now=1800000000000,policy=normalizePolicy({cardSnapshot:cards.makeCard(persona,style,123)},'card'),indicators=snapshot(now);
 const input=buildDecisionContext({policy,indicators,market:{roundId:now,secondsToClose:300,upOdds:5,downOdds:5,dataTimestamp:now},account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0,cardTraitState:state,...extra},globalControls:{...DEFAULTS,urge:40}});
 return {input,policy,indicators,now};
}

test('CT-1 trait combinations are bounded, immutable and versioned independently from history',()=>{
 const reactions=['snowball','stubborn','retreat','waitFatigue','protect'],special=['insight','cooldown','resonance'];
 const found=new Set();
 for(const persona of cards.order)for(const style of cards.personas[persona].styles){
  const card=cards.makeCard(persona,style,123),traits=cards.traitsFor(card);traits.forEach(x=>found.add(x));
  assert.ok(traits.filter(x=>reactions.includes(x)).length<=1);assert.ok(traits.filter(x=>special.includes(x)).length<=1);
  assert.ok(traits.filter(x=>!reactions.includes(x)&&!special.includes(x)&&x!=='inverse').length<=2);
  if(traits.includes('resonance'))assert.equal(persona,'kzgMask');
  const old=freezeCard(card,{traitsVersion:'CT-0'}),legacy=normalizePolicy({cardSnapshot:card,capitalVersion:'SC-2',capitalLimits:old.capitalLimits,cardPolicyHash:old.policyHash},'c');
  assert.equal(legacy.traitsVersion,'CT-0');assert.deepEqual(legacy.cardTraits,cards.styles[style].traits);
  const modern=normalizePolicy({cardSnapshot:card},'c');assert.equal(modern.traitsVersion,'CT-1');assert.notEqual(modern.cardPolicyHash,legacy.cardPolicyHash);
  assert.deepEqual(normalizePolicy(JSON.parse(JSON.stringify(modern)),'c'),modern);
  assert.throws(()=>normalizePolicy({...modern,traitsVersion:'CT-0'},'c'),{code:'CARD_POLICY_HASH_MISMATCH'});
 }
 for(const trait of [...reactions,...special])assert.ok(found.has(trait),trait);
 const card=cards.makeCard('kzgMask','sniper',123),old=freezeCard(card,{traitsVersion:'CT-0'});
 const manager=require('../simulation-battles').createSimulationBattles({source:{}});
 assert.throws(()=>manager.create('retired',{initialBalance:100,agents:[{cardSnapshot:card,capitalVersion:'SC-2',capitalLimits:old.capitalLimits,cardPolicyHash:old.policyHash}]}),{code:'CARD_TRAITS_VERSION_RETIRED'});
});

test('streak reactions deduplicate settlements, never refresh while active, and exit on opposing results',()=>{
 const traits=['snowball','stubborn','retreat'],s=T.restore();
 settle(s,traits,'w1');settle(s,traits,'w2');assert.equal(T.effects(s,traits).stakeBonus,15);
 step(s,traits,1);assert.equal(s.active.snowball.remaining,1);
 const before=structuredClone(s);assert.equal(settle(s,traits,'w2'),false);assert.deepEqual(s,before);
 settle(s,traits,'w3');assert.equal(s.active.snowball.remaining,1);
 settle(s,traits,'l1',-5);assert.equal(s.active.snowball,undefined);
 settle(s,traits,'l2',-5);assert.equal(T.effects(s,traits).urgeBonus,10);assert.equal(T.effects(s,traits).stakeMultiplier,.7);
 step(s,traits,2);step(s,traits,3);assert.equal(s.active.stubborn,undefined);assert.equal(s.active.retreat.remaining,1);
 settle(s,traits,'w4');assert.equal(s.active.retreat,undefined);
});

test('late activation is not consumed by earlier decisions; durations and cooldowns use completed decision rounds only',()=>{
 const traits=['cooldown','insight'],s=T.restore();
 T.mark(s,traits,1,'wait');settle(s,traits,'big',10);T.complete(s,[1]);assert.equal(s.active.cooldown.remaining,2);
 assert.equal(T.effects(s,traits).paused,true);const before=JSON.stringify(s);T.complete(s,[1,100,10000]);assert.equal(JSON.stringify(s),before);
 T.mark(s,traits,2,'paused');T.mark(s,traits,2,'paused');T.complete(s,[2]);assert.equal(s.active.cooldown.remaining,1);
 const restored=T.restore(s);settle(restored,traits,'big2',15);assert.equal(restored.active.cooldown.remaining,1);
 step(restored,traits,3,'paused');assert.equal(T.effects(restored,traits).paused,false);assert.equal(restored.cooling.cooldown.remaining,5);
 settle(restored,traits,'big3',20);assert.equal(restored.active.cooldown,undefined);assert.equal(restored.active.insight.remaining,2);
 for(let n=4;n<9;n++)step(restored,traits,n);
 assert.equal(restored.cooling.cooldown,undefined);settle(restored,traits,'big4',20);assert.equal(restored.active.cooldown.remaining,2);
 assert.throws(()=>T.restore({...restored,version:'future'}),{code:'INVALID_CARD_TRAIT_STATE'});
});

test('wait fatigue counts one completed wait per round, clears on a submitted bet, and applies before global urge',()=>{
 const traits=['waitFatigue'],s=T.restore();
 for(let n=1;n<5;n++){T.mark(s,traits,n,'wait');T.mark(s,traits,n,'wait');T.complete(s,[n]);}
 assert.equal(T.effects(s,traits).urgeBonus,15);
 const f=inputFor('orderFlow','chase',s);assert.equal(f.input.policy.action_urge,Math.min(100,f.policy.actionUrge+15)+(100-Math.min(100,f.policy.actionUrge+15))*.4);
 T.mark(s,traits,5,'bet');assert.equal(s.waits,0);T.mark(s,traits,5,'wait');T.complete(s,[5]);assert.equal(s.waits,0);
 assert.match(decisionPrompt(f.input),/CT-1 active rules/);
});

test('profit protection has hysteresis and shares the stricter reduction; tiers and direction remain enforced',async()=>{
 const s=T.restore(),traits=['protect'];settle(s,traits,'p1',50,150);
 assert.equal(T.effects(s,traits,{netEquity:140,initial:100}).stakeMultiplier,.7);
 settle(s,traits,'p2',-21,129);assert.equal(T.effects(s,traits,{netEquity:129,initial:100}).stakeMultiplier,1);
 const f=inputFor('smart','precise',s,{balance:150});assert.equal(f.input.policy.trait_effects.stakeMultiplier,.7);
 assert.equal(capital.normalPct(f.input,95),20);
 const liang=inputFor('liangXi','wild',s);liang.input.policy.trait_effects.stakeBonus=30;
 assert.equal(capital.normalPct(liang.input,99),50);
 const raw=await createMockDecisionProvider().decide(f.input);assert.equal(raw.direction,'UP');assert.doesNotThrow(()=>validateDecision(raw,{...f,now:f.now}));
 const paused=inputFor('conservative','cautious',T.restore());paused.input.policy.trait_effects.paused=true;
 assert.equal((await createMockDecisionProvider().decide(paused.input)).action,'SKIP');
 assert.throws(()=>validateDecision({...raw,round_id:paused.input.market.round_id},{...paused,now:paused.now}),{code:'CARD_TRAIT_COOLDOWN'});
});

test('KZG resonance requires three strong groups, raises only one legal tier and cools for three decisions',()=>{
 const s=T.restore(),f=inputFor('kzgMask','sniper',s),traits=f.policy.cardTraits;
 assert.equal(f.input.policy.trait_effects.nextTier,true);assert.equal(capital.normalPct(f.input,75),14);
 const original=structuredClone(f.indicators);for(const changes of [{volumeRatio:1.1},{spotOrderBookImbalance:.1},{longReturns:{fifteenMinutes:.3,sixtyMinutes:-.1}},{donchian:{...original.donchian,previous:{upper:102,lower:98,close:101}}}])assert.equal(T.strongResonance({...original,...changes},'kzgMask'),false);
 T.mark(s,traits,1,'wait',{resonant:true});T.complete(s,[1]);assert.equal(s.cooling.resonance.remaining,3);
 assert.equal(inputFor('kzgMask','sniper',s).input.policy.trait_effects.nextTier,false);
 for(let n=2;n<5;n++)step(s,traits,n);assert.equal(inputFor('kzgMask','sniper',s).input.policy.trait_effects.nextTier,true);
});

test('actual settlements pause new decisions for two rounds, persist through reload and never mutate on reads',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'card-traits-')),file=path.join(dir,'ledger.json'),slot=1800000000000;
 let time=slot-45000,calls=0;
 const p=normalizePolicy({cardSnapshot:cards.makeCard('conservative','cautious',123)},'card');
 const topic=s=>({marketTopicId:String(s),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:s,endDate:s+ROUND,markets:[{status:time>=s+ROUND?'RESOLVED':'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up',winner:time>=s+ROUND?true:null},{name:'Down',tokenId:'down',winner:time>=s+ROUND?false:null}]}]});
 const source={marketFor:async s=>topic(s),detail:async s=>topic(+s),book:async(_,d)=>({tokenId:d==='UP'?'up':'down',timestamp:time,asks:[{price:.2,size:10000}]})};
 const opts={file,source,now:()=>time,agentPolicies:[p],policyFor:()=>p,indicatorSource:{snapshot:async()=>snapshot(time)},decisionProvider:{describe:()=>({mode:'external'}),decide:async input=>{calls++;const amount=Math.floor(input.account.balance*5)/100;return {round_id:input.market.round_id,action:'BET',direction:'UP',stake_usdt:amount,stake_pct:amount/input.account.balance*100,confidence:95,risk_mode:'NORMAL',reason:'fixture',data_fresh:true,factors:[],warnings:[]};}}};
 try{
  let sim=createPredictionSimulation(opts);await sim.tick();await new Promise(r=>setImmediate(r));time=slot;await sim.tick();assert.equal(sim.snapshot().agents[0].orders.length,1);
  time+=ROUND;await sim.tick();let agent=sim.snapshot().agents[0];assert.equal(agent.cardTraitState.active.cooldown.remaining,2);assert.equal(agent.orders.length,1);assert.equal(agent.reason,'CARD_TRAIT_COOLDOWN');
  const count=calls,disk=fs.readFileSync(file,'utf8');sim.snapshot();assert.equal(fs.readFileSync(file,'utf8'),disk);
  sim=createPredictionSimulation(opts);time+=ROUND-45000;await sim.tick();await new Promise(r=>setImmediate(r));time+=45000;await sim.tick();assert.equal(sim.snapshot().agents[0].cardTraitState.active.cooldown.remaining,1);assert.equal(calls,count);assert.equal(sim.snapshot().agents[0].orders.length,1);
  time+=ROUND;await sim.tick();assert.equal(sim.snapshot().agents[0].cardTraitState.active.cooldown,undefined);assert.ok(calls>count);assert.equal(sim.snapshot().agents[0].orders.length,2);
  const corrupt=JSON.parse(fs.readFileSync(file,'utf8'));delete corrupt.agents[0].cardTraitState;fs.writeFileSync(file,JSON.stringify(corrupt));assert.throws(()=>createPredictionSimulation(opts),{code:'INVALID_CARD_TRAIT_STATE'});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('CT-1 confirmation rejects model weak-signal probes even at maximum urge; historical policy stays unchanged',()=>{
 const f=inputFor('smart','precise',T.restore()),i=f.input;
 i.policy.review_mode='model';i.policy.action_urge=100;
 Object.assign(i.indicators,{price_change_pct:{oneMinute:0,fiveMinutes:0},rsi_14:50,ema_5_20:{ema5:100,ema20:100},macd_12_26_9:{line:0,signal:0,histogram:0},adx_dmi_14:{adx:20,plusDI:20,minusDI:20},taker_flow_5:{buyRatio:.5,netBase:0,totalBase:100},spot_order_book_imbalance:0,returns_15_60:{fifteenMinutes:0,sixtyMinutes:0}});
 const {betPermission}=require('../ai-decision');
 assert.equal(betPermission(i,'UP').allowed,false);
 i.policy.traits_version='CT-0';assert.equal(betPermission(i,'UP').allowed,true);
});

test('realtime rules-only waiting persists its trait round even when no model job is queued',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'trait-wait-')),file=path.join(dir,'ledger.json'),slot=1800000000000;
 let time=slot-45000,local=false;
 const p=normalizePolicy({cardSnapshot:cards.makeCard('smart','sniper',123)},'card');
 const topic=s=>({marketTopicId:String(s),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:s,endDate:s+ROUND,markets:[{status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up',winner:null},{name:'Down',tokenId:'down',winner:null}]}]});
 const source={marketFor:async s=>topic(s),detail:async s=>topic(+s),book:async(_,d)=>({tokenId:d==='UP'?'up':'down',timestamp:time,asks:[{price:.2,size:10000}]})};
 const opts={file,source,now:()=>time,realtimeEntry:true,agentPolicies:[p],policyFor:()=>p,indicatorSource:{snapshot:async()=>({...snapshot(time),priceChangePct:{oneMinute:0,fiveMinutes:0},rsi14:50,ema:{ema5:100,ema20:100},macd:{line:0,signal:0,histogram:0},adx:{adx:20,plusDI:20,minusDI:20},takerFlow:{buyRatio:.5,netBase:0,totalBase:100},spotOrderBookImbalance:0,longReturns:{fifteenMinutes:0,sixtyMinutes:0}})},decisionProvider:{describe:()=>({mode:local?'mock':'external'}),decide:async()=>{throw Error('MODEL_UNAVAILABLE');}}};
 try{
  const sim=createPredictionSimulation(opts);await sim.tick();await new Promise(r=>setImmediate(r));time=slot;await sim.tick();
  assert.equal(sim.snapshot().agents[0].cardTraitState.rounds[slot],undefined);
  local=true;time+=15000;await sim.tick();
  const state=sim.snapshot().agents[0].cardTraitState;assert.equal(state.rounds[slot].outcome,'wait');
  assert.deepEqual(createPredictionSimulation(opts).snapshot().agents[0].cardTraitState,state);
  time+=15000;await sim.tick();assert.deepEqual(sim.snapshot().agents[0].cardTraitState,state);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
