(() => {
  const buttons = [...document.querySelectorAll('button[data-avatar-mode]')];
  const catalog = window.modelCatalog || {};
  const skins = window.Warrior?.skins;
  if (!buttons.length || !skins) return;

  const storageKey = 'warrior-avatar-mode';
  const skinForMode = mode => mode === 'male' ? 'warrior-male' : 'anime-female';
  const modeForSkin = skinId => skinId === 'warrior-male' ? 'male' : 'female';

  function hasStoredPerAgentSkins() {
    try {
      const value = JSON.parse(localStorage.getItem('warrior-agent-config-v1') || '{}');
      const agents = Array.isArray(value) ? value : value.agents;
      return Array.isArray(agents) && agents.some(agent => typeof agent?.skinId === 'string');
    } catch { return false; }
  }

  function storedMode() {
    try { return localStorage.getItem(storageKey) === 'male' ? 'male' : 'female'; }
    catch { return 'female'; }
  }

  function selectedMode() {
    const active = Object.values(catalog).map(item => modeForSkin(item.skinId));
    return active.length && active.every(mode => mode === active[0]) ? active[0] : 'mixed';
  }

  function renderMode(announce = false) {
    const mode = selectedMode();
    document.body.dataset.avatarMode = mode === 'male' ? 'male' : 'female';
    buttons.forEach(button => {
      const selected = button.dataset.avatarMode === mode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const skinNote = document.querySelector('.skin-note');
    if (skinNote) skinNote.textContent = mode === 'mixed' ? 'Agent 独立皮肤' : mode === 'male' ? '财富战神皮肤' : '动漫术师皮肤';
    skins.applyCatalog(catalog);
    window.dispatchEvent(new CustomEvent('character-mode-change', { detail: { mode } }));
    clearTimeout(window.characterModeTimer);
    document.body.classList.add('is-character-switching');
    window.characterModeTimer = setTimeout(() => document.body.classList.remove('is-character-switching'), 420);
    if (announce && typeof window.toast === 'function') window.toast(mode === 'male' ? '全部 Agent 已换成财富战神皮肤' : '全部 Agent 已换成动漫术师皮肤');
  }

  function applyMode(nextMode, announce = false) {
    const mode = nextMode === 'male' ? 'male' : 'female';
    const skinId = skinForMode(mode);
    Object.values(catalog).forEach(config => { config.skinId = skinId; });
    try { localStorage.setItem(storageKey, mode); } catch {}
    window.agentSetup?.persistSkins?.();
    renderMode(announce);
  }

  if (!hasStoredPerAgentSkins()) {
    const legacySkin = skinForMode(storedMode());
    Object.values(catalog).forEach(config => { config.skinId = legacySkin; });
    window.agentSetup?.persistSkins?.();
  }

  buttons.forEach(button => button.addEventListener('click', () => applyMode(button.dataset.avatarMode, true)));
  window.addEventListener('warrior-agent-skin-change', () => renderMode());
  renderMode();
})();
