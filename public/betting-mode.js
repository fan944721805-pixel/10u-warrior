(() => {
  const app = window.Warrior;
  const badge = document.querySelector('.topbar .demo-label');
  if (!badge || !app) return;
  const node = (tag, text, className = '') => {
    const element = document.createElement(tag);
    element.textContent = text; element.className = className;
    return element;
  };
  const toggle = node('button', '', 'betting-mode-toggle');
  toggle.id = 'betting-mode-toggle'; toggle.type = 'button';
  badge.replaceWith(toggle);
  const panel = node('dialog', '', 'live-betting-panel');
  panel.id = 'live-agent-dialog';
  panel.setAttribute('aria-labelledby', 'live-agent-dialog-title');
  const heading = node('div', '', 'live-betting-heading');
  const title = node('h2', '选择参与 Agent'); title.id = 'live-agent-dialog-title';
  const panelClose = node('button', '×', 'icon-button'); panelClose.type = 'button'; panelClose.setAttribute('aria-label','关闭');
  const status = node('span', '正在检查执行服务', 'live-betting-status');
  status.setAttribute('role', 'status');
  heading.append(title, panelClose);
  const notice = node('p', '真实订单须逐笔确认，不会自动下注。模拟战局的运行状态不受切换影响。', 'live-betting-notice');
  const summary = node('p', '', 'live-betting-summary');
  const roster = node('section', '', 'live-agent-roster');
  const rosterHeading = node('div', '', 'live-agent-heading');
  const rosterCount = node('span', '', 'live-agent-count'); rosterCount.setAttribute('role', 'status');
  rosterHeading.append(rosterCount);
  const rosterList = node('div', '', 'live-agent-grid');
  const rosterEmpty = node('p', '', 'live-agent-empty');
  roster.append(rosterHeading, node('p', '保留原配置，仅调整真实下注参与名单。', 'live-agent-note'), rosterList, rosterEmpty);
  const actions = node('div', '', 'live-betting-actions');
  const records = node('button', '查看真实执行记录', 'secondary'); records.type = 'button';
  const retry = node('button', '刷新状态', 'secondary'); retry.type = 'button';
  const back = node('button', '返回模拟下注', 'secondary'); back.type = 'button';
  const selectionDone = node('button', '确认参与名单', 'primary'); selectionDone.type = 'button'; selectionDone.id = 'confirm-live-agents';
  actions.append(back, selectionDone);
  const service = node('details', '', 'live-service-details');
  service.append(node('summary','执行服务'), status, notice, summary, records, retry);
  panel.append(heading, roster, actions, service);
  document.body.append(panel);
  const manage = node('button', '选择 Agent', 'secondary live-manage-agents'); manage.type = 'button'; manage.hidden = true;
  document.querySelector('.arena-toolbar')?.append(manage);
  let mode = 'paper', revision = 0;
  let selectionEntering = false;
  function openSelection(entering = false) {
    if (panel.open) return;
    selectionEntering = entering;
    service.hidden = entering;
    renderRoster();
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    panel.showModal();
    back.textContent = entering ? '返回模拟下注' : '关闭';
    back.focus();
  }
  function closeSelection() {
    if (selectionEntering) setMode('paper');
    selectionEntering = false;
    panel.close();
  }
  panelClose.onclick = closeSelection;
  panel.addEventListener('cancel', event => { event.preventDefault(); closeSelection(); });
  panel.addEventListener('click', event => {
    if (event.target !== panel) return;
    const rect = panel.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSelection();
  });
  panel.addEventListener('close', () => {
    if (panel.open) return;
    if (selectionEntering) { selectionEntering = false; setMode('paper'); }
    if (!document.querySelector('dialog[open]')) (mode === 'live' ? manage : toggle).focus();
  });
  selectionDone.onclick = () => {
    if (!panel.open || (!selectionEntering && mode !== 'live')) return;
    selectionEntering = false;
    panel.close();
    setMode('live');
  };
  manage.onclick = () => openSelection();
  // In live mode this shared action selects participants, never creates a paper battle.
  document.querySelector('#sim-create')?.addEventListener('submit', event => {
    if (mode !== 'live') return;
    event.preventDefault(); event.stopImmediatePropagation(); openSelection();
  }, true);
  const participationKey = 'warrior-live-agent-exclusions-v1';
  let excluded = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(participationKey) || '[]');
    if (Array.isArray(saved)) excluded = new Set(saved.filter(value => typeof value === 'string'));
  } catch { /* Retain the in-memory selection when storage is unavailable. */ }
  const agentKey = (battleId, agentId) => JSON.stringify([battleId, agentId]);
  const isIncluded = (battleId, agentId) => Boolean(battleId && agentId) && !excluded.has(agentKey(battleId, agentId));
  app.liveParticipation = { isIncluded };
  function markCards() {
    const battle = app.state.simulation;
    document.querySelectorAll('.model-card[data-sim-agent]').forEach(card => {
      card.dataset.liveIncluded = String(isIncluded(battle?.id, card.dataset.simAgent));
      let label = card.querySelector('.live-participation-badge');
      if (!label) { label = node('span', '不参与', 'live-participation-badge'); card.append(label); }
    });
  }
  let rosterSignature = '';
  function renderRoster() {
    const battle = app.state.simulation;
    const agents = battle?.placeholder ? [] : battle?.agents || [];
    const signature = JSON.stringify([battle?.id, agents.map(agent => [agent.id, agent.policy, isIncluded(battle.id, agent.id)])]);
    if (signature === rosterSignature) return;
    rosterSignature = signature;
    rosterList.replaceChildren();
    let count = 0;
    for (const agent of agents) {
      const policy = agent.policy || {};
      const row = node('label', '', 'live-agent-option');
      const input = node('input', ''); input.type = 'checkbox'; input.checked = isIncluded(battle.id, agent.id);
      input.dataset.agentId = agent.id;
      const avatar = node('span', '', 'mini-ai-avatar'); avatar.setAttribute('aria-hidden', 'true');
      app.skins?.applyElement(avatar, policy);
      const copy = node('span', '', 'live-agent-copy');
      const label = node('strong', app.agentLabel(policy));
      const metadata = node('small', [policy.provider, policy.coin].filter(Boolean).join(' · ')); metadata.dataset.noTranslate = '';
      copy.append(label, metadata);
      const state = node('span', input.checked ? '参与' : '不参与', 'live-agent-state');
      row.dataset.included = String(input.checked);
      if (input.checked) count++;
      input.onchange = () => {
        const key = agentKey(battle.id, agent.id);
        if (input.checked) excluded.delete(key); else excluded.add(key);
        try { localStorage.setItem(participationKey, JSON.stringify([...excluded])); } catch { /* Session selection still applies. */ }
        // Reuse the focused input; polling must never replace a focused checkbox.
        rosterSignature = '';
        row.dataset.included = String(input.checked);
        state.textContent = input.checked ? '参与' : '不参与';
        updateCount();
        markCards();
        app.emit('live-participation:change', { battleId: battle.id, agentId: agent.id, included: input.checked });
      };
      row.append(input, avatar, copy, state); rosterList.append(row);
    }
    function updateCount() {
      count = agents.filter(agent => isIncluded(battle.id, agent.id)).length;
      rosterCount.textContent = `${count} / ${agents.length}`;
      rosterEmpty.textContent = !agents.length ? '暂无 Agent，请先创建模拟战局。' : count ? '' : '未选择 Agent，不会从此页面提交新的真实订单。';
      rosterEmpty.hidden = Boolean(count);
      rosterSignature = JSON.stringify([battle?.id, agents.map(agent => [agent.id, agent.policy, isIncluded(battle.id, agent.id)])]);
    }
    updateCount();
  }
  app.on('simulation:update', () => { if (mode === 'live' || panel.open) { renderRoster(); markCards(); } });
  window.addEventListener('storage', event => {
    if (event.key !== participationKey && event.key !== null) return;
    try {
      const saved = JSON.parse(event.newValue || '[]');
      if (!Array.isArray(saved)) return;
      excluded = new Set(saved.filter(value => typeof value === 'string'));
      rosterSignature = '';
      if (mode === 'live' || panel.open) { renderRoster(); markCards(); }
      app.emit('live-participation:change', {});
    } catch { /* Invalid external values do not replace the current selection. */ }
  });

  const riskDialog = node('dialog', '', 'live-risk-dialog');
  riskDialog.id = 'live-risk-dialog';
  riskDialog.setAttribute('aria-labelledby', 'live-risk-title');
  riskDialog.setAttribute('aria-describedby', 'live-risk-description');
  const riskTop = node('div', '', 'live-risk-top');
  const riskTitle = node('h2', '真实下注风险须知'); riskTitle.id = 'live-risk-title';
  const riskClose = node('button', '×', 'icon-button'); riskClose.type = 'button';
  riskClose.setAttribute('aria-label', '关闭风险须知');
  riskTop.append(riskTitle, riskClose);
  const riskDescription = node('div', '', 'live-risk-description'); riskDescription.id = 'live-risk-description';
  const risks = node('ul', '');
  for (const text of [
    '真实下注使用真实资金，可能损失全部下注本金。',
    'AI 与模拟收益不保证盈利；赔率、滑点和手续费会影响实际结果。',
  ]) risks.append(node('li', text));
  riskDescription.append(risks);
  const riskActions = node('div', '', 'live-risk-actions');
  const riskCancel = node('button', '返回模拟下注', 'secondary'); riskCancel.type = 'button';
  const riskConfirm = node('button', '我已了解，进入真实模式', 'primary'); riskConfirm.type = 'button';
  riskActions.append(riskCancel, riskConfirm);
  riskDialog.append(riskTop, riskDescription, riskActions);
  document.body.append(riskDialog);
  let riskPending = false;
  function cancelRisk() {
    riskPending = false;
    setMode('paper');
    riskDialog.close();
    toggle.focus();
  }
  function requestLiveMode() {
    if (riskDialog.open) return;
    // Remain in paper mode until this specific prompt is explicitly confirmed.
    setMode('paper');
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    riskPending = true;
    riskDialog.showModal();
    riskCancel.focus();
  }
  riskCancel.onclick = riskClose.onclick = cancelRisk;
  riskDialog.addEventListener('cancel', event => { event.preventDefault(); cancelRisk(); });
  riskDialog.addEventListener('click', event => {
    if (event.target !== riskDialog) return;
    const rect = riskDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) cancelRisk();
  });
  riskDialog.addEventListener('close', () => {
    if (riskDialog.open) return;
    if (riskPending) { riskPending = false; setMode('paper'); }
    if (!document.querySelector('dialog[open]')) toggle.focus();
  });
  riskConfirm.onclick = () => {
    if (!riskPending || !riskDialog.open) return;
    riskPending = false;
    riskDialog.close();
    openSelection(true);
  };

  async function loadStatus() {
    const epoch = ++revision;
    records.disabled = true; retry.disabled = true;
    status.textContent = '正在检查执行服务';
    summary.textContent = '';
    if (app.simulationApi?.mode === 'offline') {
      status.textContent = '离线模式不可真实下注';
      retry.disabled = false;
      return;
    }
    try {
      // Read-only capability check; selecting a UI mode never arms trading.
      const data = await app.simulationApi.executions('');
      if (epoch !== revision || mode !== 'live') return;
      status.textContent = data.tradingEnabled ? '逐笔确认已开启' : data.quotesEnabled ? '仅报价 · 未开启真实下注' : '真实下注未开启';
      summary.textContent = data.executions.length ? '可查看已保存的真实执行记录。' : '暂无真实执行记录';
      records.disabled = !app.executionPanel;
    } catch {
      if (epoch !== revision || mode !== 'live') return;
      status.textContent = '无法确认执行服务状态';
      summary.textContent = '请稍后重试；不会提交任何订单。';
    } finally {
      if (epoch === revision) retry.disabled = false;
    }
  }
  function setMode(next) {
    mode = next === 'live' ? 'live' : 'paper'; revision++;
    document.body.dataset.bettingMode = mode;
    document.querySelector('#simulation-commandbar').setAttribute('aria-label', mode === 'live' ? '行情参考' : '模拟战局控制');
    manage.hidden = mode !== 'live';
    toggle.textContent = mode === 'live' ? '真实下注' : '模拟下注';
    toggle.setAttribute('aria-label', mode === 'live' ? '真实下注，点击切换为模拟下注' : '模拟下注，点击切换为真实下注');
    toggle.setAttribute('aria-pressed', String(mode === 'live'));
    app.setState({ bettingMode: mode }, 'betting-mode:change');
    if (mode === 'live') { window.page?.('overview'); renderRoster(); markCards(); loadStatus(); }
  }
  toggle.onclick = () => mode === 'paper' ? requestLiveMode() : setMode('paper');
  back.onclick = closeSelection;
  retry.onclick = loadStatus;
  records.onclick = () => { closeSelection(); app.executionPanel?.records(''); };
  // Ranking and recaps describe paper ledgers, so show the matching mode.
  app.on('page:change', event => {
    if (event.detail.page !== 'overview' && mode === 'live') setMode('paper');
  });
  setMode('paper');
})();
