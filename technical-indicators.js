// Completed 1-minute OHLCV only. Missing history/zero denominators return null,
// never an invented neutral signal. See tests for seed and window conventions.
const sum = values => values.reduce((a,b) => a+b,0);
const mean = values => sum(values)/values.length;
const std = values => Math.sqrt(mean(values.map(value => (value-mean(values))**2)));
function emaSeries(values, period) {
  const result = Array(values.length).fill(null);
  if (values.length < period) return result;
  result[period-1] = mean(values.slice(0,period));
  for(let i=period;i<values.length;i++) result[i] = values[i]*2/(period+1)+result[i-1]*(1-2/(period+1));
  return result;
}
function wilderSeries(values, period) {
  if(values.length<period) return [];
  const result=[mean(values.slice(0,period))];
  for(const value of values.slice(period)) result.push((result.at(-1)*(period-1)+value)/period);
  return result;
}
function extendedIndicators(rows, depth) {
  const c=rows.map(r=>r.close), last=rows.at(-1), n=rows.length;
  const result={};
  const window20=rows.slice(-20), typical=rows.map(r=>(r.high+r.low+r.close)/3);
  result.sma=n>=50?{sma5:mean(c.slice(-5)),sma20:mean(c.slice(-20)),sma50:mean(c.slice(-50))}:null;
  const fast=emaSeries(c,12),slow=emaSeries(c,26);
  const macd=c.map((_,i)=>slow[i]===null?null:fast[i]-slow[i]).filter(v=>v!==null);
  const signal=emaSeries(macd,9).at(-1);
  result.macd=typeof signal==='number'?{line:macd.at(-1),signal,histogram:macd.at(-1)-signal}:null;
  const middle=mean(c.slice(-20)),deviation=std(c.slice(-20));
  result.bollinger=n>=20&&deviation>0?{middle,upper:middle+2*deviation,lower:middle-2*deviation,percentB:(last.close-middle+2*deviation)/(4*deviation),bandwidthPct:4*deviation/middle*100}:null;
  const tr=[],plus=[],minus=[];
  for(let i=1;i<n;i++) {
    tr.push(Math.max(rows[i].high-rows[i].low,Math.abs(rows[i].high-c[i-1]),Math.abs(rows[i].low-c[i-1])));
    const up=rows[i].high-rows[i-1].high,down=rows[i-1].low-rows[i].low;
    plus.push(up>down&&up>0?up:0);minus.push(down>up&&down>0?down:0);
  }
  const ranges=wilderSeries(tr,14),plusSmooth=wilderSeries(plus,14),minusSmooth=wilderSeries(minus,14);
  result.atr=ranges.length?{value:ranges.at(-1),percent:ranges.at(-1)/last.close*100}:null;
  const dx=ranges.map((range,i)=>{
    const total=plusSmooth[i]+minusSmooth[i];
    return total>0?100*Math.abs(plusSmooth[i]-minusSmooth[i])/total:0;
  });
  const adx=wilderSeries(dx,14).at(-1),range=ranges.at(-1);
  result.adx=Number.isFinite(adx)&&range>0?{adx,plusDI:100*plusSmooth.at(-1)/range,minusDI:100*minusSmooth.at(-1)/range}:null;
  const ks=[];
  for(let i=Math.max(13,n-3);i<n;i++) {
    const window=rows.slice(i-13,i+1),high=Math.max(...window.map(r=>r.high)),low=Math.min(...window.map(r=>r.low));
    ks.push(high>low?100*(c[i]-low)/(high-low):null);
  }
  result.stochastic=ks.length===3&&ks.every(Number.isFinite)?{k:ks.at(-1),d:mean(ks)}:null;
  result.williams=ks.at(-1)===null||!ks.length?null:ks.at(-1)-100;
  const tp20=typical.slice(-20),tpMean=mean(tp20),mad=mean(tp20.map(v=>Math.abs(v-tpMean)));
  result.cci=n>=20&&mad>0?(typical.at(-1)-tpMean)/(0.015*mad):null;
  let positiveFlow=0,negativeFlow=0;
  for(let i=Math.max(1,n-14);i<n;i++) {
    const flow=typical[i]*rows[i].volume;
    if(typical[i]>typical[i-1]) positiveFlow+=flow;
    if(typical[i]<typical[i-1]) negativeFlow+=flow;
  }
  result.mfi=n>=15&&positiveFlow+negativeFlow>0?100*positiveFlow/(positiveFlow+negativeFlow):null;
  result.obv=n>=21?{change20:sum(rows.slice(-20).map((r,i)=>Math.sign(r.close-c[n-21+i])*r.volume))}:null;
  const volume20=sum(window20.map(r=>r.volume));
  const quoteVolume20=window20.every(r=>Number.isFinite(r.quoteVolume))?sum(window20.map(r=>r.quoteVolume)):null;
  const vwap=quoteVolume20!==null&&volume20>0?quoteVolume20/volume20:null;
  result.vwap=n>=20&&vwap>0?{value:vwap,distancePct:(last.close/vwap-1)*100}:null;
  result.roc=n>=21?{tenMinutes:(last.close/c.at(-11)-1)*100,twentyMinutes:(last.close/c.at(-21)-1)*100}:null;
  result.momentum=n>=11?last.close-c.at(-11):null;
  result.volatility=n>=21?{perMinutePct:std(c.slice(-20).map((v,i)=>Math.log(v/c[n-21+i])))*100}:null;
  const prior=rows.slice(-21,-1),high=Math.max(...prior.map(r=>r.high)),low=Math.min(...prior.map(r=>r.low));
  result.donchian=n>=21?{upper:high,lower:low,close:last.close,breakout:last.close>high?1:last.close<low?-1:0}:null;
  const flow5=rows.slice(-5),total5=sum(flow5.map(r=>r.volume));
  const buy5=flow5.every(r=>Number.isFinite(r.takerBuyVolume))?sum(flow5.map(r=>r.takerBuyVolume)):null;
  result.takerFlow=n>=5&&total5>0&&buy5!==null?{buyRatio:buy5/total5,netBase:2*buy5-total5,totalBase:total5}:null;
  const bid=Number(depth.bids[0][0]),ask=Number(depth.asks[0][0]),bidSize=Number(depth.bids[0][1]),askSize=Number(depth.asks[0][1]),mid=(bid+ask)/2;
  const microprice=(ask*bidSize+bid*askSize)/(bidSize+askSize);
  result.spread=ask>bid?{basisPoints:(ask-bid)/mid*10000,mid,microprice,micropriceBiasBps:(microprice/mid-1)*10000}:null;
  result.cmf=n>=20&&volume20>0?sum(window20.map(r=>r.high===r.low?0:((2*r.close-r.low-r.high)/(r.high-r.low))*r.volume))/volume20:null;
  result.longReturns=n>=61?{fifteenMinutes:(last.close/c.at(-16)-1)*100,sixtyMinutes:(last.close/c.at(-61)-1)*100}:null;
  return result;
}
module.exports={extendedIndicators,emaSeries,wilderSeries};
