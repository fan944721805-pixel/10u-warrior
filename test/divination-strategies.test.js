const test=require('node:test'),assert=require('node:assert/strict');
const catalog=require('../public/strategy-catalog');
const {buildDecisionContext,normalizePolicy,createMockDecisionProvider,createDeepSeekDecisionProvider,validateDecision,decisionAudit,decisionPrompt}=require('../ai-decision');
const {createOfflineSimulation}=require('../public/offline-simulation');
const now=1800000000000;
const indicators={dataTimestamp:now,priceChangePct:{oneMinute:.1,fiveMinutes:.3},rsi14:65,ema:{ema5:105,ema20:100},spotOrderBookImbalance:.3,atr:{value:.2,percent:.2},spread:{basisPoints:2},longReturns:{fifteenMinutes:.7,sixtyMinutes:1.6}};
const context=(strategy,roundId='round-1',data=indicators)=>{
  const policy=normalizePolicy({strategy,decisionVariance:catalog.profiles[strategy].variance},'oracle');
  return {policy,indicators:data,now,input:buildDecisionContext({policy,indicators:data,market:{roundId,secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0}})};
};
for(const strategy of catalog.divinationStrategies){
  test(`${strategy}: reproducible indicator draw, distinct rounds, bounded BET and SKIP, frozen audit`,async()=>{
    const provider=createMockDecisionProvider(),seeds=new Set(),actions=new Set();let accepted;
    for(let i=0;i<50;i++){
      const f=context(strategy,`round-${i}`),raw=await provider.decide(f.input);
      assert.deepEqual(await provider.decide(f.input),raw);
      const plan=validateDecision(raw,f);seeds.add(f.input.divination.seed);actions.add(plan.action);
      assert.equal(plan.divination.seed,f.input.divination.seed);assert.ok(plan.warnings.includes('ENTERTAINMENT_ONLY'));
      assert.ok(plan.stake<=10);assert.notEqual(plan.riskMode,'ALL_IN');
      assert.equal(decisionAudit({provider,input:f.input,plan,indicators}).divination.seed,f.input.divination.seed);
      if(strategy==='diviner')assert.equal(new Set(f.input.divination.draw.cards.map(x=>x.card)).size,3);
      if(plan.action==='BET')accepted={f,raw};
    }
    assert.equal(seeds.size,50);assert.deepEqual([...actions].sort(),['BET','SKIP']);
    const {f,raw}=accepted;
    assert.throws(()=>validateDecision({...raw,divination:{...raw.divination,seed:'tampered'}},f),{code:'AI_DIVINATION_INVALID'});
    assert.throws(()=>validateDecision({...raw,direction:'DOWN',divination:{...raw.divination,verdict:'DOWN'}},f),{code:'AI_STRATEGY_CONDITION_NOT_MET'});
    assert.throws(()=>validateDecision({...raw,stake_usdt:20,stake_pct:20},f),{code:'AI_STAKE_OVER_CAP'});
    assert.throws(()=>validateDecision(raw,{...f,now:now+11000}),{code:'AI_DATA_STALE'});
    const missing=context(strategy,'round-1',{...indicators,rsi14:null});
    await assert.rejects(provider.decide(missing.input),{code:'AI_INDICATOR_MISSING'});
    assert.equal(missing.input.divination,null);
    const unsafe=context(strategy,'round-1',{...indicators,spread:{basisPoints:20}});
    assert.equal((await provider.decide(unsafe.input)).action,'SKIP');
    const reordered={...indicators,ema:{ema20:100,ema5:105}};
    assert.equal(context(strategy).input.divination.seed,context(strategy,'round-1',reordered).input.divination.seed);
    assert.notEqual(context(strategy).input.divination.seed,context(strategy,'round-1',{...indicators,rsi14:64}).input.divination.seed);
  });
  test(`${strategy}: future AI receives persona and frozen draw, valid in-character JSON passes gate`,async()=>{
    const f=context(strategy);const raw=await createMockDecisionProvider().decide(f.input);let body;
    const provider=createDeepSeekDecisionProvider({apiKey:'fixture-only',fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(raw)}}]})};}});
    const result=await provider.decide(f.input);validateDecision(result,f);
    assert.match(decisionPrompt(f.input),/Persona: You are/);assert.match(body.messages[0].content,/Never reroll/);
    assert.deepEqual(JSON.parse(body.messages[1].content).divination,f.input.divination);
    assert.ok(JSON.parse(body.messages[0].content.split('\n').at(-1)).divination);
  });
  test(`${strategy}: bearish readings can bet DOWN; final SKIP never displays a betting verdict`,async()=>{
    const bearish={...indicators,priceChangePct:{oneMinute:-.1,fiveMinutes:-.3},rsi14:35,ema:{ema5:95,ema20:100},spotOrderBookImbalance:-.3,longReturns:{fifteenMinutes:-.7,sixtyMinutes:-1.6}};
    let bets=0;
    for(let i=0;i<50;i++){
      const f=context(strategy,`bear-${i}`,bearish),raw=await createMockDecisionProvider().decide(f.input),plan=validateDecision(raw,f);
      if(plan.action==='BET'){assert.equal(plan.direction,'DOWN');bets++;}
      assert.match(catalog.formatDivination({...plan.divination,finalVerdict:'WAIT'},'en'),/→ WAIT$/);
    }
    assert.ok(bets>0);
  });
}
test('offline mobile runtime produces and persists readings for both personas',()=>{
  let time=now;const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const sim=createOfflineSimulation({storage,now:()=>time});
  const battle=sim.create('oracles',{agents:catalog.divinationStrategies.map((strategy,index)=>({id:`oracle-${index}`,strategy,coin:'BTC'})),initialBalance:100});
  time=Math.floor(time/300000)*300000+300000;
  const first=sim.snapshot(battle.id);
  first.agents.forEach(agent=>{assert.ok(agent.lastDecision.divination);assert.ok(agent.lastDecision.warnings.includes('ENTERTAINMENT_ONLY'));});
  assert.deepEqual(sim.snapshot(battle.id).agents.map(a=>a.lastDecision),first.agents.map(a=>a.lastDecision));
  assert.deepEqual(createOfflineSimulation({storage,now:()=>time}).snapshot(battle.id).agents.map(a=>a.lastDecision),first.agents.map(a=>a.lastDecision));
});
