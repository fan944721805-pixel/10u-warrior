/* Read-only Android widget projection. Never submits an order or changes a battle. */
((root) => {
  const statuses = { running:'运行中', paused:'已暂停', ended:'已结束', settling:'结算中',
    reconnecting:'连接恢复中', 'retry-paused':'等待重试', 'awaiting-settlement':'等待结算' };
  function project(battles, { now = Date.now(), t = v => v, label = p => p.strategy || 'AI', icon = () => '', network = 'online' } = {}) {
    const amount = v => typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '—';
    const rows = battles.filter(b => !b.placeholder).flatMap(b => (b.agents || []).map(a => {
      const orders = (a.orders || []).filter(o => o.status === 'OPEN');
      const current = orders.filter(o => o.start <= now && o.end > now);
      const direction = [...new Set(current.map(o => o.direction))].map(d => t(d === 'UP' ? '看涨' : d === 'DOWN' ? '看空' : '观望')).join(' / ');
      const profit = a.equity - b.config.initialBalance - (a.addedCapital || 0);
      const state = network === 'error' ? '行情连接中断' : b.error || b.aiConnectionFailure ? '等待恢复' : statuses[b.status] || '等待更新';
      return { battleId:b.id, agentId:a.id, name:label(a.policy || {}), battleName:b.name,
        icon:icon(a.policy || {}), coin:a.policy?.coin || '',
        funds:`${t('模拟资金')}  ${amount(a.equity)} U`,
        profit:`${t('已结算收益')}  ${profit > 0 ? '+' : ''}${amount(profit)} U`,
        fundsLabel:t('模拟资金'), fundsValue:`${amount(a.equity)} U`,
        profitLabel:t('已结算收益'), profitValue:`${profit > 0 ? '+' : ''}${amount(profit)} U`,
        roundLabel:t('本轮下注'),
        positive:Number.isFinite(profit) && profit >= 0,
        action:direction || t(orders.length ? '等待结算' : '观望'),
        status:t(state), key:JSON.stringify([b.id,a.id]) };
    }));
    return { rows, labels: { title:t('策略战况'), hint:t('上下滑动切换 · 点击查看详情'),
      empty:t('暂无策略，点击打开应用开一局'), snapshot:t('快照'), age:t('距更新 %s'),
      stale:t('更新中断，点击打开应用'), unavailable:t('读取失败，显示上次快照'), paper:t('模拟'), open:t('打开应用') } };
  }
  if (typeof module === 'object' && module.exports) { module.exports = { project }; return; }
  if (!root.Capacitor?.isNativePlatform?.()) return;
  const api = root.Warrior?.simulationApi;
  const plugin = root.Capacitor.Plugins?.StrategyWidget || root.Capacitor.registerPlugin?.('StrategyWidget');
  if (!api || !plugin) return;
  const t = v => root.Warrior.i18n?.t(v) || v;
  let pending = false, again = false, timer, lastSignature = '', lastSent = 0;
  async function sync() {
    if (pending) { again = true; return; }
    pending = true;
    try {
      const { battles } = await api.list();
      const snapshots = await Promise.all(battles.filter(b => !b.placeholder).map(b => api.snapshot(b.id)));
      const payload = project(snapshots, { t, network:api.networkStatus?.().status,
        label:p => t(root.Warrior.agentLabel(p)),
        icon:p => root.Warrior.skins?.get(root.Warrior.skins.resolveId(p))?.imageUrl || '' });
      const signature = JSON.stringify(payload);
      // Events update immediately (debounced); a heartbeat proves the JS runtime
      // was still available even if the ledger did not change. No polling of prices.
      if (signature !== lastSignature || Date.now() - lastSent >= 25000) {
        if (api.serviceOwned) {
          const words = ['模拟资金','已结算收益','本轮下注','看涨','看空','观望','等待结算','行情连接中断','等待恢复',...Object.values(statuses)];
          await api.configureWidget({ labels:payload.labels, words:Object.fromEntries(words.map(word=>[word,t(word)])),
            names:payload.rows.map(row=>({key:row.key,name:row.name,icon:row.icon})) });
        } else await plugin.update({ snapshot:payload });
        lastSignature = signature; lastSent = Date.now();
      }
    } catch { lastSignature = ''; await plugin.unavailable().catch(() => {}); }
    finally { pending = false; if (again) { again = false; schedule(); } }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => void sync(), 250); }
  api.subscribe?.(schedule);
  root.addEventListener('warrior-language-change', schedule);
  root.addEventListener('warrior-mobile-network', schedule);
  root.addEventListener('pageshow', schedule);
  root.document.addEventListener('visibilitychange', schedule);
  setInterval(schedule, 30000);
  schedule();

  let opening = false, openAgain = false;
  async function openPending() {
    if (opening) { openAgain = true; return; }
    opening = true;
    try {
      const target = await plugin.consumeOpen();
      if (target.battleId && target.agentId) await root.Warrior.openStrategy(target.battleId,target.agentId);
    } catch { root.toast?.(t('该策略已移除或暂时无法读取')); }
    finally { opening = false; if (openAgain) { openAgain = false; void openPending(); } }
  }
  plugin.addListener('openStrategy', () => void openPending());
  void openPending();

  const section = document.createElement('section'); section.className = 'strategy-widget-settings';
  section.innerHTML = '<h3>桌面小组件</h3><p>在手机桌面上下滑动查看策略战况。系统暂停后台时，显示上次快照。</p><button type="button" class="secondary">添加到桌面</button><p role="status"></p>';
  section.style.cssText = 'border-top:1px solid #d1bce3;margin-top:20px;padding-top:12px';
  const button = section.querySelector('button'); button.style.minHeight = '48px';
  const pinStatus = section.querySelector('[role=status]');
  const pinHelp = document.createElement('p'); pinHelp.hidden = true;
  pinHelp.textContent = '请长按桌面 → 小组件 → 10U 战神'; section.append(pinHelp);
  let pinAttempt = null, pinTimer;
  async function checkPin() {
    const attempt = pinAttempt;
    if (!attempt) return;
    try {
      const result = await plugin.pinStatus();
      if (pinAttempt !== attempt) return;
      if (result.count > attempt.countBefore) {
        pinStatus.textContent = '小组件已添加到桌面'; pinHelp.hidden = true;
        pinAttempt = null; clearTimeout(pinTimer); return;
      }
    } catch { /* Older native builds still get the manual instructions. */ }
    if (pinAttempt === attempt) {
      pinStatus.textContent = '尚未确认添加。若没有弹窗，请从桌面手动添加。';
      pinHelp.hidden = false;
    }
  }
  root.document.addEventListener('visibilitychange', () => {
    if (!root.document.hidden) void checkPin();
  });
  button.onclick = async () => {
    button.disabled = true; clearTimeout(pinTimer); pinAttempt = null;
    pinStatus.textContent = ''; pinHelp.hidden = true;
    try {
      await sync();
      const result = await plugin.pin();
      pinHelp.hidden = false;
      if (result.supported) {
        pinStatus.textContent = '请确认系统添加提示；若没有弹窗，可从桌面手动添加。';
        pinAttempt = { countBefore:result.countBefore };
        pinTimer = setTimeout(() => void checkPin(), 6000);
      } else pinStatus.textContent = '当前桌面未接受添加请求，请手动添加。';
    } catch {
      pinStatus.textContent = '当前桌面未接受添加请求，请手动添加。'; pinHelp.hidden = false;
    }
    finally { button.disabled = false; }
  };
  document.querySelector('#battle-settings-dialog')?.append(section);
})(typeof window === 'undefined' ? null : window);
