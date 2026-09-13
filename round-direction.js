// Settlement target context built only from the decision-time snapshot.
// Spot opening prices are a proxy, never an official Chainlink strike.
function roundContext(market, indicators, slot, durationSeconds, observedAt) {
  const rows = indicators?.raw?.klines;
  const opening = Array.isArray(rows) ? rows.find(row => Array.isArray(row) && Number(row[0]) === Number(slot)) : null;
  const official = market?.variantData?.startPrice;
  const startPrice = Number(official ?? opening?.[1]);
  const observedPrice = Number(indicators?.spread?.mid ?? indicators?.price);
  const remaining = Number(slot) + durationSeconds * 1000 - observedAt;
  if (!Number.isFinite(startPrice) || startPrice <= 0 || !Number.isFinite(observedPrice) || observedPrice <= 0 ||
      !Number.isFinite(observedAt) || remaining <= 0 || remaining > durationSeconds * 1000) return null;
  // Closed 1m prices only. This also works for candle-only strategies without
  // adding RSI, order flow or any other indicator to their decision.
  const closed = (Array.isArray(rows) ? rows : []).filter(row => Array.isArray(row) && Number(row[0]) <= observedAt && Number(row[6]) < observedAt).slice(-21);
  if (closed.some((row,i)=>Number(row[6])!==Number(row[0])+59999 || (i && Number(row[0])-Number(closed[i-1][0])!==60000))) return null;
  const returns = closed.slice(1).map((row,i)=>Math.log(Number(row[4])/Number(closed[i][4]))*100);
  if (returns.length < 10 || returns.some(value=>!Number.isFinite(value))) return null;
  const mean = returns.reduce((a,b)=>a+b,0)/returns.length;
  const noise = Math.sqrt(returns.reduce((sum,value)=>sum+(value-mean)**2,0)/returns.length);
  return { start_price:startPrice, observed_price:observedPrice,
    displacement_pct:(observedPrice/startPrice-1)*100, noise_pct_per_minute:noise,
    observed_at:observedAt, round_id:String(slot),
    opening_price_basis:official != null ? 'official-market' : 'spot-open-proxy',
    observed_price_basis:'spot-proxy', version:1 };
}

function alignRoundDirection(signal, input) {
  const context=input.market.round_context, duration=input.market.round_duration_seconds, remaining=input.market.seconds_to_close;
  // Fixed-side characters, peer countertrades and oracle readings keep their
  // explicit contracts. A waiting strategy does not gain an invented signal.
  const technical=['aggressive','smart','conservative','trendFollowing','meanReversion','breakout','orderFlow','volatilityGuard','consensus','priceAction'];
  if (!technical.includes(input.policy.strategy) || !signal?.score || !context || context.round_id!==input.market.round_id ||
      ![duration,remaining,context.displacement_pct,context.noise_pct_per_minute,context.observed_at].every(Number.isFinite) ||
      duration<=0 || remaining<=0 || remaining>duration || context.noise_pct_per_minute<=0 ||
      input.market.data_timestamp-context.observed_at>10000 || context.observed_at-input.market.data_timestamp>10000) return signal;
  const elapsed=1-remaining/duration;
  const uncertainty=context.noise_pct_per_minute*Math.sqrt(Math.max(remaining/60,.5));
  const distance=context.displacement_pct/Math.max(uncertainty,.005);
  const up=1/input.market.up_odds,down=1/input.market.down_odds;
  const marketUp=up/(up+down),target=Math.sign(distance);
  const confirms=Number.isFinite(marketUp)&&(target>0?marketUp>=.55:marketUp<=.45);
  const corrected=elapsed>=.2&&Math.abs(distance)>=1&&confirms&&target!==Math.sign(signal.score);
  return {...signal,score:corrected?target*Math.abs(signal.score):signal.score,
    factors:[...signal.factors,{name:'round_target',value:JSON.stringify({distance:Number(distance.toFixed(3)),elapsed:Number(elapsed.toFixed(3)),basis:context.opening_price_basis,corrected}),impact:target>0?'UP':target<0?'DOWN':'NEUTRAL'}],
    ...(corrected?{directionCorrection:{version:1,from:signal.score>0?'UP':'DOWN',to:target>0?'UP':'DOWN',distance,elapsed,basis:context.opening_price_basis}}:{})};
}
module.exports={roundContext,alignRoundDirection};
