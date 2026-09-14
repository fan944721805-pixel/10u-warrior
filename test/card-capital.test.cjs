const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {normalizePolicy,buildDecisionContext,createMockDecisionProvider,validateDecision,decisionPrompt}=require('../ai-decision');
const cards=require('../public/card-lab-data'),capital=require('../card-capital.cjs');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const now=1800000000000;
function inputFor({balance=10,initial=100,open=0,added=0,strategy='orderFlow',limits={},capitalStopped=false}={}){
 const policy=normalizePolicy({id:'test',cardSnapshot:cards.makeCard(strategy,'original',123),capitalLimits:limits},'test');
 const indicators={dataTimestamp:now,price:100,priceChangePct:{oneMinute:.1,fiveMinutes:.3},takerFlow:{buyRatio:.7,netBase:40,totalBase:100},spotOrderBookImbalance:.3,spread:{basisPoints:1},longReturns:{fifteenMinutes:.3,sixtyMinutes:1}};
 const input=buildDecisionContext({policy,indicators,market:{roundId:'r',secondsToClose:300,upOdds:2.5,downOdds:2.5,dataTimestamp:now},account:{balance,initialBalance:initial+added,baseInitialBalance:initial,addedCapital:added,capitalStopped,openStake:open,wins:0,losses:5,winStreak:0,lossStreak:5}});
 return {policy,indicators,input};
}
test('SC-2 permits sub-5U legal stakes without recovery or minimum rounding-up',async()=>{
 const provider=createMockDecisionProvider(),f=inputFor(),raw=await provider.decide(f.input);
 assert.equal(f.policy.capitalVersion,'SC-2');assert.equal(f.input.policy.min_stake_usdt,.1);assert.equal(f.input.policy.capital_management.recoveryActive,false);
 assert.equal(raw.action,'BET');assert.ok(raw.stake_usdt>=.1&&raw.stake_usdt<5);assert.notEqual(raw.risk_mode,'ALL_IN');
 assert.doesNotThrow(()=>validateDecision(raw,{...f,now}));
 const tiny=inputFor({balance:.5});const noBet=await provider.decide(tiny.input);assert.equal(noBet.action,'SKIP');assert.equal(noBet.stake_usdt,0);
 assert.doesNotMatch(decisionPrompt(f.input),/RECOVERY_ALL_IN is the shared exception|at or below 20%|ordinary bets retain the 5/);
});
test('user cap and total open exposure constrain every tier, including a confident model',async()=>{
 const provider=createMockDecisionProvider(),f=inputFor({balance:80,open:20,limits:{maxStakePct:10,exposurePct:25}});
 const raw=await provider.decide(f.input);assert.equal(raw.stake_usdt,4);assert.equal(raw.stake_pct,5);
 assert.doesNotThrow(()=>validateDecision(raw,{...f,now}));
 assert.throws(()=>validateDecision({...raw,stake_usdt:8,stake_pct:10},{...f,now}),{code:'AI_STAKE_OVER_CAP'});
 const ordinary=inputFor({balance:100});const normal=await provider.decide(ordinary.input);
 assert.throws(()=>validateDecision({...normal,stake_usdt:6,stake_pct:6},{...ordinary,now}),{code:'CARD_STAKE_TIER_INVALID'});
 const blocked=inputFor({balance:80,open:20,limits:{exposurePct:20}});assert.equal((await provider.decide(blocked.input)).action,'SKIP');
});
test('Liang Xi keeps 50/100 tiers and cannot override the user cap or all-in switch',()=>{
 const half=inputFor({strategy:'liangXi',balance:10,limits:{maxStakePct:50,allowAllIn:true}});
 assert.equal(half.policy.maxStakePct,50);assert.equal(half.policy.allowAllIn,false);assert.equal(capital.normalPct(half.input,99),50);
 assert.throws(()=>capital.assertStake(half.input,{stake_usdt:3.5,risk_mode:'NORMAL'},99),{code:'CARD_STAKE_TIER_INVALID'});
 const small=inputFor({strategy:'liangXi',limits:{maxStakePct:49}});assert.equal(capital.normalPct(small.input,99),0);
 assert.equal(inputFor({strategy:'liangXi'}).policy.allowAllIn,false);
 assert.equal(inputFor({strategy:'liangXi',limits:{allowAllIn:true}}).policy.allowAllIn,true);
});
test('loss line excludes added principal and pending expected winnings, and a latched stop stays stopped',async()=>{
 const f=inputFor({balance:130,initial:100,added:50,limits:{stopLossPct:20}});
 assert.equal(capital.fromInput(f.input).netEquity,80);assert.equal(capital.fromInput(f.input).stopped,true);
 assert.equal((await createMockDecisionProvider().decide(f.input)).action,'SKIP');
 const pending=inputFor({balance:70,open:20,initial:100,limits:{stopLossPct:20}});assert.equal(capital.fromInput(pending.input).netEquity,90);assert.equal(capital.fromInput(pending.input).stopped,false);
 const latched=inputFor({balance:200,capitalStopped:true});assert.equal(capital.fromInput(latched.input).stopped,true);
});
test('frozen capital policy has a versioned identity; schema-1 history retains its original hash and behavior',()=>{
 const card=cards.makeCard('orderFlow','original',123),traits=cards.styles.original.traits;
 const oldHash=crypto.createHash('sha256').update(JSON.stringify({schema:1,persona:card.personaId,style:card.styleId,stats:card.stats,traits,required:cards.personas[card.personaId].required})).digest('hex');
 const old=normalizePolicy({cardSnapshot:card,cardPolicyHash:oldHash},'old');assert.equal(old.capitalVersion,'SC-1');assert.equal(old.cardPolicyHash,oldHash);
 const manager=require('../simulation-battles').createSimulationBattles({source:{},leaseEnabled:false});
 assert.throws(()=>manager.create('retired',{initialBalance:10,agents:[old]}),{code:'CARD_CAPITAL_VERSION_RETIRED'});
 assert.deepEqual(normalizePolicy(JSON.parse(JSON.stringify(old)),'old'),old);
 const modern=normalizePolicy({cardSnapshot:card},'new');assert.notEqual(modern.cardPolicyHash,oldHash);
 const capped=normalizePolicy({cardSnapshot:card,capitalLimits:{maxStakePct:20}},'new');assert.notEqual(capped.cardPolicyHash,modern.cardPolicyHash);
 assert.throws(()=>normalizePolicy({...capped,capitalLimits:{...capped.capitalLimits,maxStakePct:40}},'new'),{code:'CARD_POLICY_HASH_MISMATCH'});
 assert.throws(()=>normalizePolicy({cardSnapshot:card,capitalLimits:{exposurePct:101}},'new'),{code:'INVALID_CARD_CAPITAL_LIMITS'});
 assert.throws(()=>normalizePolicy({strategy:'smart',capitalVersion:'SC-2'},'x'),{code:'CARD_CAPITAL_VERSION_INVALID'});
});
test('a settled loss latches the stop in the actual ledger, halts new bets, and survives reload',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'card-capital-')),file=path.join(dir,'ledger.json');
 let time=now-45000,resolved=false;
 const f=inputFor({balance:100,limits:{stopLossPct:5}}),slot=now;
 const topic=s=>({marketTopicId:String(s),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:s,endDate:s+ROUND,
 markets:[{status:resolved&&s<time?'RESOLVED':'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up',winner:resolved&&s<time?false:null},{name:'Down',tokenId:'down',winner:resolved&&s<time?true:null}]}]});
 const source={marketFor:async s=>topic(s),detail:async s=>topic(+s),book:async(_,d)=>({tokenId:d==='UP'?'up':'down',timestamp:time,asks:[{price:.4,size:10000}]})};
 const options={source,file,now:()=>time,agentPolicies:[f.policy],policyFor:()=>f.policy,indicatorSource:{snapshot:async()=>({...f.indicators,dataTimestamp:time})},decisionProvider:createMockDecisionProvider()};
 try{
  const sim=createPredictionSimulation(options);await sim.tick();await new Promise(r=>setImmediate(r));time=slot;await sim.tick();
  assert.equal(sim.snapshot().agents[0].orders.length,1);resolved=true;time=slot+ROUND;await sim.tick();
  const ended=sim.snapshot();assert.equal(ended.agents[0].capitalStopped,true);assert.equal(ended.endReason,'CARD_STOP_LOSS');
  assert.equal(ended.agents[0].orders.length,1);assert.equal(ended.agents[0].orders[0].status,'LOST');
  const disk=fs.readFileSync(file,'utf8');sim.snapshot();assert.equal(fs.readFileSync(file,'utf8'),disk,'reads must not mutate stops');
  const restored=createPredictionSimulation(options);time+=ROUND;await restored.tick();assert.equal(restored.snapshot().agents[0].orders.length,1);assert.equal(restored.snapshot().agents[0].capitalStopped,true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('card policies cannot run through the old random A/B/C engine',()=>{
 assert.throws(()=>createPredictionSimulation({source:{},agentPolicies:[inputFor().policy]}),{code:'CARD_ENGINE_REQUIRED'});
});
