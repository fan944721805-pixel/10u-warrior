(() => {
  const dialog = document.querySelector('#api-dialog');
  const editor = document.querySelector('#agent-editor');
  if (!dialog || !editor) return;
  let returnToCreate = false, openingEditor = false;
  const make = (tag, text = '', className = '') => {
    const element = document.createElement(tag);
    element.textContent = text; element.className = className;
    return element;
  };
  // Move the existing editor, never duplicate its fields or persistence logic.
  const connections = make('section');
  connections.id = 'ai-connections-panel';
  connections.append(...dialog.querySelectorAll('.api-workspace, .api-saved-section, .api-security-note'));
  const strategies = make('section');
  strategies.id = 'ai-strategies-panel';
  const note = make('p', '策略调整仅用于新战局，已创建的战局保持原配置。', 'ai-settings-note');
  strategies.append(note, editor);

  function tabs(id, items, onSelect = () => {}) {
    const bar = make('div', '', 'ai-settings-tabs');
    bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', id === 'ai-settings' ? 'AI 设置' : '策略编辑分区');
    const select = key => {
      items.forEach(([value, , panel], index) => {
        const active = key === value, button = bar.children[index];
        button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
        panel.hidden = !active;
      });
      onSelect(key);
    };
    items.forEach(([key, title, panel], index) => {
      const button = make('button', title); button.type = 'button';
      button.id = `${id}-${key}-tab`; button.dataset.settingsTab = key;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id);
      button.onclick = () => select(key);
      button.onkeydown = event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % items.length;
        if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = items.length - 1;
        if (next === undefined) return;
        event.preventDefault(); select(items[next][0]); bar.children[next].focus();
      };
      bar.append(button);
    });
    select(items[0][0]);
    return { bar, select };
  }
  const parts = [
    ['basic', '基本设置', ['[data-agent-options="strategy"]']],
    ['policy', '下注策略', ['#agent-strategy-preview', '#agent-risk-summary', '#decision-variance', '#action-urge', '#emotion-sensitivity', '#max-stake', '.agent-all-in']],
    ['inputs', '指标与提示词', ['.agent-indicators', '.agent-prompt-box']],
  ].map(([key, title, selectors]) => {
    const panel = make('section'); panel.id = `ai-editor-${key}-panel`;
    selectors.forEach(selector => {
      const element = editor.querySelector(selector);
      panel.append(element.closest('.agent-setting') || element);
    });
    return [key, title, panel];
  });
  const editorTabs = tabs('ai-editor', parts);
  parts.find(([key])=>key==='policy')[2].append(make('p','资金规则：剩余不超过投入本金的 20% 后，持续全押直到回本；模拟全押可低于 5U。守财奴、稳如老狗在资金达到本金 1.5 倍／2 倍时，下注比例降低 20%／30%。','ai-settings-note'));
  editor.querySelector('.agent-editor-head').after(editorTabs.bar, ...parts.map(item => item[2]));
  const mainTabs = tabs('ai-settings', [['connections', 'API 连接', connections], ['strategy', 'AI 策略', strategies]], key => {
    dialog.dataset.settingsSection = key;
    if (key === 'strategy' && editor.hidden && !openingEditor) {
      const first = window.agentSetup?.getAgents()[0];
      if (first) window.agentSetup.open(first.id);
    }
  });
  dialog.querySelector('.api-dialog-heading').after(mainTabs.bar, connections, strategies);
  dialog.querySelector('h2').textContent = 'AI 设置';
  dialog.querySelector('.api-kicker').replaceWith(dialog.querySelector('h2'));
  dialog.querySelector('.api-dialog-heading').remove();
  dialog.querySelector('.api-security-note p').textContent = '密钥由本机服务加密保存，测试和决策时发送给所选服务商。清除浏览器数据不会删除服务端连接，请在此移除。';
  document.querySelector('#api-connect').setAttribute('aria-label', '打开 AI 设置');
  dialog.querySelector('.api-dialog-close').setAttribute('aria-label', '关闭 AI 设置');
  const create = document.querySelector('#create-dialog');
  dialog.addEventListener('close', () => {
    window.agentSetup.close();
    if (returnToCreate) { returnToCreate = false; create.showModal(); }
  });
  window.Warrior.aiSettings = {
    select: mainTabs.select,
    open(section = 'strategy', { fromEditor = false } = {}) {
      openingEditor = fromEditor;
      if (create.open) { returnToCreate = true; create.close(); }
      window.Warrior.openAiSettings(section);
      openingEditor = false;
    },
    editing() {
      const available = new Set(window.agentSetup.getAgents().map(agent => agent.strategy));
      editor.querySelectorAll('[data-agent-strategy]').forEach(button => { button.disabled = !available.has(button.dataset.agentStrategy); });
      editorTabs.select('basic');
    },
    selectStrategy(strategy) {
      const agent = window.agentSetup.getAgents().find(item => item.strategy === strategy);
      if (agent) window.agentSetup.open(agent.id);
    },
    saved(id) { window.agentSetup.open(id); },
    invalid() { editorTabs.select('inputs'); },
  };

})();
