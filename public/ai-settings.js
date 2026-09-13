(() => {
  const dialog = document.querySelector('#api-dialog');
  const editor = document.querySelector('#agent-editor');
  if (!dialog || !editor) return;
  let returnToCreate = false, openingEditor = false, addingAgent = false;
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
  const toolbar = make('div', '', 'ai-strategy-toolbar');
  const label = make('label', '选择策略');
  label.htmlFor = 'ai-strategy-agent';
  const picker = make('select'); picker.id = 'ai-strategy-agent';
  const add = make('button', '＋ 添加 Agent'); add.type = 'button'; add.id = 'api-add-agent';
  toolbar.append(label, picker, add);
  const note = make('p', '策略调整仅用于新战局，已创建的战局保持原配置。', 'ai-settings-note');
  strategies.append(toolbar, note, editor);

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
  function refreshPicker(id = picker.value) {
    picker.replaceChildren();
    const placeholder = make('option', '选择策略'); placeholder.value = ''; placeholder.disabled = true;
    picker.append(placeholder);
    const agents = window.agentSetup.getAgents();
    const modelNames = { claude: 'Claude', gpt: 'GPT', deepseek: 'DeepSeek' };
    const counts = new Map();
    agents.forEach(agent => counts.set(agent.provider, (counts.get(agent.provider) || 0) + 1));
    agents.forEach(agent => {
      const model = modelNames[agent.provider] || agent.provider;
      const duplicates = agents.filter(item => item.provider === agent.provider && item.strategy === agent.strategy);
      const suffix = duplicates.length > 1 ? ` · ${duplicates.findIndex(item => item.id === agent.id) + 1}` : '';
      const text = `${window.Warrior.agentLabel(agent)}${suffix}`;
      const option = make('option', text); option.value = agent.id;
      // Identity stays on the Agent ID; model labels must not rename saved Agents.
      option.dataset.provider = agent.provider;
      picker.append(option);
    });
    picker.value = id || '';
  }
  picker.onchange = () => addingAgent ? window.agentSetup.setNewModel(picker.value) : window.agentSetup.open(picker.value);
  add.onclick = () => window.agentSetup.open();
  dialog.addEventListener('close', () => {
    window.agentSetup.close();
    if (returnToCreate) { returnToCreate = false; create.showModal(); }
  });
  window.Warrior.aiSettings = {
    selectedProvider: () => picker.selectedOptions[0]?.dataset.provider || 'gpt',
    select: mainTabs.select,
    open(section = 'strategy', { fromEditor = false } = {}) {
      openingEditor = fromEditor;
      if (create.open) { returnToCreate = true; create.close(); }
      window.Warrior.openAiSettings(section);
      openingEditor = false;
    },
    editing(id, provider) {
      addingAgent = !id;
      if (addingAgent) {
        picker.replaceChildren();
        Object.entries({claude:'Claude',gpt:'GPT',deepseek:'DeepSeek'}).forEach(([value, name]) => {
          const option = make('option', name); option.value = value; option.dataset.provider = value;
          option.dataset.noTranslate = ''; picker.append(option);
        });
        picker.value = provider;
      } else refreshPicker(id);
      editorTabs.select(id ? 'policy' : 'basic');
    },
    closed() { addingAgent = false; refreshPicker(''); },
    saved(id) { window.agentSetup.open(id); },
    invalid() { editorTabs.select('inputs'); },
  };
  refreshPicker();
})();
