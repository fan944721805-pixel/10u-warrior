const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createSimulationBattles}=require('../simulation-battles');
const {createOfflineSimulation}=require('../public/offline-simulation');
const {createWarriorServer}=require('../server');
const {createPredictionSimulation}=require('../prediction-sim');
const {equityEstimate,valuationKey,equityTier}=require('../public/market-values');

test('paper capital is isolated, reconciled, idempotent and restored without becoming profit',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'capital-test-'));
  try{
    const options={source:{},file:path.join(dir,'ledger.json'),leaseEnabled:true};
    const sim=createSimulationBattles(options),one=sim.create('one'),two=sim.create('two');
    const before=sim.snapshot(one.id),other=sim.snapshot(two.id),id=before.agents[0].id;
    const after=sim.topUp(one.id,id,50.25,'request-0001');
    assert.equal(after.agents[0].cash,before.agents[0].cash+50.25);
    assert.equal(after.addedCapital,50.25);assert.equal(after.initialTotal,before.initialTotal);
    assert.equal(after.agents[0].reconciliation.expectedCash,after.agents[0].cash);
    assert.deepEqual(after.agents[0].orders,before.agents[0].orders);
    assert.deepEqual(after.agents.slice(1),before.agents.slice(1));
    assert.deepEqual(sim.snapshot(two.id).agents,other.agents);
    assert.equal(sim.leaderboard().find(r=>r.battleId===one.id&&r.agentId===id).profit,0);
    assert.equal(equityEstimate(after,null).cumulativePnl,0);
    assert.equal(sim.summary(one.id).addedCapital,50.25);
    assert.equal(sim.topUp(one.id,id,50.25,'request-0001').agents[0].topUps.length,1);
    assert.throws(()=>sim.topUp(one.id,id,51,'request-0001'),/TOP_UP_CONFLICT/);
    assert.throws(()=>sim.topUp(one.id,after.agents[1].id,50.25,'request-0001'),/TOP_UP_CONFLICT/);
    const restored=createSimulationBattles(options);
    assert.equal(restored.topUp(one.id,id,50.25,'request-0001').agents[0].cash,after.agents[0].cash);
    assert.equal(restored.snapshot(one.id).agents[0].topUps.length,1);
    for(const amount of [0,-1,NaN,Infinity,'10',1000001,1.001])assert.throws(()=>sim.topUp(one.id,id,amount,'invalid-01'),/INVALID_TOP_UP_AMOUNT/);
    assert.throws(()=>sim.topUp(one.id,'missing',10,'missing-01'),/AGENT_NOT_FOUND/);
    sim.end(one.id);assert.throws(()=>sim.topUp(one.id,id,10,'ended-001'),/BATTLE_ENDED/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('offline top-up persists and rolls back a failed save',()=>{
  const values=new Map();let fail=false;
  const storage={getItem:k=>values.get(k),setItem:(k,v)=>{if(fail)throw Error('disk full');values.set(k,v);}};
  const sim=createOfflineSimulation({storage}),battle=sim.create('top-up'),id=battle.agents[0].id;
  const after=sim.topUp(battle.id,id,25,'offline-001');
  assert.equal(after.agents[0].cash,battle.agents[0].cash+25);
  assert.equal(after.agents[0].topUps.length,1);
  assert.equal(sim.topUp(battle.id,id,25,'offline-001').agents[0].cash,after.agents[0].cash);
  assert.equal(createOfflineSimulation({storage}).snapshot(battle.id).agents[0].addedCapital,25);
  assert.equal(sim.leaderboard().find(r=>r.battleId===battle.id&&r.agentId===id).profit,0);
  fail=true;assert.throws(()=>sim.topUp(battle.id,id,10,'offline-002'),/STORAGE_ERROR/);fail=false;
  assert.equal(sim.snapshot(battle.id).agents[0].cash,after.agents[0].cash);
  assert.equal(sim.snapshot(battle.id).agents[0].topUps.length,1);
  assert.equal(sim.snapshot(battle.id).enabled,false);
});

test('top-up leaves open-order floating P/L and historical cumulative P/L unchanged',()=>{
  const now=1800000000000;
  const battle={id:'funding',initialTotal:100,addedCapital:50,config:{initialBalance:100},agents:[{id:'A',cash:110,equity:130,addedCapital:50,orders:[{id:'o',status:'OPEN',amount:20}]}]};
  const result=equityEstimate(battle,{battleId:battle.id,signature:valuationKey(battle),agents:[{agentId:'A',estimatedEquity:135,asOf:now,validUntil:now+5000}]},now);
  assert.equal(result.agents[0].floatingPnl,5);assert.equal(result.cumulativePnl,-15);
  assert.equal(equityTier(200,100+100),'normal');
});

test('backend refuses top-up during a decision and rolls back credits if persistence fails',async()=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const running=createPredictionSimulation({source:{marketFor:()=>gate},now:()=>1800000010000});
  running.setEnabled(true);const tick=running.tick();
  assert.throws(()=>running.topUp('A',10,'busy-test-01'),/BATTLE_BUSY/);
  release(null);await tick;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'capital-failure-'));
  try{
    const file=path.join(dir,'ledger.json'),sim=createPredictionSimulation({source:{},file});
    sim.setEnabled(false);const before=sim.snapshot();
    // Preserve the valid test ledger, then use a directory to force atomic rename failure.
    fs.renameSync(file,path.join(dir,'ledger.backup.json'));fs.mkdirSync(file);
    assert.throws(()=>sim.topUp('A',10,'save-test-01'),/STORAGE_ERROR/);
    const after=sim.snapshot();assert.equal(after.agents[0].cash,before.agents[0].cash);
    assert.equal(after.agents[0].addedCapital||0,0);assert.equal(after.agents[0].topUps?.length||0,0);
    assert.equal(after.enabled,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('HTTP top-up rejects live mode and foreign origins, and credits a request only once',async()=>{
  const sim=createSimulationBattles({source:{},leaseEnabled:true}),battle=sim.create('HTTP fixture');
  const server=createWarriorServer({paperFile:null,walletCli:async()=>{throw Error('No wallet calls');},simulation:{...sim,tick:async()=>{}}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const body={mode:'paper',battleId:battle.id,agentId:battle.agents[0].id,amount:10,requestId:'http-test-001'};
  const post=(payload=body,from=origin)=>fetch(origin+'/api/simulation/top-up',{method:'POST',headers:{'content-type':'application/json',origin:from},body:JSON.stringify(payload)});
  try{
    assert.equal((await post({...body,mode:'live'})).status,400);
    assert.equal((await post(body,'https://example.com')).status,403);
    for(let n=0;n<2;n++){const response=await post();assert.equal(response.status,200);assert.equal((await response.json()).agents[0].cash,110);}
    assert.equal(sim.snapshot(battle.id).agents[0].topUps.length,1);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
