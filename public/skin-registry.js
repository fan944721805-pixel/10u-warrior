(() => {
  const STORAGE_KEY = 'warrior-generated-skins-v1';
  const listeners = new Set();
  const skins = new Map([
    ['anime-female', {
      id: 'anime-female',
      kind: 'builtin',
      name: '动漫术师',
      previewClass: 'skin-preview-female',
    }],
    ['warrior-male', {
      id: 'warrior-male',
      kind: 'builtin',
      name: '财富战神',
      previewClass: 'skin-preview-male',
    }],
  ]);
  // Shipped artwork uses the existing generated-image renderer and saved skin IDs.
  const bundledImages = [
    ['rider', 'delivery-rider-scooter.png'],
    ['rider-avatar', 'delivery-rider-avatar.png'],
    ...['super-ai','miser','buffett','trend-chaser','bottom-top-hunter','candlestick-bro','rocket-bro','whale-detective','steady-dog','six-vote-warrior','feng-shui-master','diviner'].map(id => [id, `strategy-icons/${id}.png`]),
    ['cz-brother','strategy-icons/cz-brother-v2.png'],['contrarian','strategy-icons/contrarian.png'],['showoff','strategy-icons/showoff.png'],['first-lady','strategy-icons/first-lady.png'],
  ];
  bundledImages.forEach(([id, imageUrl], index) => {
    const skinId = `generated-bundled-${id}`;
    skins.set(skinId, {id:skinId, kind:'generated', bundled:true, name:String(index + 1), imageUrl, frame:{x:50,y:50,size:100}});
  });

  function safeImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) throw new Error('Generated skin image is required');
    if (/^data:image\/(?:png|jpeg|webp|avif);base64,/i.test(raw)) return raw;
    if (/^blob:/i.test(raw)) return raw;
    const parsed = new URL(raw, location.href);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported skin image URL');
    return parsed.href;
  }

  function normalizeFrame(frame = {}) {
    const x = Number(frame.x ?? 50);
    const y = Number(frame.y ?? 50);
    const size = Number(frame.size ?? 100);
    return {
      x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,
      y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50,
      size: Number.isFinite(size) ? Math.max(50, Math.min(500, size)) : 100,
    };
  }

  function normalizeGenerated(definition) {
    const id = String(definition?.id || '').trim();
    if (!/^generated-[a-z0-9][a-z0-9-]{2,48}$/i.test(id)) throw new Error('Invalid generated skin id');
    const name = String(definition?.name || '').trim().slice(0, 32);
    if (!name) throw new Error('Generated skin name is required');
    return {
      id,
      name,
      kind: 'generated',
      imageUrl: safeImageUrl(definition.imageUrl),
      frame: normalizeFrame(definition.frame),
      createdAt: Number(definition.createdAt) || Date.now(),
    };
  }

  function readStored() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(value)) return;
      value.forEach(item => {
        try {
          const skin = normalizeGenerated(item);
          if (!skin.imageUrl.startsWith('blob:') && !skins.get(skin.id)?.bundled) skins.set(skin.id, skin);
        } catch {}
      });
    } catch {}
  }

  function persist() {
    const generated = [...skins.values()].filter(item => item.kind === 'generated' && !item.bundled && !item.imageUrl.startsWith('blob:'));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(generated)); } catch {}
  }

  function notify() {
    const snapshot = list();
    listeners.forEach(listener => listener(snapshot));
    window.dispatchEvent(new CustomEvent('warrior-skins-change', { detail: { skins: snapshot } }));
  }

  function registerGenerated(definition) {
    const skin = normalizeGenerated(definition);
    if (skins.get(skin.id)?.bundled) throw new Error('Reserved bundled skin id');
    skins.set(skin.id, skin);
    persist();
    notify();
    return { ...skin };
  }

  function removeGenerated(id) {
    const skin = skins.get(id);
    if (!skin || skin.kind !== 'generated' || skin.bundled) return false;
    skins.delete(id);
    persist();
    notify();
    return true;
  }

  function list() {
    return [...skins.values()].map(item => ({ ...item, frame: item.frame ? { ...item.frame } : undefined }));
  }

  function get(id) {
    return skins.get(String(id || '').replace(/^chosen:/, '')) || skins.get('anime-female');
  }

  function normalizeId(id) {
    return skins.has(String(id || '').replace(/^chosen:/, '')) ? id : 'anime-female';
  }

  const strategySkins = {
    aggressive:'rider', smart:'super-ai', conservative:'miser', trendFollowing:'trend-chaser',
    meanReversion:'bottom-top-hunter', priceAction:'candlestick-bro', breakout:'rocket-bro', orderFlow:'whale-detective',
    volatilityGuard:'steady-dog', consensus:'six-vote-warrior',
    fengShui:'feng-shui-master', diviner:'diviner', czBrother:'cz-brother', contrarian:'contrarian', showoff:'showoff', firstLady:'first-lady',
  };
  // Legacy builtin IDs were assigned automatically. Explicit picks carry their intent
  // in the existing skinId string so battle snapshots retain it without a schema change.
  function resolveId({skinId, strategy, provider='gpt'} = {}) {
    const id=normalizeId(skinId);
    // Replace the two borrowed launch defaults, but retain deliberate chosen: picks.
    const borrowed={fengShui:'generated-bundled-buffett',diviner:'generated-bundled-six-vote-warrior'};
    if(id===borrowed[strategy])return `generated-bundled-${strategySkins[strategy]}`;
    if(String(id).startsWith('chosen:') || get(id).kind==='generated') return id;
    const key=strategy || ({claude:'aggressive',gpt:'smart',deepseek:'conservative'}[provider]);
    return `generated-bundled-${strategySkins[key] || 'super-ai'}`;
  }

  function applyElement(element, config = {}) {
    if (!element) return;
    const {provider='gpt',frame='default'}=config;
    const skin = get(resolveId(config));
    element.dataset.skinId = skin.id;
    element.dataset.skinKind = skin.kind;
    element.dataset.skinProvider = provider;
    element.dataset.skinFrame = frame;
    element.style.removeProperty('--agent-skin-image');
    element.style.removeProperty('--agent-skin-position');
    element.style.removeProperty('--agent-skin-size');
    if (skin.kind === 'generated') {
      const image = `url(${JSON.stringify(skin.imageUrl)})`;
      element.style.setProperty('--agent-skin-image', image);
      element.style.setProperty('--agent-skin-position', `${skin.frame.x}% ${skin.frame.y}%`);
      element.style.setProperty('--agent-skin-size', `${skin.frame.size}%`);
    }
  }

  function applyAgent(agentId, config = {}, root = document) {
    const escaped = CSS.escape(agentId);
    const provider = config.provider || agentId;
    const selectors = [
      `[data-ai-config="${escaped}"] .ai-avatar`,
      `.model-card[data-model="${escaped}"] .model-ai-avatar`,
      `[data-orb="${escaped}"]`,
      `[data-agent-avatar="${escaped}"]`,
    ];
    root.querySelectorAll(selectors.join(',')).forEach(element => applyElement(element, { ...config, provider }));
  }

  function applyCatalog(catalog = window.modelCatalog || {}, root = document) {
    Object.entries(catalog).forEach(([id, config]) => applyAgent(id, config, root));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  readStored();
  window.Warrior = window.Warrior || {};
  window.Warrior.skins = {
    list,
    get,
    normalizeId,
    resolveId,
    applyElement,
    applyAgent,
    applyCatalog,
    registerGenerated,
    removeGenerated,
    subscribe,
    contractVersion: 1,
  };
})();
