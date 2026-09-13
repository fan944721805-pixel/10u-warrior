// Frozen-input paired replay: same account/streak/amount rules, observed books,
// timestamp and outcome. This is not a portfolio backtest or future validation.
const fs=require('node:fs');
const {createMockDecisionProvider,validateDecision}=require('../ai-decision');
const {roundContext}=require('../round-direction');
const {quoteFromBook}=require('../prediction-sim');
const {loadHistory}=require('./audit-betting.cjs');

function capture(directory) {
  const history=loadHistory(directory),labels=new Map(),rows=[];
  for(const row of history.rows.filter(r=>r.settled)) {
    const o=row.order,outcome=o.status==='SPLIT'?'SPLIT':o.status==='WON'?o.direction:o.direction==='UP'?'DOWN':'UP';
    const id=String(o.topicId);
    if(labels.has(id)&&labels.get(id)!==outcome)throw new Error(`Conflicting settlement: ${id}`);
    labels.set(id,outcome);
  }
  for(const ledger of history.ledgers.filter(l=>l.active)) {
    const events=new Map(ledger.state.auditTrail.map(e=>[e.id,e]));
    for(const e of ledger.state.auditTrail.filter(e=>e.type==='DECISION_INPUT')) {
      const snapshot=events.get(e.snapshotId),outcome=labels.get(String(snapshot?.market?.marketTopicId));
      if(!snapshot||!outcome)continue;
      const decision=ledger.state.auditTrail.find(d=>d.type==='DECISION'&&d.inputEventId===e.id);
      rows.push({ledger:ledger.file,input:e.input,policy:e.policy,indicators:snapshot.indicators,market:snapshot.market,
        books:snapshot.books,timestamp:e.recordedAt,outcome,originalDirection:decision?.decision?.direction});
    }
  }
  return rows.sort((a,b)=>a.timestamp-b.timestamp);
}

async function replay(events) {
  const provider=createMockDecisionProvider();
  const totals={before:{bets:0,wins:0,losses:0,splits:0,pnl:0,unitPnl:0},after:{bets:0,wins:0,losses:0,splits:0,pnl:0,unitPnl:0}};
  const changes=[];let matchedHistorical=0;
  const placed={before:new Set(),after:new Set()};
  for(const row of events) {
    const {input,policy,indicators,market,books,timestamp,outcome}=row;
    const pair={};
    for(const side of ['before','after']) {
      const roundKey=JSON.stringify([row.ledger,input.market.asset,input.market.round_id,input.policy.agent_id]);
      if(placed[side].has(roundKey)){pair[side]={action:'ALREADY_ENTERED'};continue;}
      const context=structuredClone(input);
      delete context.market.round_context;
      if(side==='after') context.market.round_context=roundContext(market,indicators,Number(input.market.round_id),input.market.round_duration_seconds,input.market.data_timestamp);
      let raw,plan;
      try {
        raw=await provider.decide(context);
        plan=validateDecision(raw,{input:context,indicators,policy,now:timestamp});
        if(plan.action!=='BET'){pair[side]={action:'SKIP'};continue;}
        const book=books[plan.direction==='UP'?'up':'down'];
        const token=String(market.markets[0].outcomes.find(o=>o.name===(plan.direction==='UP'?'Up':'Down')).tokenId);
        const quote=quoteFromBook(book,token,timestamp,plan.stake);
        if(plan.confidence/100*quote.odds<=1)throw Object.assign(new Error(),{code:'AI_EDGE_LOST_TO_SLIPPAGE'});
        const result=outcome==='SPLIT'?'splits':outcome===plan.direction?'wins':'losses';
        const payout=result==='wins'?quote.shares:result==='splits'?quote.shares*.5:0;
        totals[side].bets++;totals[side][result]++;totals[side].pnl+=payout-plan.stake;
        placed[side].add(roundKey);
        totals[side].unitPnl+=payout/plan.stake-1;
        pair[side]={action:'BET',direction:plan.direction,stake:plan.stake,result,pnl:payout-plan.stake};
      }catch(e){pair[side]={action:'SKIP',reason:e.code||e.message};}
    }
    if(row.originalDirection===pair.before.direction)matchedHistorical++;
    if(JSON.stringify(pair.before)!==JSON.stringify(pair.after))changes.push({round:input.market.round_id,agent:input.policy.agent_id,asset:input.market.asset,strategy:policy.strategy,...pair});
  }
  return {events:events.length,uniqueRounds:new Set(events.map(r=>`${r.input.market.asset}:${r.input.market.round_id}`)).size,
    matchedHistorical,totals,changes,frequencyRatio:totals.before.bets?totals.after.bets/totals.before.bets:null,
    limitations:['Frozen account states, not compounded portfolio returns','Current code paired replay, not all historical code versions','Only rounds with known settlement included','Observed book fills before fees; no live quote replay','Same data used for diagnosis; no out-of-sample profitability claim']};
}
if(require.main===module) {
  if(process.argv[2]==='--capture')fs.writeFileSync(process.argv[4],JSON.stringify(capture(process.argv[3])));
  else replay(JSON.parse(fs.readFileSync(process.argv[2]))).then(r=>console.log(JSON.stringify(r,null,2)));
}
module.exports={replay,capture};
