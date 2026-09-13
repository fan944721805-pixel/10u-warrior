const test=require('node:test');
const assert=require('node:assert/strict');
const {sellValue,createPositionValuation}=require('../position-valuation');
const {equityEstimate}=require('../public/market-values');
const {createWarriorServer}=require('../server');
const start=1800000000000;
const topic=()=>({marketTopicId:'btc-1',symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+300000,
  markets:[{marketId:'m1',status:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
const battle=()=>({id:'b1',config:{asset:'BTCUSDT'},agents:[{id:'A',cash:80,equity:100,policy:{coin:'BTC'},orders:[
  {id:'o1',topicId:'btc-1',tokenId:'up',direction:'UP',start,end:start+300000,status:'OPEN',amount:20,quote:{shares:40,odds:2}}
]}]});
const book=(at=start+1000)=>({tokenId:'up',timestamp:at,bids:[{price:.6,size:20},{price:.65,size:20}]});

test('bid depth values exact saved shares, not current buy odds or spot prices',()=>{
  assert.equal(sellValue(book(),'up',40,start+1000).value,25);
  assert.equal(sellValue({...book(),bids:[{price:0,size:40}]},'up',40,start+1000).value,0);
  for(const [patch,code] of [[{tokenId:'down'},'STALE_BOOK'],[{timestamp:start-10000},'STALE_BOOK'],[{timestamp:start+4000},'STALE_BOOK'],
    [{bids:[]},'NO_BIDS'],[{bids:[{price:.5,size:10}]},'INSUFFICIENT_BIDS'],[{bids:[{price:1.5,size:50}]},'INVALID_BOOK']]){
    assert.throws(()=>sellValue({...book(),...patch},'up',40,start+1000),{code});
  }
});
test('read-only estimates fluctuate while ledger equity, cash, and orders stay unchanged',async()=>{
  let time=start+1000;
  const data=battle(),saved=structuredClone(data);
  const estimate=createPositionValuation({now:()=>time,source:{detail:async()=>topic(),book:async()=>book(time)}});
  const result=await estimate(data);
  assert.equal(result.agents[0].estimatedEquity,105);
  assert.equal(result.agents[0].floatingPnl,5);
  assert.equal(result.agents[0].bookEquity,100);
  assert.deepEqual(data,saved);
  assert.equal(equityEstimate(data,result,time).estimatedEquity,105);
  assert.equal(equityEstimate(data,result,time+10001).estimatedEquity,null);
  const settled=structuredClone(data);settled.agents[0].cash=120;settled.agents[0].equity=120;settled.agents[0].orders[0].status='WON';
  assert.equal(equityEstimate(settled,result,time).estimatedEquity,120);
  const changed=structuredClone(data);changed.agents[0].orders[0].id='new-order';
  assert.equal(equityEstimate(changed,result,time).estimatedEquity,null);
  assert.equal(equityEstimate({...data,id:'other'},result,time).estimatedEquity,null);
});
test('new bids change only the estimate, and a failed refresh does not keep the old mark',async()=>{
  let time=start+1000,price=.625,failed=false;
  const data=battle(),original=structuredClone(data);
  const estimate=createPositionValuation({now:()=>time,source:{detail:async()=>topic(),book:async()=>{
    if(failed)throw Error('connection lost');return {tokenId:'up',timestamp:time,bids:[{price,size:40}]};
  }}});
  assert.equal((await estimate(data)).agents[0].estimatedEquity,105);
  time+=5001;price=.7;
  assert.equal((await estimate(data)).agents[0].estimatedEquity,108);
  time+=5001;price=.4;
  assert.equal((await estimate(data)).agents[0].estimatedEquity,96);
  time+=5001;failed=true;
  assert.equal((await estimate(data)).agents[0].estimatedEquity,null);
  assert.deepEqual(data,original);
});
test('same-token positions share depth and in-flight quote reads across polling tabs',async()=>{
  const data=battle();data.agents[0].orders[0].quote.shares=20;
  data.agents.push({...structuredClone(data.agents[0]),id:'B'});
  let detailCalls=0,bookCalls=0;
  const estimate=createPositionValuation({now:()=>start+1000,source:{detail:async()=>{detailCalls++;return topic()},book:async()=>{bookCalls++;return book()}}});
  const [first]=await Promise.all([estimate(data),estimate(data)]);
  assert.equal(detailCalls,1);assert.equal(bookCalls,1);
  assert.deepEqual(first.agents.map(a=>a.estimatedEquity),[92.5,92.5]);
  const thin=createPositionValuation({now:()=>start+1000,source:{detail:async()=>topic(),book:async()=>({...book(),bids:[{price:.65,size:20}]})}});
  assert.ok((await thin(data)).agents.every(a=>a.estimatedEquity===null && a.reason==='INSUFFICIENT_BIDS'));
});
test('mismatched markets, tokens, absent quotes and expired contracts never receive an estimate',async()=>{
  for(const [mutate,detail,quotes] of [
    [()=>{},()=>({...topic(),marketTopicId:'wrong'}),()=>book()],
    [()=>{},()=>({...topic(),symbol:'ETHUSDT'}),()=>book()],
    [d=>d.agents[0].orders[0].tokenId='other',()=>topic(),()=>book()],
    [d=>d.agents[0].orders[0].quote.shares=null,()=>topic(),()=>book()],
    [()=>{},()=>topic(),()=>{throw Error('offline')}],
  ]){
    const data=battle();mutate(data);
    const estimate=createPositionValuation({now:()=>start+1000,source:{detail:async()=>detail(),book:async()=>quotes()}});
    assert.equal((await estimate(data)).agents[0].estimatedEquity,null);
  }
  const expired=createPositionValuation({now:()=>start+300000,source:{detail:async()=>{throw Error('must not read expired book')}}});
  assert.equal((await expired(battle())).agents[0].reason,'AWAITING_SETTLEMENT');
});
test('valuation HTTP endpoint is read-only and separate from simulation snapshot',async()=>{
  const data=battle(),original=structuredClone(data);
  const server=createWarriorServer({walletCli:async()=>{throw Error('no wallet calls')},paperFile:null,now:()=>start+1000,
    simulation:{snapshot:id=>{assert.equal(id,'b1');return structuredClone(data)},tick:async()=>{},stop(){}},
    predictionSource:{detail:async()=>topic(),book:async()=>book()}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const url=`http://127.0.0.1:${server.address().port}`;
    const response=await fetch(url+'/api/simulation/valuation?battleId=b1');
    assert.equal(response.status,200);assert.equal((await response.json()).agents[0].estimatedEquity,105);
    assert.deepEqual(await (await fetch(url+'/api/simulation?battleId=b1')).json(),original);
    assert.deepEqual(data,original);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
