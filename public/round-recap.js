// Read-only round summaries with persistent, per-round acknowledgement.
((root) => {
  const settled = new Set(['WON', 'LOST', 'SPLIT']);
  function payoutFor(order) {
    if (Number.isFinite(order.payout)) return order.payout;
    if (Number.isFinite(order.settlement?.payout)) return order.settlement.payout;
    if (order.status === 'LOST') return 0;
    if (order.status === 'WON' && order.quote?.source === 'offline-simulated') return order.amount * order.quote.odds;
    return null;
  }
  function completedRounds(data) {
    if (!data || data.placeholder) return [];
    const groups = new Map();
    for (const agent of data.agents || []) for (const order of agent.orders || []) {
      if (!Number.isFinite(order.start)) continue;
      if (!groups.has(order.start)) groups.set(order.start, []);
      groups.get(order.start).push({ agent, order });
    }
    const rounds = [];
    for (const [start, entries] of groups) {
      // Wait for all participating Agents, including delayed settlements.
      if (!entries.every(({ order }) => settled.has(order.status))) continue;
      if (!entries.every(({ order }) => Number.isFinite(order.amount) && Number.isFinite(payoutFor(order)))) continue;
      const rows = (data.agents || []).map(agent => {
        const orders = entries.filter(entry => entry.agent.id === agent.id).map(entry => entry.order);
        const stake = orders.reduce((sum, order) => sum + order.amount, 0);
        const payout = orders.reduce((sum, order) => sum + payoutFor(order), 0);
        return { id: agent.id, policy: agent.policy, stake, payout, profit: payout - stake, count: orders.length };
      });
      rounds.push({ key: `${data.id}:${start}`, battleId: data.id, start,
        end: Math.max(...entries.map(({ order }) => order.end || start + 300000)),
        settledAt: Math.max(...entries.map(({ order }) => order.settledAt || order.settlement?.observedAt || order.end || start)),
        stake: rows.reduce((sum, row) => sum + row.stake, 0),
        payout: rows.reduce((sum, row) => sum + row.payout, 0), rows });
    }
    return rounds.sort((a, b) => a.settledAt - b.settledAt || a.start - b.start);
  }
  function createTracker() {
    const known = new Map();
    let initial = true;
    return { update(data) {
      if (!data || data.placeholder) return [];
      const rounds = completedRounds(data);
      if (!known.has(data.id)) {
        known.set(data.id, new Set(rounds.map(round => round.key)));
        const result = initial && rounds.length ? [rounds.at(-1)] : [];
        initial = false;
        return result;
      }
      const seen = known.get(data.id);
      return rounds.filter(round => {
        if (seen.has(round.key)) return false;
        seen.add(round.key); return true;
      });
    } };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { completedRounds, createTracker };
  if (!root.document || !root.Warrior) return;

  const app = root.Warrior, tracker = createTracker();
  const acknowledgementPrefix = 'warrior-round-recap-read:v1:';
  const acknowledged = new Set();
  function isAcknowledged(key) {
    if (acknowledged.has(key)) return true;
    try { return root.localStorage?.getItem(acknowledgementPrefix + key) === '1'; } catch { return false; }
  }
  function dismiss() {
    const key = dialog.dataset.roundKey;
    if (key) {
      acknowledged.add(key);
      try { root.localStorage?.setItem(acknowledgementPrefix + key, '1'); } catch { /* Still deduplicate in this tab when storage is unavailable. */ }
    }
    dialog.close();
  }
  const make = (tag, text = '', className = '', literal = false) => {
    const element = document.createElement(tag); element.textContent = text; element.className = className;
    if (literal) element.dataset.noTranslate = '';
    return element;
  };
  const money = value => Number(value).toFixed(2) + ' U';
  const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + money(Math.abs(value));
  const tone = value => value > 0 ? 'is-positive' : value < 0 ? 'is-negative' : 'is-flat';
  const dialog = make('dialog', '', 'round-recap-dialog'); dialog.id = 'round-recap-dialog';
  dialog.setAttribute('aria-labelledby', 'round-recap-title');
  const top = make('div', '', 'dialog-top');
  const title = make('h2', '本轮战报'); title.id = 'round-recap-title';
  const close = make('button', '×', 'icon-button'); close.type = 'button'; close.setAttribute('aria-label', '关闭本轮战报');
  close.onclick = dismiss; top.append(title, close);
  const content = make('div', '', 'round-recap-content');
  const footer = make('div', '', 'round-recap-actions');
  const full = make('button', '查看完整战报', 'secondary'); full.type = 'button';
  const done = make('button', '知道了', 'primary'); done.type = 'button'; done.onclick = dismiss;
  full.onclick = () => { dismiss(); root.page('reports'); };
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  footer.append(full, done); dialog.append(top, content, footer);
  document.body.append(dialog);
  let pending = null, latest = null, activeBattle = null;
  function showNext() {
    if (pending && isAcknowledged(pending.round.key)) pending = null;
    if (!pending || document.hidden || app.state.bettingMode === 'live' || document.querySelector('dialog[open]:not(#round-recap-dialog)')) return;
    const { round, label } = pending;
    pending = null;
    const meta = make('p', label, 'round-recap-meta');
    const period = new Intl.DateTimeFormat(document.documentElement.lang, { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false });
    meta.append(make('span', ` · ${period.format(round.start)} – ${new Intl.DateTimeFormat(document.documentElement.lang, {hour:'2-digit',minute:'2-digit',hour12:false}).format(round.end)}`, '', true));
    const profit = round.payout - round.stake;
    const hero = make('div', '', 'round-recap-profit ' + tone(profit));
    hero.append(make('span', '本轮模拟收益'), make('strong', signed(profit), '', true));
    const totals = make('div', '', 'round-recap-totals');
    for (const [label, value] of [['本轮下注', round.stake], ['模拟返还', round.payout]]) {
      const field = make('div'); field.append(make('span', label), make('strong', money(value), '', true)); totals.append(field);
    }
    const list = make('div', '', 'round-recap-agents');
    for (const row of round.rows) {
      const item = make('div', '', 'round-recap-agent');
      const avatar = make('span', '', 'mini-ai-avatar'); avatar.setAttribute('aria-hidden','true');
      app.skins?.applyElement(avatar, row.policy);
      const copy = make('div'); copy.append(make('strong', app.agentLabel?.(row.policy) || row.policy?.strategy || 'AI'), make('small', row.count ? row.policy?.coin || '' : '本轮未下注', '', Boolean(row.count)));
      item.append(avatar, copy, make('b', row.count ? signed(row.profit) : '—', tone(row.profit), true)); list.append(item);
    }
    content.replaceChildren(meta, hero, totals, list, make('p', '模拟战报 · 不含真实交易', 'round-recap-note'));
    dialog.dataset.roundKey = round.key;
    // Refresh the same popup in place; don't reopen it or steal focus.
    if (!dialog.open) { dialog.showModal(); done.focus(); }
  }
  app.roundRecap = { update(data, label) {
    if (data?.id !== activeBattle) {
      pending = latest = null; activeBattle = data?.id;
      if (dialog.open) dialog.close();
    }
    for (const round of tracker.update(data)) {
      if (latest && (round.settledAt < latest.settledAt || (round.settledAt === latest.settledAt && round.start <= latest.start))) continue;
      latest = round;
      pending = isAcknowledged(round.key) ? null : { round, label };
    }
    showNext();
  } };
  // Defer notifications while the user edits another dialog; never interrupt it.
  document.addEventListener('close', () => queueMicrotask(showNext), true);
  document.addEventListener('visibilitychange', showNext);
  app.on('betting-mode:change', showNext);
  root.addEventListener('storage', event => {
    if (event.newValue !== '1' || !event.key?.startsWith(acknowledgementPrefix)) return;
    const key = event.key.slice(acknowledgementPrefix.length);
    acknowledged.add(key);
    if (pending?.round.key === key) pending = null;
    if (dialog.open && dialog.dataset.roundKey === key) dialog.close();
  });
})(typeof window !== 'undefined' ? window : globalThis);
