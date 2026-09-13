/* Presentation only: defeat comes from settled book funds, never a price estimate. */
((root) => {
  function isDefeated(simulation, agent) {
    return !simulation?.placeholder && Number.isFinite(agent?.equity) && agent.equity <= 0 &&
      Number.isFinite(agent.cash) && agent.cash <= 0 && agent.reserved === 0 &&
      Array.isArray(agent.orders) && !agent.orders.some(order => order.status === 'OPEN');
  }
  if (typeof module === 'object' && module.exports) { module.exports = { isDefeated }; return; }
  const doc = root.document;
  const node = (tag, text, className = '', literal = false) => {
    const element = doc.createElement(tag); element.className = className;
    if (text !== undefined) element.textContent = text;
    if (literal) element.dataset.noTranslate = '';
    return element;
  };
  function memorial() {
    const panel = node('section', undefined, 'agent-memorial');
    const ghost = node('span', undefined, 'agent-defeat-ghost'); ghost.setAttribute('aria-hidden', 'true');
    ghost.innerHTML = '<svg viewBox="0 0 96 104" fill="none"><ellipse cx="48" cy="94" rx="27" ry="5" fill="currentColor" opacity=".14"/><path d="M22 77V39a26 26 0 0 1 52 0v38l-13-7-13 9-13-9Z" fill="#f4eaff" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="m34 35 9 9m0-9-9 9m20-9 9 9m0-9-9 9M42 57q6-6 12 0" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="m12 20 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="#e8ff70"/><path d="m80 55 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="#e8ff70"/></svg>';
    panel.append(ghost, node('strong', '战神陨落'), node('p', '筹码归零，本局阵亡'), node('small', '模拟资金'));
    return panel;
  }
  function updateCard(card, simulation, agent) {
    const dead = isDefeated(simulation, agent), key = `${simulation.id}:${agent.id}`;
    const changed = card.dataset.defeatKey !== key || card.dataset.lifeState !== (dead ? 'defeated' : 'alive');
    card.dataset.defeatKey = key; card.dataset.lifeState = dead ? 'defeated' : 'alive';
    let panel = card.querySelector('.agent-memorial');
    if (dead && !panel) { panel = memorial(); card.querySelector('.agent-round').after(panel); }
    if (panel) panel.hidden = !dead;
    card.querySelector('.agent-round').hidden = dead;
    card.querySelector('.agent-detail-link span').textContent = dead ? '历史战绩' : '查看详情';
    if (!changed) return;
    card.classList.remove('is-defeat-turning');
    if (dead) {
      // A single page turn on arrival; polling and locale changes do not replay it.
      void card.offsetWidth;
      card.classList.add('is-defeat-turning');
      card.addEventListener('animationend', event => {
        if (event.target === card) card.classList.remove('is-defeat-turning');
      }, { once: true });
    }
  }
  let active = null;
  function history(simulation, agent) {
    const details = node('details', undefined, 'detail-disclosure agent-defeat-history');
    details.append(node('summary', '历史战绩'));
    const list = node('div', undefined, 'agent-defeat-results');
    const labels = { WON: '胜', LOST: '负', SPLIT: '平', CANCELLED: '已取消' };
    const orders = agent.orders.filter(order => order.status !== 'OPEN').slice().sort((a, b) => (b.settledAt || b.end) - (a.settledAt || a.end));
    for (const order of orders) {
      const row = node('div', undefined, 'agent-defeat-result');
      const at = order.settledAt ?? order.end;
      const date = Number.isFinite(at) ? new Intl.DateTimeFormat(doc.documentElement.lang, { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).format(at) : '—';
      const payout = Number.isFinite(order.payout) ? order.payout : order.quote?.source === 'offline-simulated' ? (order.status === 'LOST' ? 0 : order.status === 'WON' ? order.amount * order.quote.odds : null) : null;
      const profit = Number.isFinite(payout) && Number.isFinite(order.amount) ? payout - order.amount : null;
      row.append(node('time', date, '', true), node('span', labels[order.status] || '未记录'), node('strong', profit === null ? '—' : `${profit > 0 ? '+' : ''}${profit.toFixed(2)} U`, profit > 0 ? 'is-positive' : profit < 0 ? 'is-negative' : '', true));
      list.append(row);
    }
    if (!orders.length) list.append(node('p', '暂无历史战绩'));
    details.append(list); return details;
  }
  function renderArchive(view, simulation, agent) {
    if (active !== view || !view.body.isConnected) return;
    const expanded = view.body.querySelector('details')?.open;
    const records = history(simulation, agent); records.open = Boolean(expanded);
    view.full = simulation;
    view.body.replaceChildren(root.WarriorEquity.mount(simulation, agent, { watch: false }), records);
  }
  function showDetail(content, heading, simulation, agent) {
    const body = node('div', undefined, 'agent-defeat-archive');
    heading.classList.add('agent-defeat-heading');
    content.replaceChildren(heading, memorial(), body);
    const view = { body, battleId: simulation.id, agentId: agent.id }; active = view;
    async function load() {
      body.replaceChildren(node('p', '正在读取历史战绩…', 'muted'));
      try {
        const full = ['live', 'summary'].includes(simulation.view) ? await root.Warrior.simulationApi.report(simulation.id) : simulation;
        if (active !== view || root.Warrior.state.simulation?.id !== view.battleId) return;
        const saved = full.agents.find(item => item.id === agent.id);
        if (!saved) throw new Error('AGENT_NOT_FOUND');
        renderArchive(view, full, saved);
      } catch {
        if (active !== view) return;
        const retry = node('button', '重试读取', 'secondary'); retry.type = 'button'; retry.onclick = load;
        body.replaceChildren(node('p', '历史战绩读取失败，请重试。'), retry);
      }
    }
    void load();
  }
  root.WarriorDefeat = { isDefeated, updateCard, showDetail, clearDetail() { active = null; } };
  root.Warrior.on('simulation:update', ({ detail }) => {
    if (!doc.querySelector('#detail-dialog')?.open) return;
    const simulation = detail.simulation;
    const content = doc.querySelector('#detail-content');
    if (!active) {
      if (simulation?.id === content.dataset.battleId) {
        const agent = simulation.agents.find(item => item.id === content.dataset.agentId);
        if (agent && isDefeated(simulation, agent)) root.openModelDetail(agent.id);
      }
      return;
    }
    if (simulation?.id !== active.battleId) { active = null; doc.querySelector('#detail-dialog').close(); return; }
    const agent = simulation.agents.find(item => item.id === active.agentId);
    if (agent && !isDefeated(simulation, agent)) { active = null; root.openModelDetail(agent.id); }
  });
  root.addEventListener('warrior-language-change', () => {
    if (active?.full && doc.querySelector('#detail-dialog')?.open) renderArchive(active, active.full, active.full.agents.find(agent => agent.id === active.agentId));
  });
  doc.querySelector('#detail-dialog').addEventListener('close', () => { active = null; });
})(typeof window === 'object' ? window : globalThis);
