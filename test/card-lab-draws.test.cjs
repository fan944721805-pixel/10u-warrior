const {test}=require('node:test');
const assert=require('node:assert/strict');
const {initial,refill,spend,INTERVAL}=require('../public/card-lab-draws.js');
const start=1800000000000;
test('five starting draws exhaust without resetting the recharge anchor',()=>{
  let budget=initial();
  for(let i=0;i<5;i++){budget=spend(budget,start+i*1000);assert.equal(budget.remaining,4-i);assert.equal(budget.nextAt,start+INTERVAL);}
  assert.equal(spend(budget,start+5000),null);
});
test('a draw returns at exactly ten minutes, not one millisecond earlier',()=>{
  const budget={remaining:0,nextAt:start+INTERVAL};
  assert.equal(spend(budget,start+INTERVAL-1),null);
  assert.deepEqual(spend(budget,start+INTERVAL),{remaining:0,nextAt:start+2*INTERVAL});
});
test('offline time restores each full interval and preserves its remainder',()=>{
  const budget={remaining:0,nextAt:start+INTERVAL};
  assert.deepEqual(refill(budget,start+3.5*INTERVAL),{remaining:3,nextAt:start+4*INTERVAL});
  assert.deepEqual(refill(budget,start+100*INTERVAL),initial());
});
test('full storage has no banked time and starts a fresh ten-minute timer',()=>{
  const full=refill({remaining:4,nextAt:start},start+100*INTERVAL);
  assert.deepEqual(spend(full,start+100*INTERVAL),{remaining:4,nextAt:start+101*INTERVAL});
});
test('reload serialization preserves the countdown, backward clock does not grant draws',()=>{
  const budget={remaining:0,nextAt:start+INTERVAL};
  assert.deepEqual(refill(JSON.parse(JSON.stringify(budget)),start+5000),budget);
  assert.equal(spend(budget,start-INTERVAL),null);
});
