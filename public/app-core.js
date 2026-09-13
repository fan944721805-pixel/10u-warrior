(() => {
  const events = new EventTarget();
  const state = {
    page: 'overview',
    dialog: null,
    simulation: null,
  };

  function emit(type, detail = {}) {
    events.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function on(type, listener, options) {
    events.addEventListener(type, listener, options);
    return () => events.removeEventListener(type, listener, options);
  }

  function setState(partial, reason = 'state:update') {
    Object.assign(state, partial);
    emit(reason, { ...state });
    return state;
  }

  window.Warrior = Object.assign(window.Warrior || {}, {
    agentLabel(policy = {}) {
      const key = policy.strategy || ({claude:'aggressive',gpt:'smart',deepseek:'conservative'}[policy.provider]);
      const strategy=window.WarriorStrategyCatalog?.profiles?.[key]?.label || 'AI';
      return strategy;
    },
    events,
    state,
    emit,
    on,
    setState,
  });
})();
