const test = require('node:test');
const assert = require('node:assert/strict');
const { isDefeated } = require('../public/agent-defeat');
const { buildSeries } = require('../public/agent-equity');
const simulation = { createdAt:1000, serverTime:9000, config:{initialBalance:10} };
const lost = { cash:0, reserved:0, equity:0, orders:[{status:'LOST', amount:10, payout:0, settledAt:5000}] };
test('only settled zero funds are defeated; all-in, overdue open bets and unknown funds stay alive', () => {
  assert.equal(isDefeated(simulation, lost), true);
  for (const agent of [
    {...lost,cash:0.01,equity:0.01}, {...lost,reserved:10,equity:10},
    {...lost,orders:[{status:'OPEN',amount:10,end:2000}]},
    {...lost,equity:undefined}, {...lost,cash:null}, {...lost,reserved:undefined}, {...lost,orders:undefined}
  ]) assert.equal(isDefeated(simulation,agent),false);
  assert.equal(isDefeated({...simulation,placeholder:true},lost),false);
});
test('defeated equity history keeps the final loss and restores correctly after existing top-up', () => {
  const before = structuredClone(lost);
  assert.deepEqual(buildSeries(simulation,lost).points.map(p=>p.value),[10,0,0]);
  assert.equal(isDefeated(simulation,lost),true);
  assert.deepEqual(lost,before);
  const revived = {...lost,cash:10,equity:10,addedCapital:10,topUps:[{at:6000,amount:10}]};
  assert.equal(isDefeated(simulation,revived),false);
  assert.equal(buildSeries(simulation,revived).profit,-10);
});
