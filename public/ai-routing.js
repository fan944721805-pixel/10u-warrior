(() => {
  const host = document.querySelector('#ai-connections-panel');
  const api = window.Warrior?.aiConnections;
  if (!host || !api) return;
  const t = value => window.Warrior.i18n?.t(value) || value;
  const make = (tag, text = '', className = '') => {
    const el = document.createElement(tag); el.className = className; el.textContent = text; return el;
  };
  const root = make('section', '', 'ai-routing'); host.append(root);
  let state = api.snapshot(), pending = false;
  const modelRoot=make('section','','battle-models');
  document.querySelector('#create-form .ai-config-list').after(modelRoot);
  const choices=new Map();
  const selectedAgents=()=> (window.agentSetup?.getAgents()||[]).filter(a=>document.querySelector('input[name=models][value="'+CSS.escape(a.id)+'"]')?.checked);
  const modelDialog=make('dialog','','battle-ai-dialog');modelDialog.id='battle-ai-dialog';modelDialog.setAttribute('aria-labelledby','battle-ai-title');document.body.append(modelDialog);
  let draft=new Map(), enabled=false;
  function openModels() {draft=new Map(choices);renderDialog();modelDialog.showModal();api.refresh().catch(()=>{});}
  function renderModel() {
    modelRoot.replaceChildren();modelRoot.hidden=!selectedAgents().length;
    const label=make('label','','battle-ai-toggle');
    const copy=make('span','','battle-ai-copy');copy.append(make('strong',t('配置 AI')));
    const count=enabled?selectedAgents().filter(a=>(choices.get(a.id)||'none')!=='none').length:0;
    copy.append(make('small',enabled?t('使用 AI 的策略')+' '+count+' / '+selectedAgents().length:t('不使用 AI（本地规则）'),'battle-ai-summary'));
    const toggle=make('input');toggle.type='checkbox';toggle.id='battle-configure-ai';toggle.checked=enabled||modelDialog.open;toggle.setAttribute('role','switch');toggle.setAttribute('aria-label',t('配置 AI'));toggle.setAttribute('aria-controls','battle-ai-dialog');
    toggle.onchange=()=>{if(toggle.checked)openModels();else{enabled=false;renderModel();}};
    label.append(copy,toggle);modelRoot.append(label);
    if(enabled) {const edit=make('button',t('调整模型'),'battle-ai-edit');edit.type='button';edit.id='battle-ai-edit';edit.onclick=openModels;modelRoot.append(edit);}
    if(modelDialog.open)renderDialog();
  }
  function renderDialog() {
    modelDialog.replaceChildren();
    const title=make('h2',t('配置 AI'));title.id='battle-ai-title';modelDialog.append(title,make('p',t('每个策略选择一个模型，仅对本局生效。'),'ai-settings-note'));
    if(!state?.connections.some(c=>c.tested))modelDialog.append(make('p',t('暂无可用模型，请先连接并测试 AI。'),'ai-settings-note'));
    const options=make('div');options.id='battle-model-options';modelDialog.append(options);
    for(const agent of selectedAgents()) {
      const row=make('label','','battle-model-row');row.append(make('span',window.Warrior.agentLabel(agent)));
      const select=make('select');select.dataset.battleModel=agent.id;select.setAttribute('aria-label',window.Warrior.agentLabel(agent)+' · '+t('本局模型'));
      for(const c of [{id:'none',model:t('不使用 AI（本地规则）')},...(state?.connections||[]).filter(c=>c.tested)]) {
        const option=make('option',c.provider?c.provider+' · '+c.model:c.model);option.value=c.id;if(c.provider)option.dataset.noTranslate='';select.append(option);
      }
      const value=draft.get(agent.id)||'none';
      if(value!=='none'&&!state?.connections.some(c=>c.id===value&&c.tested)) {const missing=make('option',t('连接不可用，决策将跳过'));missing.value=value;missing.disabled=true;select.append(missing);}
      select.value=value;select.onchange=()=>draft.set(agent.id,select.value);row.append(select);options.append(row);
    }
    const actions=make('div','','battle-ai-actions');
    const cancel=make('button',t('取消'));cancel.type='button';cancel.onclick=()=>modelDialog.close();
    const save=make('button',t('保存配置'));save.type='button';save.id='battle-ai-save';save.onclick=()=>{enabled=true;choices.clear();for(const [id,value] of draft)choices.set(id,value);modelDialog.close();renderModel();};
    actions.append(cancel,save);modelDialog.append(actions);
  }
  modelDialog.addEventListener('close',()=>{renderModel();document.querySelector('#battle-configure-ai')?.focus();});
  window.Warrior.battleModels={
    configure(agents) {
      return agents.map(agent=>{
        const id=enabled?(choices.get(agent.id)||'none'):'none';
        const c=state?.connections.find(c=>c.id===id&&c.tested);
        if(id!=='none'&&!c)throw new Error(t('AI_CONNECTION_NOT_TESTED'));
        return {...agent,id:'seat-'+crypto.randomUUID(),sourceAgentId:agent.id,aiModelLabel:c?c.provider+' · '+c.model:'',aiConnectionId:id,aiConnectionRevision:c?.revision||null};
      });
    },
    seatCount() {return selectedAgents().length;},
    label(agent) {if(agent.aiModelLabel)return agent.aiModelLabel;const c=state?.connections.find(c=>c.id===agent.aiConnectionId);return c?c.provider+' · '+c.model:t('不使用 AI（本地规则）');}
  };
  document.querySelector('#create-form').addEventListener('change',event=>{if(event.target.matches('input[name=models]'))renderModel();});
  new MutationObserver(()=>{if(document.querySelector('#create-dialog').open){renderModel();api.refresh().catch(()=>{});}}).observe(document.querySelector('#create-dialog'),{attributes:true,attributeFilter:['open']});
  function line(parent, title, value) {
    const row = make('div', '', 'ai-usage-line');
    row.append(make('span', t(title)), make('strong', String(value))); parent.append(row);
  }
  function render() {
    root.replaceChildren();
    renderModel();
    if(!state) {root.append(make('p',t('AI 调用需要本机服务，离线模式仅使用本地规则。')));return;}
    root.append(make('h3', t('Token 用量')),
      make('p', t('包括连接测试和被风控拒绝的调用。模型未返回用量时标记为未知。'), 'ai-settings-note'));
    const cards = make('div', '', 'ai-usage-grid');
    for (const c of state.connections) {
      const card = make('article', '', 'ai-usage-card'), u = state.usage[c.id];
      const title = make('h4', `${c.provider} · ${c.model}`); title.dataset.noTranslate = ''; card.append(title);

      line(card, '累计调用', u?.calls || 0);
      line(card, '测试 / 失败', `${u?.tests || 0} / ${u?.errors || 0}`);
      line(card, '输入 / 输出 token', `${u?.input || 0} / ${u?.output || 0}`);
      line(card, '缓存命中 token', u?.cached || 0);
      line(card, '缺少用量的调用', u?.missingUsageCalls || 0);
      if (u?.last) {
        line(card, '最近一次 token', u.last.usage?.total ?? t('未知'));
        line(card, '最近一次耗时', `${u.last.durationMs} ms`);
        if (u.last.error) card.append(make('p', t(u.last.error), 'ai-call-error'));
      }
      cards.append(card);
    }
    if (!state.connections.length) cards.append(make('p', t('测试通过的连接会出现在策略选项中。')));
    root.append(cards);
  }
  window.addEventListener('warrior-ai-connections', event => { state = event.detail; if (!pending) render(); });
  window.addEventListener('warrior-language-change', render);

  setInterval(() => { if (document.querySelector('#api-dialog').open && !pending && !root.contains(document.activeElement)) api.refresh().catch(() => {}); }, 5000);
  render();
})();
