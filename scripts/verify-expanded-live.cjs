// Read-only public-data probe. No battle creation, wallet action, order, or AI API request.
const assert=require('node:assert/strict');
const {createBawRunner}=require('../server');
const {createPredictionSource,quoteFromBook,ROUND}=require('../prediction-sim');
const {createBinanceIndicatorSource}=require('../market-indicators');
const {buildDecisionContext,normalizePolicy,createMockDecisionProvider,validateDecision}=require('../ai-decision');
const {profiles,indicators}=require('../public/strategy-catalog');
(async()=>{
  const run=createBawRunner();
  const source=createPredictionSource(args=>{
    assert.equal(args[0],'prediction');assert.equal(args[1],'market');
    assert.ok(['search','detail','order-book'].includes(args[2]));return run(args);
  });
  const market=await source.marketFor(Math.floor(Date.now()/ROUND)*ROUND,'BTCUSDT');
  const [up,down,snapshot]=await Promise.all([source.book(market,'UP'),source.book(market,'DOWN'),createBinanceIndicatorSource().snapshot('BTCUSDT')]);
  const upQuote=quoteFromBook(up,market.markets[0].outcomes.find(o=>o.name==='Up').tokenId,Date.now(),1);
  const downQuote=quoteFromBook(down,market.markets[0].outcomes.find(o=>o.name==='Down').tokenId,Date.now(),1);
  const results=[];
  for(const strategy of Object.keys(profiles)){
    const policy=normalizePolicy({strategy,indicators:Object.keys(indicators),decisionVariance:profiles[strategy].variance,maxStakePct:profiles[strategy].maxStakePct},'probe');
    const input=buildDecisionContext({policy,indicators:snapshot,
      market:{roundId:market.startDate,secondsToClose:(market.endDate-Date.now())/1000,upOdds:upQuote.odds,downOdds:downQuote.odds,dataTimestamp:Math.min(upQuote.bookTime,downQuote.bookTime,snapshot.dataTimestamp)},
      account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0}});
    assert.equal(Object.keys(input.indicators).length,26);
    const raw=await createMockDecisionProvider().decide(input);
    let result;try{const plan=validateDecision(raw,{input,indicators:snapshot,policy});result={action:plan.action,direction:plan.direction,stake:plan.stake};}catch(error){result={action:'REJECTED',reason:error.code};}
    results.push({strategy,...result});
  }
  console.log(JSON.stringify({result:'PASS',observedAt:new Date().toISOString(),mode:'read-only public data with local deterministic decisions; virtual 100U; no orders',market:market.marketTopicId,upOdds:upQuote.odds,downOdds:downQuote.odds,groups:26,candles:snapshot.completedCandles,results}));
})().catch(error=>{console.error(error);process.exitCode=1;});
