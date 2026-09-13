const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateIndicatorSnapshot,createBinanceIndicatorSource}=require('../market-indicators');
const {indicators,profiles}=require('../public/strategy-catalog');
const {rows,depth}=require('./fixtures/indicator-series.cjs');
const time=1800000000000;
const calculate=(klines=rows(time),book=depth)=>calculateIndicatorSnapshot({symbol:'BTCUSDT',klines,depth:book,receivedAt:time});
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('26 input groups share one catalog; analytic ramp checks extended formulas and units',()=>{
  assert.equal(Object.keys(indicators).length,26);assert.equal(Object.keys(profiles).length,16);
  const s=calculate();
  assert.equal(s.completedCandles,199);
  assert.ok(Object.values(s.availability).every(status=>status==='READY'));
  near(s.sma.sma5,297);near(s.sma.sma20,289.5);near(s.sma.sma50,274.5);
  near(s.macd.line,7);near(s.macd.signal,7);near(s.macd.histogram,0);
  near(s.bollinger.middle,289.5);near(s.bollinger.upper,289.5+2*Math.sqrt(33.25));
  near(s.bollinger.percentB,(9.5+2*Math.sqrt(33.25))/(4*Math.sqrt(33.25)));
  near(s.atr.value,3);near(s.atr.percent,3/299*100);
  near(s.adx.adx,100);near(s.adx.plusDI,100/3);near(s.adx.minusDI,0);
  near(s.stochastic.k,93.75);near(s.stochastic.d,93.75);near(s.williams,-6.25);
  near(s.cci,9.5/(0.015*5));near(s.mfi,100);near(s.obv.change20,2000);
  near(s.vwap.value,289.5);near(s.vwap.distancePct,(299/289.5-1)*100);
  near(s.roc.tenMinutes,(299/289-1)*100);near(s.roc.twentyMinutes,(299/279-1)*100);near(s.momentum,10);
  assert.deepEqual(s.donchian,{upper:299,lower:277,close:299,breakout:0});
  near(s.takerFlow.buyRatio,0.6);near(s.takerFlow.netBase,100);
  near(s.cmf,1/3);near(s.longReturns.sixtyMinutes,(299/239-1)*100);
  near(s.spread.microprice,(300.01*4+300)/5);
  assert.ok(s.volatility.perMinutePct>0&&s.volatility.perMinutePct<0.01);
});
test('unfinished candles do not repaint any completed indicator; Donchian excludes current decision candle',()=>{
  const raw=rows(time),before=calculate(raw);
  raw.at(-1)[2]='9001';raw.at(-1)[4]='9000';raw.at(-1)[5]='500';raw.at(-1)[9]='400';
  const after=calculate(raw);
  for(const definition of Object.values(indicators).filter(item=>!['odds','spread','orderbook'].includes(item.key))) assert.deepEqual(after[definition.snapshotKey],before[definition.snapshotKey]);
  raw.at(-2)[2]='500';raw.at(-2)[4]='499';
  const breakout=calculate(raw).donchian;
  assert.equal(breakout.upper,299);assert.equal(breakout.breakout,1);
});
test('short/missing volume history and zero denominators remain unavailable, malformed OHLC/depth rejected',()=>{
  const short=calculate(rows(time,30).map(row=>row.slice(0,7)));
  for(const key of ['macd','sma','vwap','takerFlow','longReturns']) assert.equal(short[key],null,key);
  const flat=rows(time).map(row=>[row[0],'100','100','100','100','100',row[6],'10000',100,'50','5000','0']);
  const s=calculate(flat);
  for(const key of ['bollinger','adx','stochastic','cci','williams','mfi']) assert.equal(s[key],null,key);
  assert.equal(s.rsi14,50);assert.equal(s.atr.value,0);
  const malformed=rows(time);malformed[15][9]='101';assert.throws(()=>calculate(malformed),{code:'INDICATOR_DATA_INVALID'});
  const crossed={bids:[['301','1']],asks:[['300','1']]};assert.throws(()=>calculate(rows(time),crossed),{code:'INDICATOR_DATA_INVALID'});
});
test('expanded snapshots keep two public reads and share in-flight work across consumers',async()=>{
  let calls=0;
  const source=createBinanceIndicatorSource({now:()=>time,fetchImpl:async url=>{
    calls++;assert.ok(url.startsWith('https://data-api.binance.vision/api/v3/'));
    if(url.includes('klines'))assert.equal(new URL(url).searchParams.get('limit'),'200');
    return {ok:true,json:async()=>url.includes('klines')?rows(time):depth};
  }});
  const values=await Promise.all(Array.from({length:9},()=>source.snapshot('BTCUSDT')));
  assert.equal(calls,2);assert.deepEqual(values[0],values[8]);
  values[0].macd.line=999;assert.notEqual(values[1].macd.line,999);
});
