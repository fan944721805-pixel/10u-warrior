/* Aggregate saved simulation ledgers; no generated results or balance-derived profit. */
((root) => {
  const empty = () => ({ net:0, bets:0, wins:0, losses:0, neutral:0, stake:0, payout:0, profit:0, loss:0 });
  const amount = value => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('RANKING_DATA_INVALID');
    return value * 100;
  };
  function history(reports) {
    const groups = new Map();
    const battles = reports.filter(b => !b.placeholder).slice().sort((a,b) => a.createdAt-b.createdAt || a.id.localeCompare(b.id));
    for (const battle of battles) {
      if (!Array.isArray(battle.agents)) throw new Error('RANKING_DATA_INVALID');
      for (const agent of battle.agents) {
        if (!agent.policy?.strategy || !Array.isArray(agent.orders)) throw new Error('RANKING_DATA_INVALID');
        // A changed card definition is a separate strategy, even when the character name matches.
        const id = agent.policy.cardPolicyHash ? `card:${agent.policy.cardPolicyHash}` : `legacy:${agent.policy.strategy}`;
        const group = groups.get(id) || { id, personaId:agent.policy.strategy, cardSnapshot:agent.policy.cardSnapshot, battles:[] };
        const stats = empty();
        for (const order of agent.orders) {
          if (order.status === 'OPEN') continue;
          if (!['WON','LOST','SPLIT'].includes(order.status)) throw new Error('RANKING_DATA_INVALID');
          const stake = amount(order.amount), payout = amount(order.payout), net = payout-stake;
          stats.bets++; stats.wins += order.status==='WON'; stats.losses += order.status==='LOST'; stats.neutral += order.status==='SPLIT';
          stats.stake += stake; stats.payout += payout; stats.net += net;
          stats.profit += Math.max(0,net); stats.loss += Math.max(0,-net);
        }
        const existing = group.battles.find(b => b.id===battle.id);
        if (existing) for (const key of Object.keys(stats)) existing[key] += stats[key];
        else group.battles.push({ ...stats, id:battle.id });
        groups.set(id,group);
      }
    }
    return { entries:[...groups.values()], battleIds:battles.map(b=>b.id) };
  }
  const api = { history, empty };
  if (typeof module==='object' && module.exports) module.exports=api;
  if (root) root.WarriorCardResults=api;
})(typeof window==='undefined'?null:window);
