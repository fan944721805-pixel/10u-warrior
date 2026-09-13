// Isolated UI fixture: fake positions/books only, no persistence or wallet access.
const {createWarriorServer}=require('../server');
const {normalizePolicy}=require('../ai-decision');
const launched=Date.now(),start=Math.floor(launched/300000)*300000;
const fixtureNow=()=>start+60000+(Date.now()-launched)%120000;
const policy=normalizePolicy({id:'A',strategy:'aggressive',provider:'claude',coin:'BTC'},'A');
function snapshot(id){
  if(process.argv.includes('--battles')) {
    const second=id==='fixture-battle-2';
    const policy=normalizePolicy({id:'A',strategy:second?'smart':'aggressive',provider:'claude',coin:second?'ETH':'BTC'},'A');
    return {id:second?'fixture-battle-2':'fixture-battle-1',mode:'paper',pricing:'fixture',enabled:true,status:'running',serverTime:fixtureNow(),nextSlot:start+300000,roundCount:second?2:7,initialTotal:100,
      config:{asset:second?'ETHUSDT':'BTCUSDT',initialBalance:100,rounds:20,agents:[policy]},auditTrail:[],decisionEngine:{mode:'mock'},
      agents:[{id:'A',policy,cash:second?120:90,equity:second?120:90,reserved:0,wins:1,losses:1,lastStatus:'WAITING',orders:[]}]};
  }
  if(process.argv.includes('--tiers')) {
    const policies=['aggressive','smart','conservative'].map((strategy,index)=>normalizePolicy({id:String(index),strategy,provider:'claude',coin:'BTC'},String(index)));
    return {id:'valuation-ui-fixture',name:'外框 UI 测试',mode:'paper',pricing:'fixture',enabled:false,status:'paused',serverTime:fixtureNow(),nextSlot:start+300000,roundCount:3,initialTotal:300,
      config:{asset:'BTCUSDT',initialBalance:100,rounds:20,agents:policies},auditTrail:[],decisionEngine:{mode:'mock'},
      agents:policies.map((policy,index)=>({id:policy.id,policy,cash:[210,320,40][index],equity:[210,320,40][index],reserved:0,wins:2,losses:1,winRate:2/3,lastStatus:'WAITING',orders:[]}))};
  }
  return {id:'valuation-ui-fixture',name:'估值 UI 测试',mode:'paper',pricing:'fixture',enabled:false,status:'paused',
    serverTime:fixtureNow(),nextSlot:start+300000,roundCount:1,initialTotal:100,
    config:{asset:'BTCUSDT',initialBalance:100,rounds:20,agents:[policy]},auditTrail:[],
    decisionEngine:{mode:'mock'},agents:[{id:'A',policy,cash:80,equity:100,reserved:20,wins:0,losses:0,winRate:null,lastStatus:'OPEN',
      ...(process.argv.includes('--detail')?{lastDecision:{roundId:start,action:'BET',direction:'UP',stake:20,confidence:74,riskMode:'ADD_ON',reason:'短线、动量和主动买卖同向；连胜情绪加码',
        indicators:{price_change_pct:{oneMinute:.018,fiveMinutes:.042},rsi_14:61.4,ema_5_20:{ema5:77280,ema20:77260},volume_ratio:1.32,spot_order_book_imbalance:.086,market_odds:{up:2,down:1.87}}}}:{}),
      orders:[{id:'fixture-order',topicId:'fixture-topic',tokenId:'up',direction:'UP',start,end:start+300000,placedAt:launched,
        status:'OPEN',amount:20,quote:{shares:40,odds:2,source:'fixture'}}]}]};
}
const server=createWarriorServer({now:fixtureNow,paperFile:null,walletCli:async()=>{throw Error('UI fixture: wallet disabled')},
  simulation:{snapshot,list:()=>process.argv.includes('--battles')?[snapshot('fixture-battle-1'),snapshot('fixture-battle-2')]:[snapshot()],leaderboard:()=>[],touch(){},tick:async()=>{},
    getStrategies:()=>({agents:[policy]}),setStrategies:()=>({agents:[policy]})},
  predictionSource:{detail:async()=>({marketTopicId:'fixture-topic',symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',
    startDate:start,endDate:start+300000,markets:[{marketId:'fixture-market',status:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]}),
    book:async()=>({tokenId:'up',timestamp:fixtureNow(),bids:[{price:Math.floor((Date.now()-launched)/15000)%2 ? .7 : .625,size:40}]})}
});
server.listen(0,'127.0.0.1',()=>console.log(`VALUATION_UI_FIXTURE http://127.0.0.1:${server.address().port}`));
