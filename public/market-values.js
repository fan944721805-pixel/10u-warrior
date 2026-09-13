// Display-only calculations. Never changes an order, a decision, or the ledger.
((root) => {
  function winningReturn(order) {
    const amount = order?.amount, quote = order?.quote;
    if (!Number.isFinite(amount) || amount <= 0 || !quote) return null;
    // Production uses the exact depth-weighted shares saved at bet time.
    // Offline demonstrations have only simulated odds, explicitly labelled by the UI.
    const payout = quote.shares ?? (quote.source === 'offline-simulated' ? amount * quote.odds : NaN);
    if (!Number.isFinite(payout) || payout <= 0) return null;
    return { odds: payout / amount, payout, profit: payout - amount, loss: -amount };
  }
  function freshPrice(quote, symbol, now = Date.now()) {
    return quote?.symbol === symbol && Number.isFinite(quote.price) && quote.price > 0 &&
      Number.isFinite(quote.tradeTime) && now - quote.tradeTime <= 15000 && quote.tradeTime <= now + 2000;
  }
  function betReferencePrice(order, snapshots) {
    if (Number.isFinite(order?.referencePrice) && order.referencePrice > 0) return order.referencePrice;
    const snapshot = snapshots?.get(order?.intent?.snapshotId);
    if (!snapshot || snapshot.type !== 'MARKET_SNAPSHOT' ||
        String(snapshot.roundId) !== String(order.start) ||
        snapshot.market?.marketTopicId !== order.topicId) return null;
    const price = snapshot.indicators?.price;
    return Number.isFinite(price) && price > 0 ? price : null;
  }
  function pendingBets(orders, now) {
    const open=(orders||[]).filter(order=>order.status==='OPEN');
    const current=open.filter(order=>order.start<=now&&order.end>now);
    const previous=open.filter(order=>order.end<=now);
    const total=rows=>Math.round(rows.reduce((sum,order)=>sum+order.amount,0)*1e8)/1e8;
    return {current,previous,currentAmount:total(current),previousAmount:total(previous)};
  }
  function valuationKey(battle) {
    return JSON.stringify([battle.id,battle.agents.map(agent=>[agent.id,agent.cash,agent.equity,
      agent.orders.filter(order=>order.status==='OPEN').map(order=>[order.id,order.topicId,order.tokenId,order.start,order.end,order.direction,order.amount,order.quote?.shares])])]);
  }
  function equityEstimate(battle, valuation, now = Date.now()) {
    const matches = !battle.recovery && valuation?.battleId===battle.id && valuation.signature===valuationKey(battle);
    const agents = battle.agents.map(agent=>{
      const open=agent.orders.some(order=>order.status==='OPEN');
      const mark=matches ? valuation.agents?.find(row=>row.agentId===agent.id) : null;
      const valid=!open || (Number.isFinite(mark?.estimatedEquity) && mark.validUntil>now && mark.asOf<=now+2000 && now-mark.asOf<=10000);
      const estimatedEquity=!open ? agent.equity : valid ? mark.estimatedEquity : null;
      const initialBalance=battle.config?.initialBalance+(agent.addedCapital||0);
      return {id:agent.id,bookEquity:agent.equity,estimatedEquity,floatingPnl:valid ? estimatedEquity-agent.equity : null,
        cumulativePnl:valid && Number.isFinite(initialBalance) ? estimatedEquity-initialBalance : null};
    });
    const estimatedEquity=agents.every(a=>a.estimatedEquity!==null) ? agents.reduce((sum,a)=>sum+a.estimatedEquity,0) : null;
    const initialTotal=(battle.initialTotal ?? (battle.config?.initialBalance * agents.length))+(battle.addedCapital||0);
    return {agents,bookEquity:agents.reduce((sum,a)=>sum+a.bookEquity,0),
      estimatedEquity,cumulativePnl:estimatedEquity!==null && Number.isFinite(initialTotal) ? estimatedEquity-initialTotal : null};
  }
  function equityTier(equity, initialBalance) {
    if (!Number.isFinite(equity) || !Number.isFinite(initialBalance) || initialBalance <= 0) return 'normal';
    const multiple=equity/initialBalance;
    if (multiple >= 3) return 'triple';
    if (multiple >= 2) return 'double';
    return multiple < .5 ? 'risk' : 'normal';
  }
  function equityPerformance(equity, principal) {
    if (!Number.isFinite(equity) || !Number.isFinite(principal) || principal <= 0) return {state:'unavailable',text:'—'};
    const multiple=equity/principal;
    const compact=value=>Number(value.toFixed(2)).toString();
    if(multiple<1)return {state:'loss',text:`-${compact((1-multiple)*100)}%`};
    if(multiple>1)return {state:'profit',text:`x ${compact(multiple)}`};
    return {state:'flat',text:'0%'};
  }
  const values = { winningReturn, freshPrice, betReferencePrice, pendingBets, valuationKey, equityEstimate, equityTier, equityPerformance };
  if (typeof module === 'object' && module.exports) module.exports = values;
  else { root.Warrior = root.Warrior || {}; root.Warrior.marketValues = values; }
})(globalThis);
