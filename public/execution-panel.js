(() => {
  const api = window.Warrior?.simulationApi;
  if (!api || api.mode === 'offline') return;
  const node = (tag, text, cls = '') => { const el = document.createElement(tag); el.textContent = text; el.className = cls; return el; };
  const dialog = node('dialog', '', 'execution-dialog'); dialog.id = 'execution-dialog';
  const body = node('div', '');
  const error = node('p', '', 'execution-error'); error.setAttribute('role', 'alert');
  const actions = node('div', '', 'execution-actions');
  const close = node('button', '关闭', 'secondary full'); close.type = 'button';
  const title = node('h2', '真实执行桥接');
  dialog.append(title, node('p', '模拟记录不会变成真钱订单。报价后还需逐笔确认；提交不等于成交。', 'muted'), body, error, actions, close);
  document.body.append(dialog);
  let busy = false, generation = 0, currentBattleId = null;
  close.onclick = () => dialog.close();
  dialog.addEventListener('close', () => { generation++; });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  function json(value) { const pre = node('pre', JSON.stringify(value, null, 2)); pre.dataset.noTranslate = ''; return pre; }
  function fields(values) {
    const section = node('section', '', 'execution-summary');
    for (const [label, value, literal = true] of values) {
      const row = node('p', ''), strong = node('strong', String(value));
      if (literal) strong.dataset.noTranslate = '';
      row.append(node('span', label), strong); section.append(row);
    }
    return section;
  }
  function button(text, handler) { const el = node('button', text, 'secondary full'); el.type = 'button'; el.onclick = () => run(handler); return el; }
  const included = record => window.Warrior.state.bettingMode === 'live' && window.Warrior.liveParticipation?.isIncluded(record.battleId, record.agentId) === true;
  function requireIncluded(record) {
    if (included(record)) return true;
    error.textContent = '该 Agent 已退出真实下注，请先在真实模式中重新选择。';
    return false;
  }
  async function run(fn) {
    if (busy) return;
    busy = true; error.textContent = ''; close.disabled = true;
    dialog.querySelectorAll('button').forEach(el => { el.disabled = true; });
    try { await fn(); } catch (e) {
      error.replaceChildren(node('span', '操作未完成。请查询执行记录，不要重复提交。'), json({ code: e.code || e.message }));
    } finally {
      busy = false; close.disabled = false;
      dialog.querySelectorAll('button').forEach(el => { el.disabled = el.dataset.unavailable === 'true'; });
    }
  }
  function renderExecution(record, controls) {
    body.append(fields([
      ['执行状态', record.status], ['市场 ID', record.intent.marketTopicId],
      ['方向', record.intent.direction === 'UP' ? '看涨' : '看跌', false], ['真实金额', Number(record.intent.amount).toFixed(2) + ' U'],
      ['预计份额', record.quote?.amountOut ?? record.quote?.expectedShares ?? '—'],
      ['报价到期', record.expiresAt ? new Date(record.expiresAt).toLocaleString() : '—'],
      ['官方订单状态', record.reconciliation?.officialOrder?.status || record.order?.status || '—'],
    ]));
    if (record.intent.paperEstimate) {
      body.append(fields([['模拟估算份额', Number(record.intent.paperEstimate.shares).toFixed(6)]]));
      body.append(node('p', '模拟按盘口和基础手续费估算，不含账户折扣或链上费用。官方报价可能变化，实际成交以回执为准。', 'muted'));
    }
    const details = node('details', '', 'audit-details');
    const summary = node('summary', '完整执行凭据');
    const state = node('strong', ' ' + record.status); state.dataset.noTranslate = ''; summary.append(state);
    details.append(summary, json(record));
    body.append(details);
    if (record.status === 'QUOTED') {
      const consentLabel = node('label', '', 'execution-consent');
      const consent = document.createElement('input'); consent.type = 'checkbox'; consent.id = 'execution-consent';
      consentLabel.append(consent, node('span', '我确认该笔真实金额、方向和市场，并允许提交。'));
      const submit = button('确认提交真实订单', async () => {
        if (!consent.checked || !controls.tradingEnabled) return;
        if (!requireIncluded(record)) return;
        const result = await api.submitExecution(record.id);
        body.replaceChildren(); actions.replaceChildren(); renderExecution(result, controls);
      });
      submit.id = 'submit-execution'; submit.dataset.unavailable = 'true'; submit.disabled = true;
      consent.onchange = () => { submit.dataset.unavailable = String(!consent.checked || !controls.tradingEnabled || !included(record)); submit.disabled = submit.dataset.unavailable === 'true'; };
      if (!included(record)) body.append(node('p', '该 Agent 已退出真实下注，请先在真实模式中重新选择。', 'muted'));
      body.append(consentLabel); actions.append(submit);
      if (!controls.tradingEnabled) body.append(node('p', '真实下单未开启；可核对报价，不可提交。', 'muted'));
    }
    if (['SUBMITTED', 'UNKNOWN', 'RECONCILED'].includes(record.status)) {
      actions.append(button('查询订单与钱包凭据', async () => {
        const result = await api.reconcileExecution(record.id);
        body.replaceChildren(); actions.replaceChildren(); renderExecution(result, controls);
      }));
    }
  }
  async function loadRecords(battleId) {
    const data = await api.executions(battleId);
    body.replaceChildren(); actions.replaceChildren();
    body.append(node('p', '关联到钱包流水不代表结算到账；缺少精确凭据时保持未确认。', 'muted'));
    if (!data.executions.length) body.append(node('p', '暂无真实执行记录', 'muted'));
    data.executions.forEach(record => {
      const show = button('查看执行记录', async () => {
        body.replaceChildren(); actions.replaceChildren(); renderExecution(record, data);
      });
      show.append(json({ id: record.id, intentId: record.intent.id, status: record.status })); body.append(show);
    });
  }
  function open(battleId) {
    currentBattleId = battleId; generation++;
    body.replaceChildren(); actions.replaceChildren(); error.textContent = '';
    if (!dialog.open) dialog.showModal();
  }
  window.Warrior.executionPanel = {
    records(battleId) { open(battleId); return run(() => loadRecords(battleId)); },
    intent(battleId, intentId) {
      open(battleId); const epoch = generation;
      return run(async () => {
        const preview = await api.intent(battleId, intentId);
        if (epoch !== generation) return;
        body.append(json(preview));
        const simulation = window.Warrior.state.simulation;
        const policy = simulation?.id === battleId ? simulation.agents?.find(agent => agent.id === preview.agentId)?.policy : null;
        body.prepend(fields([['当前战局', preview.battleName], ['参与 Agent', policy ? window.Warrior.agentLabel(policy) : `AI ${preview.agentId}`, false],
          ['市场 ID', preview.intent.marketTopicId], ['方向', preview.intent.direction === 'UP' ? '看涨' : '看跌', false],
          ['真实金额', Number(preview.intent.amount).toFixed(2) + ' U']]));
        const quote = button('获取真实报价（不下单）', async () => {
          if (!requireIncluded(preview)) return;
          const record = await api.quoteIntent(battleId, intentId);
          body.replaceChildren(); actions.replaceChildren(); renderExecution(record, preview);
        });
        quote.id = 'quote-intent'; quote.dataset.unavailable = String(!preview.quotesEnabled || !included(preview)); quote.disabled = quote.dataset.unavailable === 'true';
        actions.append(quote);
        if (!included(preview)) body.append(node('p', '该 Agent 已退出真实下注，请先在真实模式中重新选择。', 'muted'));
        if (!preview.quotesEnabled) body.append(node('p', '真实报价未开启；当前仅预览保存的下注意图。', 'muted'));
      });
    },
  };
  const refresh = button('刷新执行记录', () => loadRecords(currentBattleId)); refresh.id = 'refresh-executions';
  dialog.insertBefore(refresh, close);
})();
