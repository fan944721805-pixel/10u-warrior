// Read-only historical attribution. Never writes to the trading ledgers.
const fs = require('node:fs');
const path = require('node:path');

function loadHistory(directory) {
  const index = JSON.parse(fs.readFileSync(path.join(directory, 'simulation-battles.json')));
  const active = new Set(index.battles.map(b => b.id === 'default' ? 'rule-ai-ledger.json' : `battle-${b.id}.json`));
  const files = fs.readdirSync(directory).filter(name => /^(battle-.*|rule-ai-ledger)\.json$/.test(name));
  const ledgers = files.map(file => ({file, active:active.has(file), state:JSON.parse(fs.readFileSync(path.join(directory,file)))}));
  // Archives may contain pre-reset generations with identical order IDs.
  // Key by actual order identity AND placement time, not merely round+Agent.
  const archiveDir = path.join(directory, 'simulation-archives');
  if(fs.existsSync(archiveDir)) for(const dir of fs.readdirSync(archiveDir)) {
    const full = path.join(archiveDir,dir);
    if(!fs.statSync(full).isDirectory()) continue;
    for(const file of fs.readdirSync(full).filter(name=>/^(battle-.*|rule-ai-ledger|original-default)\.json$/.test(name))) {
      const state=JSON.parse(fs.readFileSync(path.join(full,file)));
      if(Array.isArray(state.agents)) ledgers.push({file:`simulation-archives/${dir}/${file}`,active:false,state});
    }
  }
  const seen = new Set(), rows=[];
  for(const ledger of ledgers) {
    const events = new Map((ledger.state.auditTrail||[]).map(e=>[e.id,e]));
    for(const agent of ledger.state.agents) for(const order of agent.orders||[]) {
      const key=JSON.stringify([order.topicId,agent.id,order.id,order.placedAt,order.amount]);
      if(seen.has(key)) continue;
      seen.add(key);
      const event=events.get(order.intent?.inputEventId);
      rows.push({file:ledger.file,active:ledger.active,agent:agent.id,strategy:event?.policy?.strategy||agent.policy?.strategy||agent.id,
        asset:ledger.state.config?.asset,period:ledger.state.config?.period,order,input:event?.input,policy:event?.policy,
        snapshot:events.get(event?.snapshotId),settled:['WON','LOST','SPLIT'].includes(order.status)});
    }
  }
  return {rows,ledgers};
}
function summarize(rows) {
  const s=rows.filter(r=>r.settled), binary=s.filter(r=>r.order.status!=='SPLIT');
  const sum=fn=>s.reduce((v,r)=>v+fn(r.order),0), wins=binary.filter(r=>r.order.status==='WON').length;
  return {orders:rows.length,settled:s.length,open:rows.filter(r=>r.order.status==='OPEN').length,wins,losses:binary.length-wins,
    winRate:binary.length?wins/binary.length:null,stake:sum(o=>o.amount),pnl:sum(o=>o.payout-o.amount),
    roi:sum(o=>o.payout-o.amount)/(sum(o=>o.amount)||1),equalStakePnl:sum(o=>o.payout/o.amount-1),
    meanConfidence:sum(o=>o.decision?.confidence||0)/(s.length||1),
    meanStakePct:sum(o=>o.decision?.stakePct||0)/(s.length||1),
    feesIncluded:s.filter(r=>r.order.quote?.feesIncluded===true).length,
    uniqueMarkets:new Set(s.map(r=>r.order.topicId)).size};
}
function group(rows, fn) {
  const groups=new Map();for(const row of rows){const key=fn(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  return Object.fromEntries([...groups].map(([key,value])=>[key,summarize(value)]));
}
function report(history) {
  const {rows,ledgers}=history;
  const decisions=ledgers.filter(l=>l.active).flatMap(l=>l.state.auditTrail||[]).filter(e=>e.type==='DECISION');
  return {asOf:new Date().toISOString(),scope:'Paper ledgers; archive orders deduplicated; OPEN excluded from realized PnL',
    overall:summarize(rows),current:summarize(rows.filter(r=>r.active)),
    byStrategy:group(rows,r=>r.strategy),currentByStrategy:group(rows.filter(r=>r.active),r=>r.strategy),
    bySource:group(rows,r=>r.order.marketSource||r.order.settlement?.source||'unknown'),
    byRisk:group(rows,r=>r.order.decision?.riskMode||'legacy'),
    byConfidence:group(rows,r=>Math.floor((r.order.decision?.confidence||0)/10)*10),
    byEntry:group(rows,r=>r.input?.market?.entry_mode||'boundary'),
    byDirection:group(rows,r=>r.order.direction),
    currentDecisions:decisions.reduce((acc,e)=>{const key=e.risk==='REJECTED'?e.decision?.reason:e.risk;acc[key]=(acc[key]||0)+1;return acc;},{}),
    worst:rows.filter(r=>r.settled).sort((a,b)=>(a.order.payout-a.order.amount)-(b.order.payout-b.order.amount)).slice(0,10).map(r=>({file:r.file,strategy:r.strategy,id:r.order.id,amount:r.order.amount,pnl:r.order.payout-r.order.amount,confidence:r.order.decision?.confidence,risk:r.order.decision?.riskMode}))};
}
if(require.main===module) console.log(JSON.stringify(report(loadHistory(process.argv[2]||path.resolve(__dirname,'../.data'))),null,2));
module.exports={loadHistory,summarize,group,report};
