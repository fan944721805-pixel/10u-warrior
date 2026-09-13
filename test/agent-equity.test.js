const test=require('node:test');
const assert=require('node:assert/strict');
const {buildSeries}=require('../public/agent-equity');
const simulation={createdAt:1000,serverTime:10000,config:{initialBalance:100}};
test('book equity separates deposits from profit and does not treat open stakes as losses',()=>{
  const agent={cash:117,reserved:8,equity:125,addedCapital:20,topUps:[{at:5000,amount:20}],orders:[
    {status:'OPEN',start:8000,amount:8},
    {status:'LOST',settledAt:7000,amount:5,payout:0},
    {status:'WON',settledAt:3000,amount:10,payout:20},
  ]};
  const before=structuredClone(agent),series=buildSeries(simulation,agent);
  assert.deepEqual(series.points.map(p=>[p.at,p.value,p.kind]),[[1000,100,'initial'],[3000,110,'settlement'],[5000,130,'capital'],[7000,125,'settlement'],[10000,125,'current']]);
  assert.equal(series.profit,5);assert.equal(series.deposits,20);assert.deepEqual(agent,before);
});
test('empty and all-open ledgers stay flat; zero balances and split payouts are valid',()=>{
  assert.equal(buildSeries(simulation,{cash:100,reserved:0,orders:[]}).hasChanges,false);
  assert.deepEqual(buildSeries(simulation,{cash:0,reserved:100,orders:[{status:'OPEN',amount:100,start:2000}]}).points.map(p=>p.value),[100,100]);
  assert.equal(buildSeries(simulation,{equity:0,orders:[{status:'LOST',amount:100,payout:0,end:5000}]}).current,0);
  assert.equal(buildSeries(simulation,{equity:95,orders:[{status:'SPLIT',amount:10,payout:5,settledAt:5000}]}).profit,-5);
});
test('incomplete ledgers never invent a history or silently count added funds as profit',()=>{
  assert.equal(buildSeries(simulation,{equity:110,orders:[]}),null);
  assert.equal(buildSeries(simulation,{equity:110,addedCapital:10,orders:[]}),null);
  assert.equal(buildSeries(simulation,{equity:100,orders:[{status:'WON',amount:10,payout:null,end:3000}]}),null);
});
test('offline wins use their recorded simulated odds and ended charts stop at the end time',()=>{
  const series=buildSeries({...simulation,endedAt:6000},{equity:103,orders:[{status:'WON',amount:10,settledAt:4000,quote:{source:'offline-simulated',odds:1.3}}]});
  assert.equal(series.profit,3);assert.equal(series.points.at(-1).at,6000);
});
