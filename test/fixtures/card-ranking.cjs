// HTTP-shaped ledger fixtures for browser layout and ranking aggregation checks.
const reports=Array.from({length:7},(_,index)=>({id:String(index+1),createdAt:index+1,mode:'paper',placeholder:false,
  agents:['liangXi','czBrother'].map((strategy,i)=>({id:strategy,policy:{strategy},orders:[
    {status:'WON',amount:5,payout:10+index+i},
    {status:'LOST',amount:2+i,payout:0},
    {status:'SPLIT',amount:1,payout:.5},
    {status:'OPEN',amount:100},
  ]}))}));
for(const report of reports){
 report.name='Ledger '+report.id;report.serverTime=100000;report.status='paused';report.enabled=false;report.roundCount=1;report.config={initialBalance:200,period:'5m',agents:[]};
 for(const agent of report.agents){
  agent.policy=require('../../ai-decision').normalizePolicy({...agent.policy,coin:'BTC',aiConnectionId:'none'},agent.id);
  agent.orders.forEach((o,i)=>Object.assign(o,{id:'o'+i,direction:'UP',placedAt:1000+i*1000,settledAt:o.status==='OPEN'?null:2000+i*1000,quote:{odds:2,shares:o.amount*2},referencePrice:100}));
  agent.equity=200+agent.orders.filter(o=>o.status!=='OPEN').reduce((n,o)=>n+o.payout-o.amount,0);agent.reserved=100;agent.cash=agent.equity-100;agent.wins=1;agent.losses=1;agent.addedCapital=0;agent.topUps=[];report.config.agents.push(agent.policy);
 }
}
async function install(page){
  await page.route('**/api/simulation/battles?view=summary',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({battles:reports.map(({id,createdAt,name})=>({id,createdAt,name}))})}));
  await page.route('**/api/simulation?*',route=>{const id=new URL(route.request().url()).searchParams.get('battleId');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(reports.find(b=>b.id===id))});});
}
module.exports={reports,install};
