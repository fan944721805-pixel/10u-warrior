// Read-only comparison of the connected phone before and after an in-place update.
const {connect}=require('./android-cdp.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const c=await connect('10AG3409MC002U8',19338);
  const ui=await c.attach(p=>p.url==='https://localhost/');
  try{
    const before=JSON.parse(fs.readFileSync('.data/device-backups/android-0.1.7/phone-before.json'));
    const result=await ui.evaluate(`(async()=>{const api=Warrior.simulationApi;return{service:await api.serviceStatus(),battles:await Promise.all((await api.list()).battles.map(async b=>{const s=await api.report(b.id);return{id:s.id,name:s.name,enabled:s.enabled,agents:s.agents.map(a=>({id:a.id,cash:a.cash,orders:a.orders.length,orderIds:a.orders.map(o=>o.id)}))}}))}})()`);
    for(const b of before){
      const next=result.battles.find(n=>n.id===b.id);assert.ok(next,'Existing battle retained');assert.equal(next.name,b.name);
      for(const a of b.agents){const nextAgent=next.agents.find(n=>n.id===a.id);assert.ok(nextAgent);for(const id of a.orderIds)assert.ok(nextAgent.orderIds.includes(id),'Existing order retained');}
    }
    result.balanceUnchanged=before.every(b=>b.agents.every(a=>result.battles.find(n=>n.id===b.id).agents.find(n=>n.id===a.id).cash===a.cash));
    result.ordersRetained=true;
    fs.writeFileSync('.data/device-backups/android-0.1.7/phone-after.json',JSON.stringify(result,null,2));
    console.log(JSON.stringify({service:result.service,balanceUnchanged:result.balanceUnchanged,ordersRetained:true,battles:result.battles.map(b=>({name:b.name,enabled:b.enabled,orders:b.agents.reduce((n,a)=>n+a.orders,0)}))},null,2));
  }finally{ui.close();c.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1});
