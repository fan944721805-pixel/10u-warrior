// Read-only mark-to-market estimates. Never writes the simulation ledger or places orders.
const { validateMarket } = require('./prediction-sim');
const { valuationKey } = require('./public/market-values');
const fail = code => Object.assign(new Error(code), { code });

function sellValue(book, tokenId, shares, now) {
  const at = Number(book?.timestamp);
  if (String(book?.tokenId) !== String(tokenId) || !Number.isFinite(at) || now - at > 10000 || at > now + 2000) throw fail('STALE_BOOK');
  if (!Number.isFinite(shares) || shares <= 0) throw fail('INVALID_SHARES');
  if (!Array.isArray(book.bids) || !book.bids.length) throw fail('NO_BIDS');
  const bids = book.bids.map(row => ({ price: Number(row.price), size: Number(row.size) }));
  if (bids.some(row => !Number.isFinite(row.price) || row.price < 0 || row.price > 1 || !Number.isFinite(row.size) || row.size <= 0)) throw fail('INVALID_BOOK');
  bids.sort((a,b) => b.price - a.price);
  let remaining = shares, value = 0;
  for (const row of bids) {
    const quantity = Math.min(remaining, row.size);
    value += quantity * row.price; remaining -= quantity;
    if (remaining < 1e-8) break;
  }
  if (remaining > 1e-8) throw fail('INSUFFICIENT_BIDS');
  return { value, asOf: at, validUntil: at + 10000 };
}

function createPositionValuation({ source, now = Date.now }) {
  const cache = new Map();
  function cached(key, read) {
    const found = cache.get(key);
    if (found && (found.pending || now() - found.at < 5000)) return found.promise;
    // Cache both failures and in-flight reads to prevent multi-tab polling bursts.
    let timer;
    const promise = Promise.race([Promise.resolve().then(read), new Promise((_,reject) => {
      timer = setTimeout(() => reject(fail('QUOTE_TIMEOUT')), 7000);
    })]).finally(() => {clearTimeout(timer);const entry=cache.get(key);if(entry?.promise===promise){entry.pending=false;entry.at=now();}});
    cache.set(key, {at:now(),promise,pending:true});
    if (cache.size > 200) for (const [id,entry] of cache) if (now()-entry.at >= 5000) cache.delete(id);
    return promise;
  }
  return async function estimate(battle) {
    const signature = valuationKey(battle);
    const groups = new Map();
    for (const agent of battle.agents) for (const order of agent.orders.filter(o => o.status === 'OPEN')) {
      const key = JSON.stringify([order.topicId,order.tokenId,order.start,order.end,order.direction]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({agent,order});
    }
    const marks = new Map();
    await Promise.all([...groups.values()].map(async entries => {
      const {order,agent} = entries[0];
      let mark;
      try {
        if (battle.recovery) throw fail(battle.recovery.code || 'RECOVERY_WAIT');
        if (order.end <= now()) throw fail('AWAITING_SETTLEMENT');
        if (entries.some(entry => !Number.isFinite(entry.order.quote?.shares) || entry.order.quote.shares <= 0)) throw fail('INVALID_SHARES');
        const topic = await cached(`topic:${order.topicId}`, () => source.detail(order.topicId));
        if (String(topic?.marketTopicId) !== String(order.topicId)) throw fail('MARKET_MISMATCH');
        validateMarket(topic, order.start, battle.config.asset || `${agent.policy.coin}USDT`, battle.config.roundMs);
        if (Number(topic.endDate) !== order.end || !['UP','DOWN'].includes(order.direction)) throw fail('MARKET_MISMATCH');
        const market = topic.markets[0];
        if (['RESOLVED','SETTLED','CLOSED'].includes(market.status)) throw fail('AWAITING_SETTLEMENT');
        const token = market.outcomes.find(o => o.name === (order.direction === 'UP' ? 'Up' : 'Down'));
        if (String(token?.tokenId) !== String(order.tokenId)) throw fail('TOKEN_MISMATCH');
        const book = await cached(`book:${order.topicId}:${order.tokenId}`, () => source.book(topic,order.direction));
        const shares = entries.reduce((sum,entry) => sum + entry.order.quote.shares,0);
        mark = sellValue(book,order.tokenId,shares,now());
        mark.validUntil = Math.min(mark.validUntil,order.end);
        if (mark.validUntil <= now()) throw fail('STALE_BOOK');
        // All Agents holding the same token share the available bid depth once.
        entries.forEach(entry => marks.set(entry.order,{...mark,value:mark.value * entry.order.quote.shares / shares}));
      } catch (error) {
        entries.forEach(entry => marks.set(entry.order,{reason:error.code || 'QUOTE_UNAVAILABLE'}));
      }
    }));
    const agents = battle.agents.map(agent => {
      const open = agent.orders.filter(o=>o.status==='OPEN'), values = open.map(o=>marks.get(o));
      const invalid = values.find(mark=>mark?.reason || !mark || mark.validUntil <= now());
      const available = !invalid && values.every(Boolean);
      const estimatedEquity = available ? agent.cash + values.reduce((sum,mark)=>sum+mark.value,0) : null;
      return {agentId:agent.id,bookEquity:agent.equity,estimatedEquity,
        floatingPnl:available ? estimatedEquity-agent.equity : null,
        reason:available ? null : invalid?.reason || 'STALE_BOOK',
        asOf:open.length && available ? Math.min(...values.map(mark=>mark.asOf)) : null,
        validUntil:open.length && available ? Math.min(...values.map(mark=>mark.validUntil)) : null};
    });
    return {battleId:battle.id,signature,serverTime:now(),mode:'paper',basis:'sell-bid-depth',feesIncluded:false,agents};
  };
}
module.exports = {sellValue,createPositionValuation};
