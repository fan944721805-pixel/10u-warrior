const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../public/strategy-catalog');
const {decisionDiversity}=require('../prediction-sim');
const {createMockDecisionProvider}=require('../ai-decision');
const {MAX_AGENTS,MAX_AI_DECISION_CONCURRENCY,createSimulationBattles,limitExternalDecisionProvider,normalizeBattleConfig}=require('../simulation-battles');

test('every personality owns a confidence ruler and a three-step stake ladder',()=>{
  const signatures=new Set();
  for(const [key,profile] of Object.entries(catalog.profiles)){
    assert.equal(profile.stakeTiers.length,3,key);
    assert.equal(profile.tierConfidence.length,2,key);
    assert.ok(profile.stakeTiers[0]<=profile.stakeTiers[1]&&profile.stakeTiers[1]<=profile.stakeTiers[2],key);
    assert.ok(profile.stakeTiers[2]<=profile.normalMaxStakePct,key);
    assert.ok(profile.confidence.scoreWeight>0,key);
    signatures.add(JSON.stringify({confidence:profile.confidence,stakes:profile.stakeTiers,thresholds:profile.tierConfidence}));
  }
  assert.ok(signatures.size>=9,'personalities should not share one last-mile formula');
  assert.deepEqual(catalog.profiles.aggressive.stakeTiers,[20,40,60]);
  assert.deepEqual(catalog.profiles.conservative.stakeTiers,[5,7,10]);
  assert.deepEqual(catalog.profiles.priceAction.stakeTiers,[7,12,20]);
});

test('marginal personality variation is stable per Agent and never changes direction',()=>{
  const args={strategy:'aggressive',roundId:'round-7',variance:82,confidence:60,minimumConfidence:60};
  const first=catalog.personalityNudge({...args,agentId:'dog-a'});
  assert.equal(first,catalog.personalityNudge({...args,agentId:'dog-a'}));
  assert.notEqual(first,catalog.personalityNudge({...args,agentId:'dog-b'}));
  assert.equal(catalog.personalityNudge({...args,agentId:'dog-a',confidence:90}),0);
  assert.ok(Math.abs(first)<=catalog.profiles.aggressive.personalitySwing);
});

test('collision rate counts matching action, direction and stake instead of direction alone',()=>{
  const decision=(roundId,agentId,action,direction=null,stakePct=0)=>({type:'DECISION',roundId,agentId,decision:{action,direction,stakePct,stake:stakePct}});
  const metric=decisionDiversity([
    decision('1','a','BET','UP',20),decision('1','b','BET','UP',20),decision('1','c','BET','UP',40),
    decision('2','a','SKIP'),decision('2','b','SKIP'),decision('2','c','BET','DOWN',5),
  ]);
  assert.equal(metric.rounds,2);assert.equal(metric.pairs,6);assert.equal(metric.collisionRate,2/6);
  assert.equal(metric.directionAgreementRate,1);
});

test('a battle accepts eight Agents and rejects a ninth',()=>{
  assert.equal(MAX_AGENTS,8);
  const agents=Array.from({length:8},(_,index)=>({id:`agent-${index+1}`,coin:'BTC',strategy:'smart'}));
  assert.equal(normalizeBattleConfig({agents}).agents.length,8);
  assert.throws(()=>normalizeBattleConfig({agents:[...agents,{id:'agent-9',coin:'BTC'}]}),/INVALID_BATTLE_AGENTS/);
});

test('all eight selected Agents reach the decision engine without being truncated',async()=>{
  let time=1800000000000-20000;
  const slot=1800000000000,roundMs=300000;
  const topic=start=>({marketTopicId:String(start),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+roundMs,markets:[{marketId:String(start),status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
  const bars=Array.from({length:20},(_,index)=>{const open=100+index*.1,close=index<17?open+.02:open+.8,openTime=slot-(20-index)*60000;return {openTime,closeTime:openTime+59999,open,high:Math.max(open,close)+.1,low:Math.min(open,close)-.1,close};});
  const manager=createSimulationBattles({leaseEnabled:false,now:()=>time,decisionProvider:createMockDecisionProvider(),
    source:{marketFor:async start=>topic(start),detail:async id=>topic(Number(id)),book:async(_,direction)=>({tokenId:direction==='UP'?'up':'down',timestamp:time,asks:[{price:.5,size:1000}]})},
    indicatorSource:{snapshot:async()=>({dataTimestamp:time,price:100,candles:{intervalMinutes:1,targetMinutes:5,bars}})},
  });
  const agents=Array.from({length:8},(_,index)=>({id:`candle-${index+1}`,coin:'BTC',strategy:'priceAction'}));
  const battle=manager.create('eight agents',{agents,initialBalance:100,rounds:1});
  await manager.tick();time=slot;await manager.tick();
  const snapshot=manager.snapshot(battle.id);
  assert.equal(snapshot.agents.length,8);assert.equal(snapshot.auditTrail.filter(event=>event.type==='DECISION_INPUT').length,8);
  assert.ok(snapshot.agents.every(agent=>agent.orders.length===1));assert.equal(snapshot.diversity.collisionRate,1);
});

test('external model decisions are globally limited to four concurrent requests',async()=>{
  let active=0,peak=0;
  const provider={describe:()=>({mode:'deepseek'}),decide:async input=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,8));active--;return input;}};
  const limited=limitExternalDecisionProvider(provider);
  const values=await Promise.all(Array.from({length:8},(_,index)=>limited.decide(index)));
  assert.deepEqual(values,[0,1,2,3,4,5,6,7]);assert.equal(peak,MAX_AI_DECISION_CONCURRENCY);assert.equal(limited.describe().maxConcurrentRequests,4);
});

test('UI exposes the seventeen-Agent roster, eight battle seats, collision meter and responsive grids',()=>{
  const read=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
  const setup=read('agent-setup.js'),paper=read('paper.js'),offline=read('offline-simulation.js'),index=read('index.html'),layout=read('ui-v2.css'),arena=read('orb-arena.js');
  assert.match(setup,/maxCards=17,maxSelected=8/);assert.match(setup,/每局最多选择 8 位 AI/);assert.match(setup,/当前最多添加 17 位 Agent/);
  assert.match(paper,/agents\.length > 8/);assert.match(offline,/agents\.length > 8/);assert.match(offline,/raw\.slice\(0, 8\)/);assert.match(index,/每局最多 8 个/);assert.match(index,/id="collision-rate"/);
  assert.match(layout,/grid-template-columns:\s*repeat\(4/);assert.match(layout,/grid-template-columns:\s*repeat\(2/);
  assert.match(arena,/7:\[12,37,62,87,22,50,78\]/);assert.match(arena,/8:\[13,38,63,88,13,38,63,88\]/);
});
