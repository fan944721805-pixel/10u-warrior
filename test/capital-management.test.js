const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {capitalManagement,normalStakePercent,probeStakePercent,profiles}=require('../public/strategy-catalog');
const {createPredictionSimulation,ROUND}=require('../prediction-sim');
const {fixture}=require('./fixtures/simulation-market.cjs');

test('every strategy enters at 20%, stays in recovery through partial wins and exits at invested capital',()=>{
  for(const strategy of Object.keys(profiles)){
    const state=(balance,recoveryActive=false,openStake=0,initialBalance=100)=>capitalManagement({strategy,balance,initialBalance,recoveryActive,openStake});
    assert.equal(state(20.01).recoveryActive,false,strategy);
    assert.equal(state(20).recoveryActive,true,strategy);
    assert.equal(state(40,true).recoveryActive,true,strategy);
    assert.equal(state(99.99,true).recoveryActive,true,strategy);
    assert.equal(state(100,true).recoveryActive,false,strategy);
    assert.equal(state(0,true).recoveryActive,false,strategy);
    assert.equal(state(0,false,100).recoveryActive,false,strategy);
    assert.equal(state(0,true,20).recoveryActive,true,strategy);
    assert.equal(state(20,true,0,120).recoveryTarget,120,strategy);
    assert.equal(normalStakePercent({strategy,balance:2,initialBalance:10,maxStakePct:5}),100,strategy);
    for(const sizing of [normalStakePercent,probeStakePercent])
      assert.notEqual(sizing({strategy,balance:20,initialBalance:100,openStake:80,maxStakePct:50}),100,`${strategy}: locked stakes are not losses`);
  }
});

test('only the two cautious personalities reduce percentages at growth thresholds; the minimum still applies',()=>{
  for(const strategy of Object.keys(profiles)){
    const cautious=['conservative','volatilityGuard'].includes(strategy);
    for(const [balance,multiplier] of [[149.99,1],[150,.8],[199.99,.8],[200,.7]]){
      assert.equal(capitalManagement({strategy,balance,initialBalance:100}).stakeMultiplier,cautious?multiplier:1);
    }
  }
  assert.equal(normalStakePercent({strategy:'conservative',balance:200,initialBalance:100,maxStakePct:10,confidence:99}),7);
  assert.equal(normalStakePercent({strategy:'conservative',balance:50,initialBalance:25,maxStakePct:10,confidence:99}),10);
  assert.equal(capitalManagement({strategy:'conservative',balance:150,initialBalance:150}).mode,'NORMAL');
});

test('paper engine carries 2 -> 4 -> 8 recovery bets through reload and exits after 16, without real orders',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-capital-'));
  try{
    const f=fixture(),file=path.join(dir,'ledger.json'),inputs=[];
    const decisionProvider={describe:()=>({mode:'mock',simulated:true}),decide:async input=>{
      inputs.push(structuredClone(input));const recovery=input.account.capital_recovery;
      return {round_id:input.market.round_id,action:'BET',direction:'UP',stake_usdt:recovery?input.account.balance:5,
        stake_pct:recovery?100:500/input.account.balance,confidence:90,risk_mode:recovery?'ALL_IN':'NORMAL',factors:[],reason:'fixture',data_fresh:true,warnings:[]};
    }};
    const options={source:f.source,indicatorSource:f.indicatorSource,decisionProvider,policyFor:()=>f.policy,
      agentPolicies:[f.policy],initialBalance:10,now:f.now,file,leaseEnabled:false};
    let sim=createPredictionSimulation(options);sim.setEnabled(false);sim.setEnabled(true);
    const ledger=JSON.parse(fs.readFileSync(file,'utf8'));ledger.agents[0].cash=2;
    ledger.agents[0].orders=[{id:'prior-loss',status:'LOST',amount:8,payout:0,start:f.slot-ROUND,end:f.slot,settledAt:f.slot}];
    fs.writeFileSync(file,JSON.stringify(ledger));sim=createPredictionSimulation(options);
    f.setTime(f.slot);await sim.tick();
    let agent=sim.snapshot().agents[0];assert.equal(agent.orders.at(-1).amount,2);assert.equal(agent.orders.at(-1).intent.simulationOnly,true);
    assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).agents[0].capitalRecovery,true);
    sim=createPredictionSimulation(options);
    for(const [round,amount] of [[1,4],[2,8]]){
      f.setTime(f.slot+ROUND*round);await sim.tick();agent=sim.snapshot().agents[0];
      assert.equal(agent.orders.at(-1).amount,amount);assert.equal(agent.lastDecision.riskMode,'ALL_IN');
    }
    f.setTime(f.slot+ROUND*3);await sim.tick();
    assert.equal(inputs.at(-1).account.balance,16);assert.equal(inputs.at(-1).account.capital_recovery,false);
    assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).agents[0].capitalRecovery,false);
    assert.ok(!f.calls.some(args=>args.includes('place-order')||args.includes('quote')));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
