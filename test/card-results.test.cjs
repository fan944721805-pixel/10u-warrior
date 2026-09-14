const test=require('node:test');
const assert=require('node:assert/strict');
const {history}=require('../public/card-results');
const battle=(id,orders,extra={})=>({id,createdAt:Number(id),agents:[{policy:{strategy:'smart'},orders}],...extra});
test('ranking reconciles settled profit, counts split settlements separately and ignores open exposure/topups',()=>{
  const result=history([battle('1',[{status:'WON',amount:5,payout:9},{status:'LOST',amount:2,payout:0},{status:'SPLIT',amount:3,payout:2.5},{status:'OPEN',amount:99}],{addedCapital:1000})]);
  assert.deepEqual(result.entries[0].battles[0],{id:'1',net:150,bets:3,wins:1,losses:1,neutral:1,stake:1000,payout:1150,profit:400,loss:250});
});
test('history includes more than five sessions, excludes placeholders and keeps distinct card definitions separate',()=>{
  const reports=Array.from({length:7},(_,i)=>battle(String(i+1),[]));
  reports.push(battle('8',[],{placeholder:true}));
  reports[1].agents[0].policy.cardPolicyHash='new-definition';
  reports[2].agents.push({policy:{strategy:'smart'},orders:[]});
  const data=history(reports.reverse());
  assert.deepEqual(data.battleIds,['1','2','3','4','5','6','7']);
  assert.equal(data.entries.length,2);assert.equal(data.entries.find(e=>e.id==='legacy:smart').battles.length,6);
});
test('incomplete or malformed settled records fail rather than fabricate a zero result',()=>{
  assert.throws(()=>history([battle('1',[{status:'WON',amount:5}])]),/RANKING_DATA_INVALID/);
  assert.throws(()=>history([battle('1',[{status:'UNKNOWN',amount:5,payout:0}])]),/RANKING_DATA_INVALID/);
});
