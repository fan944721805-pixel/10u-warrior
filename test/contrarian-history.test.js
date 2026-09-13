const test=require('node:test'),assert=require('node:assert/strict');
const cat=require('../public/strategy-catalog'),ai=require('../ai-decision');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const {calculateIndicatorSnapshot}=require('../market-indicators');
const {rows,depth}=require('./fixtures/indicator-series.cjs');
const slot=1800000000000;
const indicators=(now=slot)=>calculateIndicatorSnapshot({symbol:'BTCUSDT',klines:rows(now),depth,receivedAt:now});
function agent(id,profits,{direction='UP',amount=10,amounts,historyDirection=direction,strategy='aggressive'}={}){
  const orders=profits.map((profit,i)=>({id:`${id}-${i}`,start:slot-(profits.length-i)*ROUND,settledAt:slot-(profits.length-i-1)*ROUND,
    amount:amounts?.[i]??10,payout:(amounts?.[i]??10)+profit,direction:historyDirection,status:profit<0?'LOST':profit>0?'WON':'SPLIT'}));
  orders.push({id:id+'-current',start:slot,placedAt:slot,amount,direction,status:'OPEN'});
  return {id,policy:{name:id,strategy},orders};
}
const peers=agents=>cat.peerSnapshot(agents,slot,'BTCUSDT',slot);
const evaluate=(snapshot,urge=100,strategy='contrarian')=>cat.eligibleCountertradePeers(strategy,urge,{agentId:'self',roundId:slot,asset:'BTCUSDT',peers:snapshot});
const skip=input=>({round_id:input.market.round_id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:0,risk_mode:'WAIT',skip_reason_code:'MODEL_UNCERTAIN',factors:[],reason:'fixture',data_fresh:true,warnings:[]});
function context(snapshot,emotion=100,cap=30){
  const policy=ai.normalizePolicy({strategy:'contrarian',actionUrge:100,maxStakePct:cap},'self'),data=indicators();
  const input=ai.buildDecisionContext({policy,indicators:data,peers:snapshot,battleEmotion:emotion,
    market:{roundId:slot,secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:slot},account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0}});
  input.policy.review_mode='model';return {policy,input,indicators:data,now:slot};
}
test('peer history uses at most 20 completed outcomes known at the decision time',()=>{
  const a=agent('a',Array(25).fill(-10));
  a.orders.push({id:'unknown',start:slot-1,settledAt:slot+1,status:'LOST',amount:100,payout:0,direction:'UP'});
  a.orders.push({id:'unsettled',start:slot-2,status:'OPEN',amount:100,direction:'UP'});
  a.orders.push({id:'future',start:slot+ROUND,settledAt:slot+2*ROUND,status:'LOST',amount:100,payout:0,direction:'UP'});
  const result=peers([a]).agents[0];
  assert.equal(result.performance.count,20);assert.equal(result.performance.netProfit,-200);
  assert.equal(result.performance.returnPct,-100);assert.equal(result.performance.byDirection.UP.losses,20);
  assert.equal(result.lossStreak,0,'unknown newer outcomes cannot extend a loss streak');
  a.orders.find(o=>o.id==='a-current').placedAt=slot+1;
  assert.equal(peers([a]).agents[0].order,null,'future fills are not current evidence');
});
test('repeated losing directions and loss chasing affect the collective vote weights',()=>{
  const a=agent('chaser',[-10,-10,-10,-10],{amounts:[10,20,30,40],amount:50});
  const b=agent('other',[-10,-10,-10,-10],{amounts:[10,20,30,40],amount:50,historyDirection:'DOWN'});
  const snapshot=peers([a,b]),habit=snapshot.agents[0].performance.habits;
  assert.equal(habit.afterLossRaises,3);assert.equal(habit.afterLossRaiseRate,1);assert.equal(habit.currentlyChasingLoss,true);
  const result=evaluate(snapshot);
  assert.ok(result.targets[0].voteWeight>result.targets[1].voteWeight,'same losing direction has extra evidence');
});
test('all peers contribute and one profitable whale cannot replace the collective losing direction',()=>{
  const snapshot=peers([agent('whale',[10,10,10,10],{direction:'DOWN',amount:1000}),
    ...[1,2,3,4].map(i=>agent('loss'+i,[-10,-10,-10,-10],{amount:5}))]);
  const result=evaluate(snapshot);
  assert.equal(result.targets.length,5);assert.ok(result.downStake>result.upStake);assert.ok(result.up>result.down);
  assert.equal(result.stakeMultiplier,2);assert.equal(result.losingCount,4);
  const f=context(snapshot);assert.equal(ai.decisionFacts(f.input).countertrade.fade_direction,'DOWN');
});
test('collective loss severity scales stake by 1.25, 1.5 or 2; a single loser never triggers escalation',()=>{
  for(const [profits,multiplier] of [[[-5,-5,2,0],1.25],[[-8,-8,0,0],1.5],[[-10,-10,-10,-10],2]]){
    const snapshot=peers([agent('a',profits),agent('b',profits)]);
    assert.equal(evaluate(snapshot).stakeMultiplier,multiplier);
    assert.equal(evaluate(peers([agent('only',profits)])).stakeMultiplier,1);
  }
});
test('split losing directions and a narrow loss minority never trigger collective escalation',()=>{
  const a=agent('a',[-10,-10,-10,-10]),b=agent('b',[-10,-10,-10,-10],{direction:'DOWN'});
  const split=evaluate(peers([a,b]));assert.equal(split.up,split.down);assert.equal(split.stakeMultiplier,1);
  assert.equal(cat.evaluateCharacter('contrarian',indicators(),100,{agentId:'self',roundId:slot,asset:'BTCUSDT',peers:peers([a,b])}).score,0);
  const minority=evaluate(peers([a,...[1,2,3,4].map(i=>agent('winner'+i,[10,10,10,10]))]));
  assert.equal(minority.lossBreadth,.2);assert.equal(minority.stakeMultiplier,1);
});
test('collective add-on uses the same amount in prompts, mock decisions, audit and execution gate',async()=>{
  const f=context(peers([agent('a',[-10,-10,-10,-10]),agent('b',[-10,-10,-10,-10])])),choices=ai.decisionStakeChoices(f.input);
  assert.equal(f.input.policy.countertrade_stake_multiplier,2);
  assert.ok(choices.normal.every(row=>row.stake_usdt===30&&row.risk_mode==='ADD_ON'));
  const raw={...skip(f.input),action:'BET',direction:'DOWN',stake_usdt:30,stake_pct:30,confidence:70,risk_mode:'ADD_ON',skip_reason_code:null};
  const plan=ai.validateDecision(raw,f);assert.equal(plan.countertrade.losing_count,2);assert.equal(plan.countertrade.stake_multiplier,2);
  assert.equal(ai.decisionAudit({provider:{describe:()=>({mode:'fixture'})},input:f.input,plan,indicators:f.indicators,raw}).countertrade.stake_multiplier,2);
  assert.throws(()=>ai.validateDecision({...raw,direction:'UP'},f),{code:'AI_STRATEGY_CONDITION_NOT_MET'});
  assert.throws(()=>ai.validateDecision({...raw,stake_usdt:30.1,stake_pct:30.1},f),{code:'AI_STAKE_OVER_CAP'});
  assert.throws(()=>ai.validateDecision({...raw,risk_mode:'ALL_IN'},f),{code:'AI_ALL_IN_REJECTED'});
  assert.throws(()=>ai.validateDecision({...raw,stake_usdt:4.99,stake_pct:4.99},f),{code:'AI_STAKE_BELOW_MINIMUM'});
  const capped=context(f.input.peers,100,12);assert.ok(ai.decisionStakeChoices(capped.input).normal.every(row=>row.stake_usdt===12));
  const calm=context(f.input.peers,0);assert.equal(ai.validateDecision({...raw,stake_usdt:20,stake_pct:20,confidence:80},calm).stake,20,'peer losses permit add-on without own tilt');
  const mock=await ai.createMockDecisionProvider().decide(f.input);assert.equal(mock.stake_usdt,30);assert.equal(mock.risk_mode,'ADD_ON');
  let body;const provider=ai.createDeepSeekDecisionProvider({apiKey:'fixture',fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(raw)}}]})};}});
  ai.validateDecision(await provider.decide(f.input),f);
  assert.equal(JSON.parse(body.messages[1].content).peers.agents[0].performance.count,4);
  assert.match(body.messages[0].content,/never pick just one target/);
});
test('newly settled history changes the review key while cooldown still holds',()=>{
  const snapshot=peers([agent('a',[-10,-10,-10,-10]),agent('b',[-10,-10,-10,-10])]),f=context(snapshot);
  const first=ai.modelReview(f.input,slot,null,slot),previous={at:slot,count:1,keys:[first.key]};
  f.input.peers.agents[0].performance.netProfit=-25;
  assert.equal(ai.modelReview(f.input,slot,previous,slot+1000).reason,'AI_REVIEW_COOLDOWN');
  assert.ok(ai.modelReview(f.input,slot,previous,slot+60000).key);
});
test('Show-off still follows only CZ in the opposite direction regardless of crowd history',()=>{
  const snapshot=peers([agent('cz',[10,10,10],{strategy:'czBrother',direction:'DOWN'}),agent('bad',[-10,-10,-10,-10])]);
  const result=evaluate(snapshot,100,'showoff');assert.deepEqual(result.targets.map(a=>a.id),['cz']);assert.equal(result.stakeMultiplier,1);
  assert.ok(cat.evaluateCharacter('showoff',indicators(),100,{agentId:'self',roundId:slot,asset:'BTCUSDT',peers:snapshot}).score>0);
});
test('simulation passes actual settled peer histories to Contrarian and places one capped collective add-on',async()=>{
  let now=slot-20000;const captured=[];
  const policies=['a','b','c','self'].map(id=>ai.normalizePolicy({strategy:id==='self'?'contrarian':'aggressive',actionUrge:100,maxStakePct:id==='self'?30:100},id));
  const topic=start=>({marketTopicId:String(start),symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+ROUND,
    markets:[{status:now>=start+ROUND?'RESOLVED':'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up',winner:now>=start+ROUND?false:null},{name:'Down',tokenId:'down',winner:now>=start+ROUND?true:null}]}]});
  const source={marketFor:async start=>topic(start),detail:async id=>topic(Number(id)),book:async(_,direction)=>({tokenId:direction==='UP'?'up':'down',timestamp:now,asks:[{price:.5,size:10000}]})};
  const mock=ai.createMockDecisionProvider();
  const sim=createPredictionSimulation({source,indicatorSource:{snapshot:async()=>indicators(now)},now:()=>now,emotionLevel:100,actionUrgeLevel:100,
    agentPolicies:policies,policyFor:id=>policies.find(p=>p.id===id),decisionProvider:{describe:()=>({mode:'fixture',simulated:true}),decide:async input=>{
      if(input.policy.strategy==='contrarian'){captured.push(input);return now<slot+4*ROUND?skip(input):mock.decide(input);}
      return {...skip(input),action:'BET',direction:'UP',stake_usdt:10,stake_pct:1000/input.account.balance,confidence:80,risk_mode:'NORMAL',skip_reason_code:null};
    }}});
  await sim.tick();for(let i=0;i<5;i++){now=slot+i*ROUND;await sim.tick();}
  const last=captured.at(-1);assert.equal(last.peers.agents.filter(a=>a.id!=='self').length,3);
  assert.ok(last.peers.agents.filter(a=>a.id!=='self').every(a=>a.performance.count===4&&a.performance.netProfit===-40));
  const agent=sim.snapshot().agents.find(a=>a.id==='self');assert.equal(agent.orders.length,1);assert.equal(agent.orders[0].amount,30);assert.equal(agent.orders[0].direction,'DOWN');
  assert.equal(agent.lastDecision.countertrade.losing_count,3);assert.ok(agent.reconciliation.matched);
  await sim.tick();assert.equal(sim.snapshot().agents.find(a=>a.id==='self').orders.length,1);
});

