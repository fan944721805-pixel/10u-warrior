// In-memory persona UI fixture. No ledger, wallet, provider or market requests.
const {createWarriorServer}=require('../server');
const {normalizePolicy,buildDecisionContext,createMockDecisionProvider,validateDecision,decisionAudit}=require('../ai-decision');
const catalog=require('../public/strategy-catalog');
(async()=>{
  const now=Date.now(),start=Math.floor(now/300000)*300000,provider=createMockDecisionProvider();
  const indicators={dataTimestamp:now,priceChangePct:{oneMinute:.1,fiveMinutes:.3},rsi14:65,ema:{ema5:105,ema20:100},spotOrderBookImbalance:.3,atr:{value:.2,percent:.2},spread:{basisPoints:2},longReturns:{fifteenMinutes:.7,sixtyMinutes:1.6}};
  const agents=await Promise.all(catalog.divinationStrategies.map(async(strategy,index)=>{
    const policy=normalizePolicy({id:strategy,strategy,provider:'claude',coin:'BTC'},strategy);
    const input=buildDecisionContext({policy,indicators,market:{roundId:start+index,secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:now},account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0}});
    const plan=validateDecision(await provider.decide(input),{policy,input,indicators,now});
    return {id:strategy,policy,cash:100,equity:100,reserved:0,wins:0,losses:0,lastStatus:'SKIPPED',orders:[],lastDecision:decisionAudit({provider,input,plan,indicators})};
  }));
  const snapshot=()=>({id:'oracle-ui-fixture',mode:'paper',pricing:'fixture',enabled:false,status:'paused',serverTime:now,nextSlot:start+300000,roundCount:1,initialTotal:200,config:{asset:'BTCUSDT',initialBalance:100,rounds:20,agents:agents.map(a=>a.policy)},auditTrail:[],decisionEngine:provider.describe(),agents});
  const server=createWarriorServer({now:()=>now,paperFile:null,walletCli:async()=>{throw Error('Fixture wallet disabled');},simulation:{snapshot,list:()=>[snapshot()],leaderboard:()=>[],touch(){},tick:async()=>{},getStrategies:()=>({agents:agents.map(a=>a.policy)}),setStrategies:()=>({agents:agents.map(a=>a.policy)})},predictionSource:{detail:async()=>{throw Error('Fixture market disabled');}}});
  server.listen(0,'127.0.0.1',()=>console.log(`DIVINATION_UI_FIXTURE http://127.0.0.1:${server.address().port}`));
})().catch(error=>{console.error(error);process.exitCode=1;});
