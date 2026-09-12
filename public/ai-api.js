(() => {
  const dialog = document.querySelector('#api-dialog');
  const opener = document.querySelector('#api-connect');
  const form = document.querySelector('#api-form');
  if (!dialog || !opener || !form) return;

  const DB_NAME = 'warrior-ai-api-vault';
  const DB_VERSION = 1;
  const providers = {
    openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-5-mini', type: 'openai' },
    anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6', type: 'anthropic' },
    deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', type: 'compatible' },
    custom: { name: '自定义', baseUrl: 'http://127.0.0.1:11434/v1', model: '', type: 'compatible' }
  };
  const keyInput = document.querySelector('#api-key');
  const baseInput = document.querySelector('#api-base-url');
  const modelInput = document.querySelector('#api-model');
  const result = document.querySelector('#api-test-result');
  const stateLabel = document.querySelector('#api-provider-state');
  const savedList = document.querySelector('#api-saved-list');
  const savedCount = document.querySelector('#api-saved-count');
  const saveButton = document.querySelector('#api-save');
  const testButton = document.querySelector('#api-test');
  let activeProvider = 'openai';
  let connections = new Map();
  let openButton = null;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('本机存储不可用'));
  });
  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB || !window.crypto?.subtle) {
        reject(new Error('当前浏览器不支持本机加密存储'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('vault')) db.createObjectStore('vault', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('connections')) db.createObjectStore('connections', { keyPath: 'provider' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('无法打开本机凭据仓库'));
    });
  }
  async function useStore(name, mode, action) {
    const db = await openDatabase();
    try {
      const tx = db.transaction(name, mode);
      const store = tx.objectStore(name);
      const completed = new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error || new Error('本机存储操作已取消'));
        tx.onerror = () => reject(tx.error || new Error('本机存储操作失败'));
      });
      const value = await action(store);
      await completed;
      return value;
    } finally {
      db.close();
    }
  }
  async function deviceKey() {
    const existing = await useStore('vault', 'readonly', store => request(store.get('device-key')));
    if (existing?.key) return existing.key;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await useStore('vault', 'readwrite', store => request(store.put({ id: 'device-key', key })));
    return key;
  }
  async function encryptSecret(secret) {
    const key = await deviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(secret));
    return { iv, cipher };
  }
  async function decryptSecret(record) {
    if (!record?.secret?.cipher || !record?.secret?.iv) throw new Error('本机密钥记录已损坏，请重新保存');
    const key = await deviceKey();
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.secret.iv }, key, record.secret.cipher);
    return new TextDecoder().decode(plain);
  }
  const getAllConnections = () => useStore('connections', 'readonly', store => request(store.getAll()));
  const saveConnection = record => useStore('connections', 'readwrite', store => request(store.put(record)));
  const deleteConnection = provider => useStore('connections', 'readwrite', store => request(store.delete(provider)));

  function providerLabel(id) { return providers[id]?.name || id; }
  function resetResult() {
    result.dataset.state = 'idle';
    result.querySelector('.api-result-icon').textContent = '◇';
    result.querySelector('strong').textContent = '尚未测试';
    result.querySelector('small').textContent = '保存后可随时重新验证';
  }
  function setResult(state, title, detail) {
    result.dataset.state = state;
    result.querySelector('.api-result-icon').textContent = state === 'success' ? '✓' : state === 'error' ? '!' : '◌';
    result.querySelector('strong').textContent = title;
    result.querySelector('small').textContent = detail;
  }
  function renderProvider() {
    const provider = providers[activeProvider];
    const saved = connections.get(activeProvider);
    document.querySelectorAll('[data-api-provider]').forEach(button => {
      const selected = button.dataset.apiProvider === activeProvider;
      button.classList.toggle('selected', selected);
      button.classList.toggle('is-saved', connections.has(button.dataset.apiProvider));
      button.setAttribute('aria-selected', String(selected));
    });
    document.querySelector('#api-provider-eyebrow').textContent = provider.name.toUpperCase();
    document.querySelector('#api-provider-title').textContent = `连接 ${provider.name}`;
    stateLabel.textContent = saved ? '已保存在本机' : '未配置';
    stateLabel.classList.toggle('is-saved', Boolean(saved));
    baseInput.value = saved?.baseUrl || provider.baseUrl;
    modelInput.value = saved?.model || provider.model;
    keyInput.value = '';
    keyInput.placeholder = saved ? '已保存在本机 · 输入新 Key 可替换' : '输入 API Key';
    keyInput.required = !saved;
    keyInput.type = 'password';
    document.querySelector('#api-key-toggle').textContent = '显示';
    document.querySelector('#api-key-toggle').setAttribute('aria-label', '显示 API Key');
    resetResult();
  }
  function renderSaved() {
    const records = [...connections.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    savedList.replaceChildren();
    savedCount.textContent = `${records.length} 个已配置`;
    opener.classList.toggle('has-config', records.length > 0);
    if (!records.length) {
      const empty = document.createElement('p');
      empty.textContent = '还没有保存的 API 连接。';
      savedList.append(empty);
      return;
    }
    records.forEach(record => {
      const card = document.createElement('article');
      card.className = 'api-saved-card';
      const mark = document.createElement('span');
      mark.className = `api-provider-mark provider-${record.provider}`;
      mark.textContent = record.provider === 'custom' ? '＋' : providerLabel(record.provider).slice(0, 1);
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = providerLabel(record.provider);
      const meta = document.createElement('small');
      meta.textContent = `${record.model} · ${record.lastStatus === 'success' ? '测试通过' : '已加密保存'}`;
      copy.append(name, meta);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'api-saved-remove';
      remove.dataset.removeApi = record.provider;
      remove.setAttribute('aria-label', `移除 ${providerLabel(record.provider)} 本地凭据`);
      remove.textContent = '×';
      card.append(mark, copy, remove);
      savedList.append(card);
    });
  }
  async function refreshConnections() {
    const records = await getAllConnections();
    connections = new Map(records.map(record => [record.provider, record]));
    renderSaved();
    renderProvider();
  }
  function normalizedBaseUrl(value) {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Base URL 必须使用 http 或 https');
    return parsed.href.replace(/\/$/, '');
  }
  function currentValues() {
    const baseUrl = normalizedBaseUrl(baseInput.value);
    const model = modelInput.value.trim();
    if (!model) throw new Error('请输入模型 ID');
    return { baseUrl, model };
  }
  function notify(message) {
    if (typeof window.toast === 'function') window.toast(message);
  }
  async function saveCurrent({ silent = false } = {}) {
    const values = currentValues();
    const existing = connections.get(activeProvider);
    const rawKey = keyInput.value.trim();
    if (!rawKey && !existing) throw new Error('请输入 API Key');
    const secret = rawKey ? await encryptSecret(rawKey) : existing.secret;
    const record = { ...existing, provider: activeProvider, ...values, secret, updatedAt: Date.now() };
    await saveConnection(record);
    connections.set(activeProvider, record);
    keyInput.value = '';
    keyInput.placeholder = '已保存在本机 · 输入新 Key 可替换';
    renderSaved();
    renderProvider();
    if (!silent) notify(`${providerLabel(activeProvider)} 已保存到本机`);
    return record;
  }
  function apiErrorMessage(status, payload) {
    const message = payload?.error?.message || payload?.message || `HTTP ${status}`;
    const rawKey = keyInput.value.trim();
    return (rawKey ? String(message).replaceAll(rawKey, '••••') : String(message)).slice(0, 180);
  }
  async function directTest(record, secret) {
    const provider = providers[record.provider];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let url;
    let options;
    if (provider.type === 'openai') {
      url = `${record.baseUrl}/models/${encodeURIComponent(record.model)}`;
      options = { headers: { Authorization: `Bearer ${secret}` }, signal: controller.signal };
    } else if (provider.type === 'anthropic') {
      url = `${record.baseUrl}/messages`;
      options = { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': secret, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: record.model, max_tokens: 4, messages: [{ role: 'user', content: 'Reply only: OK' }] }), signal: controller.signal };
    } else {
      url = `${record.baseUrl}/chat/completions`;
      options = { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${secret}` }, body: JSON.stringify({ model: record.model, max_tokens: 4, temperature: 0, messages: [{ role: 'user', content: 'Reply only: OK' }] }), signal: controller.signal };
    }
    try {
      const response = await fetch(url, options);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiErrorMessage(response.status, payload));
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }
  async function testCurrent(event) {
    event.preventDefault();
    const started = performance.now();
    saveButton.disabled = true;
    testButton.disabled = true;
    setResult('testing', '正在测试连接…', '浏览器正直接联系所选 API');
    try {
      const existing = connections.get(activeProvider);
      let record;
      if (keyInput.value.trim()) {
        const values = currentValues();
        record = { ...existing, provider: activeProvider, ...values, secret: await encryptSecret(keyInput.value.trim()), updatedAt: Date.now() };
      } else {
        if (!existing) throw new Error('请输入 API Key');
        record = { ...existing, ...currentValues() };
      }
      const secret = keyInput.value.trim() || await decryptSecret(existing);
      await directTest(record, secret);
      const latency = Math.max(1, Math.round(performance.now() - started));
      record.lastStatus = 'success';
      record.lastLatency = latency;
      record.updatedAt = Date.now();
      await saveConnection(record);
      connections.set(activeProvider, record);
      keyInput.value = '';
      keyInput.placeholder = '已保存在本机 · 输入新 Key 可替换';
      renderSaved();
      document.querySelectorAll('[data-api-provider]').forEach(button => button.classList.toggle('is-saved', connections.has(button.dataset.apiProvider)));
      stateLabel.textContent = '连接可用';
      stateLabel.classList.add('is-saved');
      setResult('success', '连接成功', `${providerLabel(activeProvider)} · ${latency} ms`);
      notify(`${providerLabel(activeProvider)} 连接成功`);
    } catch (error) {
      const isNetwork = error instanceof TypeError || error?.name === 'AbortError';
      const detail = error?.name === 'AbortError' ? '请求超时，请检查网络或接口地址' : isNetwork ? '浏览器直连被网络或 CORS 策略阻止；Key 未经过本机服务' : (error.message || '测试失败');
      setResult('error', '连接失败', detail);
    } finally {
      saveButton.disabled = false;
      testButton.disabled = false;
    }
  }

  document.querySelectorAll('[data-api-provider]').forEach(button => button.addEventListener('click', () => {
    activeProvider = button.dataset.apiProvider;
    renderProvider();
  }));
  opener.addEventListener('click', async () => {
    openButton = document.activeElement;
    try { await refreshConnections(); } catch (error) { setResult('error', '本机存储不可用', error.message); }
    dialog.showModal();
    document.querySelector('[data-api-provider].selected')?.focus();
  });
  document.querySelector('.api-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => openButton?.focus());
  document.querySelector('#api-key-toggle').addEventListener('click', event => {
    const visible = keyInput.type === 'text';
    keyInput.type = visible ? 'password' : 'text';
    event.currentTarget.textContent = visible ? '显示' : '隐藏';
    event.currentTarget.setAttribute('aria-label', visible ? '显示 API Key' : '隐藏 API Key');
  });
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    try { await saveCurrent(); } catch (error) { setResult('error', '保存失败', error.message); }
    finally { saveButton.disabled = false; }
  });
  form.addEventListener('submit', testCurrent);
  savedList.addEventListener('click', async event => {
    const button = event.target.closest('[data-remove-api]');
    if (!button) return;
    const provider = button.dataset.removeApi;
    button.disabled = true;
    try {
      await deleteConnection(provider);
      connections.delete(provider);
      renderSaved();
      if (activeProvider === provider) renderProvider();
      notify(`${providerLabel(provider)} 本地凭据已移除`);
    } catch (error) {
      button.disabled = false;
      setResult('error', '移除失败', error.message);
    }
  });
  refreshConnections().catch(() => {});
})();