test('missing payout data cannot masquerade as a losing history or bridge a loss-chasing sequence',()=>{
  const a=agent('a',[-10,20,-10,20]);delete a.orders[1].payout;delete a.orders[3].payout;
  const snapshot=peers([a]),p=snapshot.agents[0].performance;
  assert.equal(p.complete,false);assert.equal(p.unknownCount,2);assert.equal(p.habits.afterLossBets,0);
  assert.equal(p.habits.currentlyChasingLoss,false);
  assert.equal(evaluate(snapshot).mode,'crowd-fallback');assert.equal(evaluate(snapshot).stakeMultiplier,1);
});

test('realized capital drawdown catches large losses without counting unfilled or open stakes as losses',()=>{
  const a=agent('a',[-80],{amounts:[80],amount:10}),b=agent('b',[-80],{amounts:[80],amount:10});
  const snapshot=cat.peerSnapshot([a,b],slot,'BTCUSDT',slot,100);
  assert.equal(snapshot.agents[0].performance.capitalLossPct,80);
  assert.equal(evaluate(snapshot).stakeMultiplier,2);
  a.addedCapital=100;
  assert.equal(cat.peerSnapshot([a],slot,'BTCUSDT',slot,100).agents[0].performance.capitalLossPct,40);
  assert.equal(cat.peerSnapshot([agent('open',[],{amount:90})],slot,'BTCUSDT',slot,100).agents[0].performance.capitalLossPct,0);
});
