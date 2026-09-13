(() => {
  const api = window.Warrior?.simulationApi;
  if (!api?.keepInBackground) return;

  // Legacy offline demo only. Native execution now belongs to SimulationService.
  let advancing = false;
  async function advanceHiddenBattles() {
    if (api.serviceOwned || !document.hidden || advancing) return;
    advancing = true;
    try { await api.list(); }
    catch { /* The offline engine records storage failures and stops betting. */ }
    finally { advancing = false; }
  }
  if (!api.serviceOwned) setInterval(() => void advanceHiddenBattles(), 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void advanceHiddenBattles();
    else void refreshStatus();
  });
  window.addEventListener('pageshow', () => void refreshStatus());
  window.addEventListener('warrior-android-resume', () => void refreshStatus());

  const panel = document.createElement('section');
  panel.className = 'android-background';
  panel.innerHTML = '<h3>后台模拟</h3><p>切到后台继续模拟；系统仍可能挂起。需要停止时请点暂停。</p><p class="android-background-status" role="status"></p><div class="android-background-actions"><button type="button" class="secondary" data-setting="battery">电池优化设置</button><button type="button" class="secondary" data-setting="app">应用后台设置</button></div><p>在系统中找到 10U 战神，将电池设为不受限制或允许后台运行。不同手机名称可能不同。</p>';
  document.querySelector('#battle-settings-dialog').append(panel);
  if (api.serviceOwned) {
    panel.querySelector('p').textContent = '对局由后台服务运行，切换应用不停止行情和模拟下注。通知栏可暂停全部下注，已有订单继续结算。';
    const serviceStatus = document.createElement('p'); serviceStatus.setAttribute('role', 'status');
    panel.append(serviceStatus);
    const notifications = document.createElement('button'); notifications.type = 'button';
    notifications.className = 'secondary'; notifications.textContent = '显示运行通知';
    panel.querySelector('.android-background-actions').append(notifications);
    notifications.onclick = async () => {
      try { await window.Capacitor.Plugins.NativeRuntime.requestNotifications(); }
      catch { serviceStatus.textContent = '无法读取后台服务状态'; }
      finally { void refreshServiceStatus(); }
    };
    async function refreshServiceStatus() {
      try {
        const state = await api.serviceStatus();
        serviceStatus.textContent = state.error ? '后台服务异常，请重新打开应用；对局恢复后保持暂停。'
          : state.foreground ? '后台服务运行中' : '暂无运行中的对局';
        notifications.hidden = state.notificationsEnabled;
      } catch { serviceStatus.textContent = '无法读取后台服务状态'; }
    }
    api.subscribe(() => void refreshServiceStatus());
    window.addEventListener('warrior-android-resume', () => void refreshServiceStatus());
    void refreshServiceStatus();
  }
  // Prompt on first use/upgrade. Deferring suppresses it for one day, never
  // marks a permission granted. Opening system settings is not a grant either.
  const reminderKey = 'warrior-background-reminder-v1';
  let deferredUntil = 0, reminderNeeded = false;
  try { deferredUntil = Number(localStorage.getItem(reminderKey)) || 0; } catch {}
  const prompt = document.createElement('dialog');
  prompt.id = 'android-background-prompt';
  prompt.setAttribute('aria-labelledby', 'android-background-title');
  prompt.setAttribute('aria-describedby', 'android-background-description');
  prompt.innerHTML = '<h2 id="android-background-title">允许后台运行</h2><p id="android-background-description">切到其他应用后，系统可能暂停对局。请将电池使用设为不受限制，并允许应用后台运行。</p><p class="android-background-status" role="status"></p><div class="android-background-actions"><button type="button" class="primary" data-setting="battery">电池优化设置</button><button type="button" class="secondary" data-setting="app">应用后台设置</button></div><p>部分手机还需允许自启动。开启后仍可能被系统挂起，不保证锁屏持续运行。</p><button type="button" class="secondary android-background-dismiss">稍后设置</button>';
  document.body.append(prompt);
  const statuses = [panel, prompt].map(el => el.querySelector('.android-background-status'));
  const buttons = [...panel.querySelectorAll('[data-setting]'), ...prompt.querySelectorAll('[data-setting]')];
  const dismiss = prompt.querySelector('.android-background-dismiss');
  function setStatus(text) { statuses.forEach(el => { el.textContent = text; }); }
  function maybePrompt() {
    if (!reminderNeeded || document.hidden || prompt.open || Date.now() < deferredUntil || document.querySelector('dialog[open]')) return;
    openDialog('#android-background-prompt');
  }
  function deferReminder() {
    deferredUntil = Date.now() + 24 * 60 * 60 * 1000;
    try { localStorage.setItem(reminderKey, String(deferredUntil)); } catch {}
  }
  dismiss.onclick = () => { deferReminder(); prompt.close(); };
  prompt.addEventListener('cancel', deferReminder);
  prompt.addEventListener('close', () => {
    deferReminder();
    focusReturn?.focus();
  });
  // If another dialog was already open at startup, show after it closes.
  document.addEventListener('close', () => queueMicrotask(maybePrompt), true);
  let plugin;
  try {
    // This project uses plain scripts. Capacitor's injected native bridge exports
    // Plugins directly; registerPlugin exists only when the JS core is bundled.
    plugin = window.Capacitor.Plugins?.BackgroundSettings
      || window.Capacitor.registerPlugin?.('BackgroundSettings');
  } catch {}
  async function refreshStatus() {
    try {
      const result = await plugin.getStatus();
      reminderNeeded = result.ignoringBatteryOptimizations !== true || result.backgroundRestricted === true;
      setStatus(result.backgroundRestricted === true ? '系统限制了后台活动，请在应用后台设置中解除限制。' : result.ignoringBatteryOptimizations
        ? '已豁免电池优化，仍不保证持续运行。' : '尚未豁免电池优化，可在系统设置中调整。');
      dismiss.textContent = reminderNeeded ? '稍后设置' : '完成';
    } catch {
      reminderNeeded = true;
      setStatus('无法读取电池状态，请在系统设置中查看。');
    }
    maybePrompt();
  }
  for (const button of buttons) button.onclick = async () => {
    buttons.forEach(item => { item.disabled = true; });
    try { await plugin.openSettings({ page: button.dataset.setting }); }
    catch { setStatus('无法打开设置，请到手机设置 → 应用 → 10U 战神中调整。'); }
    finally { buttons.forEach(item => { item.disabled = false; }); }
  };
  void refreshStatus();
})();
