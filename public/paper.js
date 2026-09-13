(() => {
  const $ = selector => document.querySelector(selector);
  const api = window.Warrior?.simulationApi;
  if (!api || !$('#simulation-commandbar')) return;
  const offline = api.mode === 'offline';
  const number = value => Number(value ?? 0).toFixed(2);
  const localize = value => window.Warrior?.i18n?.t?.(value) || value;
  const waitingLabels={AI_STAKE_BELOW_MINIMUM:'下注金额低于最低 5U',AI_REASON_CONTRADICTS_INPUT:'AI 观望理由与输入不符',WAIT_CZ_BET:'等待 CZ 下注',WAIT_BULL_TREND:'上涨确认不足',WAIT_PEER_BET:'等待符合条件的对手下注',WAIT_ORACLE_SIGNAL:'牌面与行情尚未形成方向',WAIT_ENTRY_SIGNAL:'等待进场信号',AI_REVIEW_COOLDOWN:'已分析，等待下次复查',AI_WAIT_MARKET_CHANGE:'已分析，等待行情变化',AI_REVIEW_LIMIT:'本轮分析次数已用完',AI_INDICATOR_MISSING:'等待完整行情',AI_EDGE_NOT_POSITIVE:'赔率优势不足',AI_EDGE_LOST_TO_SLIPPAGE:'最新赔率优势不足',AI_STAKE_OVER_CAP:'下注金额超过限制',AI_STAKE_INVALID:'AI 金额格式不正确',AI_PROBE_STAKE_OVER_CAP:'试探下注超过小额限制',AI_STRATEGY_CONDITION_NOT_MET:'策略条件尚未满足',AI_CONFIDENCE_TOO_LOW:'判断把握不足',AI_REQUEST_FAILED:'AI 请求失败',AI_REQUEST_TIMEOUT:'AI 请求超时'};
  function waitingLabel(agent,currentDecision,data){
    if(data.recovery)return '行情恢复中';
    if(!data.enabled)return '已暂停';
    if(agent.waitReason==='WAIT_CZ_BET')return waitingLabels.WAIT_CZ_BET;
    if(currentDecision&&agent.lastDecision.action==='SKIP')return agent.lastDecision.engine?.simulated?'策略选择观望':'AI 选择观望';
    if(currentDecision&&agent.lastDecision.action==='REJECTED')return waitingLabels[agent.lastDecision.reason]||'风控未通过';
    return waitingLabels[agent.waitReason]||waitingLabels[agent.reason]||'等待 AI 决策';
  }
  const aiOutageMessage = '多个 AI 决策连接失败，全部对局已暂停。请检查网络或代理，恢复连接后手动继续。';
  const seenAiOutages = new Set();
  function notifyAiOutage(failure) {
    if (!failure?.id || seenAiOutages.has(failure.id)) return;
    seenAiOutages.add(failure.id);
    window.alert(localize(aiOutageMessage));
  }
  const statusLabels = { running: '进行中', paused: '已暂停', settling: '等待最后结算', ended: '已结束', reconnecting: '连接恢复中', 'retry-paused': '重试已暂停', 'awaiting-settlement': '等待平台结算' };
  const orderLabels = { WATCHING: '等待信号', WAITING: '等待节点', QUOTING: '读取赔率', OPEN: '已下注', SKIPPED: '本轮跳过', PAUSED: '已暂停', INSUFFICIENT_FUNDS: '余额不足', WON: '已结算 · 赢', LOST: '已结算 · 输', SPLIT: '平局 · 按份额结算', CANCELLED: '已取消' };
  const periods = {'5m':{ms:300000,label:'5分钟'},'15m':{ms:900000,label:'15分钟'},'1h':{ms:3600000,label:'1小时'},'1d':{ms:86400000,label:'1天'}};
  const periodFor = value => periods[value] || periods['5m'];
  const easternFormatter = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const easternParts=value=>Object.fromEntries(easternFormatter.formatToParts(new Date(value)).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
  const easternNoon=(year,month,day)=>{const target=Date.UTC(year,month-1,day,12);let candidate=target;for(let index=0;index<3;index+=1){const parts=easternParts(candidate);candidate+=target-Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);}return candidate;};
  const nextPeriodSlot=(value,period)=>{if(period!==periods['1d'])return (Math.floor(value/period.ms)+1)*period.ms;const local=easternParts(value);let candidate=easternNoon(local.year,local.month,local.day);if(candidate<=value){const next=new Date(Date.UTC(local.year,local.month-1,local.day+1));candidate=easternNoon(next.getUTCFullYear(),next.getUTCMonth()+1,next.getUTCDate());}return candidate;};
  const addPeriods=(value,count,period)=>{let result=value;for(let index=0;index<count;index+=1)result=period===periods['1d']?nextPeriodSlot(result,period):result+period.ms;return result;};
  const strategyLabels = Object.fromEntries(Object.entries(window.WarriorStrategyCatalog.profiles).map(([key,profile])=>[key,profile.label]));
  const node = (tag, text, className = '', literal = false) => {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    if (literal) element.dataset.noTranslate = '';
    return element;
  };
  const signed = value => {
    const amount = Number(value ?? 0);
    return `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${number(Math.abs(amount))}`;
  };
  const tone = value => Number(value) > 0 ? 'is-positive' : Number(value) < 0 ? 'is-negative' : 'is-flat';
  const providerFor = id => ({ A: 'claude', B: 'gpt', C: 'deepseek' }[id] || 'gpt');
  const agentAvatar = (policy = {}, className = 'mini-ai-avatar') => {
    const avatar = node('span', '', className);
    avatar.setAttribute('aria-hidden', 'true');
    window.Warrior.skins?.applyElement(avatar, { ...policy, provider: policy.provider || providerFor(policy.id) });
    return avatar;
  };
  const policyForRow = row => {
    const battle = battles.find(item => item.id === row.battleId);
    const agent = battle?.agents.find(item => item.id === row.agentId);
    return agent?.policy || { id: row.agentId, name: `AI ${row.agentId}`, provider: providerFor(row.agentId) };
  };
  const bar = $('#simulation-commandbar');
  bar.innerHTML = '<section class="sim-battles"><form id="sim-create"><button type="submit" class="launch-battle"><span class="launch-battle-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M13.5 3 5 13h6l-1 8 9-11h-6z"/></svg></span><span>开一局</span><span class="launch-battle-bang" aria-hidden="true" data-no-translate>!</span></button></form><span id="sim-action-error" role="status"></span></section><section class="paper-panel"><strong id="sim-asset"></strong><span id="sim-source"></span><span id="sim-market"></span><span id="sim-next" data-no-translate></span><button type="button" id="sim-strategy-lab">AI 策略设置</button><small id="sim-ai-mode"></small><span id="sim-error" role="status"></span></section>';
  $('#sim-source').textContent = offline ? '本地模拟行情 · 规则 AI · 离线演示' : '真实指标与订单簿 · AI 决策 · 模拟成交';
  const quoteNote = order => offline ? '离线模拟估算 · 非保证收益'
    : order.marketSource === 'public-spot' ? '自定义模拟：获胜返还 2 倍，平局退本金'
    : order.quote?.source === 'official-quote' ? '官方报价预估份额 · 含服务费 · 不含链上费用'
    : order.quote?.source === 'real-book-fee-estimate' ? '真实盘口估算 · 已扣估算手续费 · 非实际成交'
    : '按下注时预测盘口估算 · 未扣手续费';
  window.Warrior.on('betting-mode:change', () => { if (current) { renderSource(current); renderCards(current); } });
  window.Warrior.on('live-participation:change', () => { if (current) renderCards(current); });
  function renderSource(data) {
    const sourceLabel = offline ? '本地模拟行情 · 规则 AI · 离线演示'
      : data.marketSource === 'public-spot' ? '免连接模拟 · 公开行情'
      : data.marketSource === 'binance-prediction' ? (window.Warrior.state.bettingMode === 'live' ? '真实下注 · 共用市场与决策' : '真实市场模拟 · 不提交订单')
      : '模拟仓 · 无需连接即可开局';
    $('#active-market').textContent = localize(data.marketSource === 'public-spot' ? '公开行情模拟' : offline ? '离线演示' : 'Binance Prediction');
    $('#sim-source').textContent = sourceLabel;
  }
  let selected = 'default', current = null, battles = [], busy = false, revision = 0, dialogMode = 'create', reportExpanded = false;
  let refreshQueued = false, refreshController = null, reportSnapshot = null;
  let retrySaving = false;
  const recoveryPanel = node('section', '', 'connection-recovery');
  recoveryPanel.id = 'connection-recovery'; recoveryPanel.hidden = true;
  recoveryPanel.innerHTML = '<div><strong class="recovery-title" role="status"></strong><p class="recovery-hint"></p><p class="recovery-progress"></p><p class="recovery-resume"></p></div><div class="recovery-actions"><button type="button" class="recovery-login">检查登录</button><button type="button" class="recovery-retry">立即重试</button></div>';
  $('.performance .section-top').after(recoveryPanel);
  const retryButton = recoveryPanel.querySelector('.recovery-retry');
  recoveryPanel.querySelector('.recovery-login').onclick = () => $('#profile').click();
  retryButton.onclick = async () => {
    if (retrySaving || !current?.recovery || !api.retryConnection) return;
    retrySaving = true; retryButton.disabled = true;
    const target = current.id; revision++;
    try {
      const result = await api.retryConnection(target);
      if (selected === target) { valuation = null; render(result); }
      void refresh({ force: true });
    } catch (error) {
      if (selected === target) recoveryPanel.querySelector('.recovery-hint').textContent = error.code === 'BATTLE_BUSY'
        ? '正在处理本轮，请稍后重试。' : '重试请求未成功，请检查本机服务后再试。';
    } finally { retrySaving = false; retryButton.disabled = false; }
  };
  function renderRecovery() {
    const recovery = current?.recovery;
    recoveryPanel.hidden = !recovery;
    if (!recovery) return;
    recoveryPanel.dataset.state = recovery.status;
    recoveryPanel.querySelector('.recovery-title').textContent = recovery.status === 'exhausted' ? '重试已暂停'
      : recovery.kind === 'settlement' ? '等待平台结算' : recovery.kind === 'auth' ? '登录状态失效' : '连接中断 · 正在重试';
    recoveryPanel.querySelector('.recovery-hint').textContent = recovery.kind === 'auth'
      ? '请检查登录状态，恢复连接后点击立即重试。' : recovery.kind === 'settlement'
      ? '平台尚未提供有效结算结果，订单与本金已保留。' : recovery.kind === 'network'
      ? '无法连接市场服务，请检查网络或代理。' : '市场报价暂不可用，订单与本金已保留。';
    const progress = recoveryPanel.querySelector('.recovery-progress');
    progress.replaceChildren(...(recovery.kind === 'settlement'
      ? [node('span', '每 30 秒查询结算，不占用故障重试次数。')]
      : [node('span', '自动重试'), node('b', ` ${recovery.attempts}/${recovery.maxAttempts} `, '', true)]));
    if (recovery.status === 'exhausted') progress.append(node('span', '已达上限，请手动重试。'));
    else progress.append(node('span', '下次重试'), node('b', ` ${Math.max(0,Math.ceil((recovery.nextRetryAt-Date.now()-clockOffset)/1000))} s`, '', true));
    recoveryPanel.querySelector('.recovery-resume').textContent = !current.enabled || terminal(current)
      ? '仅恢复查询与结算，不会自动继续下注。' : '新下注已暂停；恢复后先补结算，再继续本局。';
    recoveryPanel.querySelector('.recovery-login').hidden = recovery.kind !== 'auth';
    retryButton.disabled = retrySaving || !api.retryConnection;
  }
  const topUpDialog=node('dialog','','top-up-dialog');topUpDialog.id='top-up-dialog';topUpDialog.setAttribute('aria-labelledby','top-up-title');
  topUpDialog.innerHTML='<form><header><h2 id="top-up-title">补筹码</h2><button type="button" class="top-up-close" aria-label="关闭">×</button></header><div class="top-up-agent"></div><label for="top-up-amount">补入金额（U）</label><input id="top-up-amount" type="number" min="0.01" max="1000000" step="0.01" required value="100"><div class="top-up-presets"><button type="button" data-amount="10" data-no-translate>+10</button><button type="button" data-amount="50" data-no-translate>+50</button><button type="button" data-amount="100" data-no-translate>+100</button></div><p>仅增加模拟本金，不计入盈利。</p><div class="top-up-error" role="status"></div><button class="top-up-confirm" type="submit">确认补筹</button></form>';
  document.body.append(topUpDialog);
  const topUpAmount=topUpDialog.querySelector('input'),topUpConfirm=topUpDialog.querySelector('.top-up-confirm'),topUpClose=topUpDialog.querySelector('.top-up-close'),topUpError=topUpDialog.querySelector('.top-up-error');
  let topUpTarget=null,topUpPending=null,topUpSaving=false;
  function openTopUp(agentId){
    // TODO(live): use verified wallet funding and reconciliation, never paper credits.
    if(document.body.dataset.bettingMode==='live'||!current||terminal(current))return;
    const agent=current.agents.find(a=>a.id===agentId);if(!agent)return;
    topUpTarget={battleId:current.id,agentId};topUpPending=null;topUpAmount.value='100';topUpError.textContent='';
    topUpDialog.querySelector('.top-up-agent').replaceChildren(agentAvatar(agent.policy),node('strong',window.Warrior.agentLabel(agent.policy)),node('span','可用'),node('b',number(agent.cash)+' U','',true));
    topUpDialog.showModal();topUpAmount.focus();topUpAmount.select();
  }
  topUpClose.onclick=()=>{if(!topUpSaving)topUpDialog.close();};
  topUpDialog.addEventListener('cancel',event=>{if(topUpSaving)event.preventDefault();});
  topUpDialog.querySelectorAll('[data-amount]').forEach(button=>button.onclick=()=>{topUpAmount.value=button.dataset.amount;topUpError.textContent='';});
  topUpDialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(topUpSaving||!topUpTarget)return;
    if(document.body.dataset.bettingMode==='live'){topUpDialog.close();return;}
    const amount=Number(topUpAmount.value);
    if(!Number.isFinite(amount)||amount<=0||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>1e-7){topUpError.textContent='请输入 0.01–1,000,000，最多两位小数。';return;}
    if(!topUpPending||topUpPending.amount!==amount)topUpPending={...topUpTarget,amount,requestId:crypto.randomUUID()};
    const request=topUpPending;topUpSaving=true;topUpError.textContent='';topUpConfirm.disabled=true;topUpClose.disabled=true;topUpAmount.disabled=true;
    try{
      const result=await api.topUp(request.battleId,request.agentId,request.amount,request.requestId);
      topUpPending=null;topUpDialog.close();
      if(selected===result.id){render(result);void refreshValuation();}
      void refresh({force:true});
    }catch(error){topUpError.textContent=(error.code||error.message)==='BATTLE_BUSY'?'正在处理本轮，请稍后重试。':'补筹未确认，请重试；同一次请求不会重复加钱。';}
    finally{topUpSaving=false;topUpConfirm.disabled=false;topUpClose.disabled=false;topUpAmount.disabled=false;}
  };
  try { selected = localStorage.getItem('warrior-selected-battle') || selected; } catch {}
  const battleSwitcher = node('nav', '', 'battle-switcher');
  battleSwitcher.id = 'battle-switcher'; battleSwitcher.hidden = true;
  battleSwitcher.setAttribute('aria-label', '切换战局');
  $('.performance .experiment-title').before(battleSwitcher);
  const battleButtons = new Map();
  const launchLabel = $('#sim-create .launch-battle > span:nth-child(2)');
  let launchLabelSource = '开一局';
  let emotionSaving = false, actionUrgeSaving = false, realtimeEntrySaving = false;
  const emotionControl = $('#battle-emotion-control'), emotionSlider = $('#battle-emotion'), emotionValue = $('#battle-emotion-value');
  const actionUrgeControl = $('#battle-action-urge-control'), actionUrgeSlider = $('#battle-action-urge'), actionUrgeValue = $('#battle-action-urge-value');
  function addBattleStepper(slider, decreaseLabel, increaseLabel) {
    const row=node('div','','battle-range-row');
    const decrease=node('button','−','battle-range-step'), increase=node('button','+','battle-range-step');
    for (const [button,label,direction] of [[decrease,decreaseLabel,-1],[increase,increaseLabel,1]]) {
      button.type='button';button.setAttribute('aria-label',label);button.setAttribute('aria-controls',slider.id);
      button.addEventListener('click',()=>{
        if(slider.disabled)return;
        const previous=slider.value;
        if(direction<0)slider.stepDown();else slider.stepUp();
        if(slider.value===previous)return;
        slider.dispatchEvent(new Event('input',{bubbles:true}));
        slider.dispatchEvent(new Event('change',{bubbles:true}));
        sync();
      });
    }
    slider.before(row);row.append(decrease,slider,increase);
    function sync() {
      const value=Number(slider.value),min=Number(slider.min),max=Number(slider.max);
      decrease.disabled=slider.disabled||value<=min;increase.disabled=slider.disabled||value>=max;
      slider.style.setProperty('--range-progress',`${(value-min)/(max-min)*100}%`);
    }
    slider.addEventListener('input',sync);
    new MutationObserver(sync).observe(slider,{attributes:true,attributeFilter:['disabled']});
    sync();return sync;
  }
  const syncEmotionStepper=addBattleStepper(emotionSlider,'降低全场上头值','提高全场上头值');
  const syncActionUrgeStepper=addBattleStepper(actionUrgeSlider,'降低全场手痒值','提高全场手痒值');
  const settingsDialog=node('dialog','','battle-settings-dialog');
  settingsDialog.id='battle-settings-dialog';
  settingsDialog.setAttribute('aria-labelledby','battle-settings-title');
  const settingsHeader=node('div','','battle-settings-header');
  const settingsTitle=node('h2','战局设置');settingsTitle.id='battle-settings-title';
  const settingsClose=node('button','×','icon-button');settingsClose.type='button';settingsClose.setAttribute('aria-label','关闭战局设置');
  settingsHeader.append(settingsTitle,settingsClose);
  const settingsTrigger=node('button','','battle-settings-trigger');settingsTrigger.type='button';settingsTrigger.id='battle-settings-open';
  settingsTrigger.setAttribute('aria-label','战局设置');settingsTrigger.setAttribute('aria-haspopup','dialog');settingsTrigger.setAttribute('aria-controls',settingsDialog.id);
  settingsTrigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-.5 3-2 1.2L3.7 6.1l-3 5.2L3 13.2v2.3L.7 17.3l3 5.2 2.8-1.1 2 1.2.5 3h6l.5-3 2-1.2 2.8 1.1 3-5.2-2.3-1.8v-2.3l2.3-1.9-3-5.2-2.8 1.1-2-1.2L15 3Z" transform="translate(2 0) scale(.83)"/><circle cx="12" cy="12" r="3"/></svg>';
  const battleControls=$('.performance .battle-controls');
  const quickControls=node('div','','battle-controls battle-quick-controls');
  battleControls.before(quickControls);quickControls.append($('#pause'),settingsTrigger);
  for(const [id,label] of [['pause','暂停'],['end','停止'],['sim-reset','重置']]) {
    $('#'+id).type='button';$('#'+id).append(node('span',label,'battle-action-label'));
  }
  const settingsFeedback=node('p','','battle-settings-feedback');settingsFeedback.setAttribute('role','status');
  const entryControl = node('div', '', 'realtime-entry-control');
  const entryLabel = node('label', '', 'realtime-entry-label');
  const entryToggle = node('input'); entryToggle.type='checkbox'; entryToggle.id='battle-realtime-entry';
  entryLabel.htmlFor=entryToggle.id; entryLabel.append(node('strong','实时进场'),entryToggle);
  const entryHint=node('p','','realtime-entry-hint');entryHint.id='battle-realtime-entry-hint';entryToggle.setAttribute('aria-describedby',entryHint.id);
  entryControl.append(entryLabel,entryHint);
  settingsDialog.append(settingsHeader,entryControl,emotionControl,actionUrgeControl,battleControls,settingsFeedback);document.body.append(settingsDialog);
  settingsTrigger.onclick=()=>{settingsFeedback.textContent='';syncEmotionControl(current);syncActionUrgeControl(current);syncRealtimeEntry(current);settingsDialog.showModal();settingsClose.focus();};
  settingsClose.onclick=()=>settingsDialog.close();
  settingsDialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))settingsTrigger.focus();});
  settingsDialog.addEventListener('click',event=>{
    if(event.target!==settingsDialog)return;
    const r=settingsDialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)settingsDialog.close();
  });
  let initialSelection = true, resetting = false;
  let battleCoin = 'BTC', battlePeriod = '5m';
  window.Warrior.setState({battleCoin,battlePeriod}, 'battle-market:change');
  document.querySelectorAll('[data-battle-coin]').forEach(button => {
    button.onclick = () => {
      battleCoin = ['BTC','ETH','BNB'].includes(button.dataset.battleCoin) ? button.dataset.battleCoin : 'BTC';
      document.querySelectorAll('[data-battle-coin]').forEach(option => {
        const selected = option.dataset.battleCoin === battleCoin;
        option.classList.toggle('selected', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      window.Warrior.setState({battleCoin}, 'battle-coin:change');
    };
  });
  document.querySelectorAll('[data-battle-period]').forEach(button => {
    button.onclick = () => {
      battlePeriod = Object.hasOwn(periods,button.dataset.battlePeriod) ? button.dataset.battlePeriod : '5m';
      document.querySelectorAll('[data-battle-period]').forEach(option => {
        const selected = option.dataset.battlePeriod === battlePeriod;
        option.classList.toggle('selected',selected);
        option.setAttribute('aria-pressed',String(selected));
      });
      window.Warrior.setState({battlePeriod}, 'battle-period:change');
    };
  });
  const { winningReturn, freshPrice } = window.Warrior.marketValues;
  const pricePanel = node('section', '', 'live-price-panel');
  pricePanel.id = 'live-price-panel';
  $('#sim-asset').after(pricePanel);
  let priceSymbol = '', priceQuote = null, streamStatus = 'connecting';
  let priceFallbackTimer = null, priceFallbackBusy = false, lastPriceFallbackAt = 0;
  const priceValue = node('strong', '—', 'live-price-value', true), priceStatus = node('span', '');
  const priceLine = node('div', '', 'live-price-line');
  priceLine.append(priceValue, node('span', 'USDT', 'live-price-unit', true));
  const priceTime = node('time', '', 'live-price-time', true);
  priceTime.title = '行情更新时间';
  const priceMeta = node('div', '', 'live-price-meta');
  priceMeta.setAttribute('role', 'status');
  priceMeta.append(priceStatus, priceTime);
  pricePanel.setAttribute('aria-label', '最新成交价');
  pricePanel.title = 'Binance Spot · 参考价，非预测结算价';
  pricePanel.append(node('span', '现货参考价', 'live-price-caption'), priceLine, priceMeta);
  const lastPriceText = new WeakMap();
  function setPriceText(element, text) {
    // Compare source text, not translated text, to avoid repeatedly waking i18n.
    if (lastPriceText.get(element) !== text) { lastPriceText.set(element, text); element.textContent = text; }
  }
  function renderPrice() {
    const valid = !offline && ['live', 'fallback'].includes(streamStatus) && freshPrice(priceQuote, priceSymbol);
    const labels = { connecting: '正在连接实时推送', reconnecting: '推送断开，正在重连', paused: '后台已暂停行情', unavailable: '行情不可用或已过期', fallback: 'REST 兜底行情' };
    setPriceText(priceValue, valid ? number(priceQuote.price) : '—');
    setPriceText(priceStatus, offline ? '离线演示 · 不提供实时币价' : valid ? labels[streamStatus] || '实时行情' : streamStatus === 'fallback' ? labels.unavailable : labels[streamStatus] || labels.unavailable);
    setPriceText(priceTime, valid ? new Date(priceQuote.tradeTime).toLocaleTimeString([], { hour12: false }) : '');
    const state = offline ? 'offline' : valid ? 'live' : 'unavailable';
    if (pricePanel.dataset.state !== state) pricePanel.dataset.state = state;
  }
  function clearPriceFallback() { clearTimeout(priceFallbackTimer); priceFallbackTimer = null; }
  function schedulePriceFallback(delay = 2500) {
    if (offline || !api.prices || priceFallbackTimer !== null || priceFallbackBusy || document.hidden) return;
    const wait = Math.max(delay, 5000 - (Date.now() - lastPriceFallbackAt));
    priceFallbackTimer = setTimeout(async () => {
      priceFallbackTimer = null;
      if (document.hidden || streamStatus === 'live' || !priceSymbol) return;
      priceFallbackBusy = true; lastPriceFallbackAt = Date.now(); const target = priceSymbol;
      try {
        const result = await api.prices(target);
        const quote = result.prices?.find(item => item.symbol === target);
        if (streamStatus !== 'live' && target === priceSymbol && freshPrice(quote, target)) {
          priceQuote = { ...quote, transport: 'rest' }; streamStatus = 'fallback'; renderPrice();
        }
      } catch {}
      finally { priceFallbackBusy = false; if (streamStatus !== 'live') schedulePriceFallback(5000); }
    }, wait);
  }
  const priceStream = offline ? null : (api.createPriceStream || window.Warrior.createPriceStream)({
    onUpdate: quote => { if (quote.symbol === priceSymbol) { clearPriceFallback(); priceQuote = { ...quote, transport: 'websocket' }; streamStatus = 'live'; renderPrice(); } },
    onStatus: status => {
      if (status === 'live') streamStatus = status;
      else if (!(priceQuote?.transport === 'rest' && freshPrice(priceQuote, priceSymbol))) { streamStatus = status; priceQuote = null; }
      if (status !== 'live' && status !== 'paused') schedulePriceFallback();
      renderPrice();
    },
  });
  function syncPrice(data) {
    const symbol = data.config.asset || ((data.agents[0]?.policy.coin || 'BTC') + 'USDT');
    if (symbol !== priceSymbol) {
      clearPriceFallback(); priceSymbol = symbol; priceQuote = null;
      renderPrice(); if (!document.hidden) priceStream?.start(symbol);
    }
  }
  function returnPanel(order, compact = false) {
    const panel = node('div', '', compact ? 'bet-return-panel compact-return' : 'bet-return-panel');
    panel.dataset.orderId = order.id;
    const values = winningReturn(order);
    if (!values) { panel.append(node('span', '缺少份额，暂不能估算')); return panel; }
    if (compact) {
      const outcomes = node('div', '', 'return-outcomes');
      for (const [label, value, className] of [['若获胜', values.profit, 'is-positive'], ['若落败', -order.amount, 'is-negative']]) {
        const outcome = node('div'); outcome.append(node('span', label), node('strong', signed(value) + ' U', className, true)); outcomes.append(outcome);
      }
      const payout = node('div', '', 'return-payout'); payout.append(node('span', '获胜返还（含本金）'), node('strong', number(values.payout) + ' U', '', true));
      panel.append(outcomes, payout, node('small', quoteNote(order)));
      return panel;
    }
    for (const [label, value] of [['下注时赔率', number(values.odds) + '×'], ['获胜返还（含本金）', number(values.payout) + ' U'], ['获胜净赚', signed(values.profit) + ' U']]) {
      const row = node('div', '', 'bet-return-row');
      row.append(node('span', label), node('strong', value, '', true)); panel.append(row);
    }
    panel.append(node('small', quoteNote(order)));
    const risk = node('small', ''); risk.append(node('span', '若落败亏损'), node('span', ' ' + number(order.amount) + ' U', '', true)); panel.append(risk);
    return panel;
  }
  const numberedBattles = () => battles.filter(battle => !battle.placeholder);
  const sequenceLabel = number => `第${['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][number] || number}局`;
  const battleLabel = id => {
    const index = numberedBattles().findIndex(battle => battle.id === id);
    return index < 0 ? '等待开始第一局' : sequenceLabel(index + 1);
  };
  const terminal = data => data?.placeholder || ['settling', 'ended'].includes(data?.status);
  function renderBattleSwitcher() {
    const visible = numberedBattles();
    const text = visible.some(battle => ['running', 'paused', 'settling', 'reconnecting', 'retry-paused', 'awaiting-settlement'].includes(battle.status)) ? '再开一局' : '开一局';
    if (launchLabelSource !== text) { launchLabelSource = text; launchLabel.textContent = text; }
    battleSwitcher.hidden = visible.length < 2;
    for (const [id, entry] of battleButtons) {
      if (!visible.some(battle => battle.id === id)) { entry.button.remove(); battleButtons.delete(id); }
    }
    visible.forEach((battle, index) => {
      let entry = battleButtons.get(battle.id);
      if (!entry) {
        const button = node('button', '', 'battle-switch'); button.type = 'button';
        const name = node('strong', ''), state = node('span', ''), asset = node('small', '');
        button.append(name, state, asset); battleSwitcher.append(button);
        entry = {button, name, state, asset}; battleButtons.set(battle.id, entry);
        button.onclick = () => {
          if (battle.id === selected || resetting || emotionSaving || actionUrgeSaving || realtimeEntrySaving) return;
          choose(battle.id); initialSelection = false;
          current = null; $('#pause').disabled = true; $('#end').disabled = true;
          renderBattleSwitcher(); void refresh({ force: true });
        };
      }
      const name = sequenceLabel(index + 1), state = statusLabels[battle.status] || '等待节点';
      if (entry.nameSource !== name) { entry.nameSource = name; entry.name.textContent = name; }
      if (entry.stateSource !== state) { entry.stateSource = state; entry.state.textContent = state; }
      const asset = battle.config?.asset?.replace(/USDT$/, '') || battle.agents?.[0]?.policy?.coin || '—';
      entry.asset.textContent = `${asset} · ${{'5m':'5分钟','15m':'15分钟','1h':'1小时','1d':'1天'}[battle.config?.period] || '5分钟'}`;
      entry.button.setAttribute('aria-pressed', String(battle.id === selected));
      entry.button.dataset.status = battle.status;
    });
  }
  function showEmotionLevel(value) {
    const level=Math.max(0,Math.min(100,Math.round(Number(value)||0)));
    emotionValue.textContent=String(level);
    emotionControl.dataset.level=level>=70?'hot':level>=35?'warm':'calm';
  }
  function syncEmotionControl(data) {
    const saved=Math.max(0,Math.min(100,Math.round(Number(data?.config?.emotionLevel)||0)));
    if(document.activeElement!==emotionSlider&&!emotionSaving)emotionSlider.value=String(saved);
    showEmotionLevel(document.activeElement===emotionSlider?emotionSlider.value:saved);
    emotionSlider.disabled=!data||terminal(data)||emotionSaving;
    syncEmotionStepper();
  }
  emotionSlider.addEventListener('input',()=>showEmotionLevel(emotionSlider.value));
  emotionSlider.addEventListener('change',async()=>{
    if(!current||terminal(current)){syncEmotionControl(current);return;}
    const target=selected,emotionLevel=Number(emotionSlider.value);
    emotionSaving=true;revision++;emotionSlider.disabled=true;
    try{
      const data=await api.setEmotion(target,emotionLevel);
      if(selected===target){render(data);settingsFeedback.dataset.status='saved';settingsFeedback.textContent='已保存；下次分析使用新值，实时进场开启时将在冷却后复查';}
    }catch{
      settingsFeedback.dataset.status='error';
      settingsFeedback.textContent='上头值保存失败，请刷新后重试';
      syncEmotionControl(current);
    }finally{
      emotionSaving=false;
      syncEmotionControl(current);
      if (refreshQueued) void refresh();
    }
  });
  function showActionUrgeLevel(value) {
    const level=Math.max(0,Math.min(100,Math.round(Number(value)||0)));
    actionUrgeValue.textContent=String(level);
    actionUrgeControl.dataset.level=level>=70?'hot':level>=35?'warm':'calm';
  }
  function syncActionUrgeControl(data) {
    const saved=Math.max(0,Math.min(100,Math.round(Number(data?.config?.actionUrgeLevel)||0)));
    if(document.activeElement!==actionUrgeSlider&&!actionUrgeSaving)actionUrgeSlider.value=String(saved);
    showActionUrgeLevel(document.activeElement===actionUrgeSlider?actionUrgeSlider.value:saved);
    actionUrgeSlider.disabled=!data||terminal(data)||actionUrgeSaving;
    syncActionUrgeStepper();
  }
  actionUrgeSlider.addEventListener('input',()=>showActionUrgeLevel(actionUrgeSlider.value));
  actionUrgeSlider.addEventListener('change',async()=>{
    if(!current||terminal(current)){syncActionUrgeControl(current);return;}
    const target=selected,actionUrgeLevel=Number(actionUrgeSlider.value);
    actionUrgeSaving=true;revision++;actionUrgeSlider.disabled=true;
    try{
      const data=await api.setActionUrge(target,actionUrgeLevel);
      if(selected===target){render(data);settingsFeedback.dataset.status='saved';settingsFeedback.textContent='已保存；下次分析使用新值，实时进场开启时将在冷却后复查';}
    }catch{
      settingsFeedback.dataset.status='error';
      settingsFeedback.textContent='手痒值保存失败，请刷新后重试';
      syncActionUrgeControl(current);
    }finally{
      actionUrgeSaving=false;
      syncActionUrgeControl(current);
      if (refreshQueued) void refresh();
    }
  });
  function syncRealtimeEntry(data) {
    if (!realtimeEntrySaving) entryToggle.checked = data?.config?.realtimeEntry === true;
    const supported = !offline && typeof data?.config?.realtimeEntry === 'boolean';
    entryToggle.disabled = !supported || terminal(data) || realtimeEntrySaving;
    const message = offline ? '离线演示不支持实时进场。' : !supported ? '实时进场需要重启本机服务后使用。'
      : '开启：开局先分析，行情变化后再复查。关闭：仅在开局判断。';
    if (entryHint.dataset.source !== message) { entryHint.dataset.source=message;entryHint.textContent=message; }
  }
  entryToggle.addEventListener('change', async () => {
    if (!current || terminal(current) || offline) { syncRealtimeEntry(current); return; }
    const target=selected, enabled=entryToggle.checked;
    realtimeEntrySaving=true;revision++;entryToggle.disabled=true;settingsFeedback.textContent='';
    try {
      const data=await api.setRealtimeEntry(target,enabled);
      if(selected===target)render(data);
    } catch {
      settingsFeedback.dataset.status='error';settingsFeedback.textContent='实时进场设置未确认，请刷新核对后重试。';
    } finally {
      realtimeEntrySaving=false;syncRealtimeEntry(current);
      // A lost HTTP response is not proof that the setting was rejected.
      void refresh({force:true});
    }
  });
  const createEntryToggle=$('#create-realtime-entry');
  if(offline) { createEntryToggle.disabled=true;$('#create-realtime-entry-hint').textContent='离线演示不支持实时进场。'; }
  let pendingCreation = null;
  const pendingCreationKey = `warrior-pending-creation-${api.mode}`;
  let unconfirmedCreation = null;
  try { unconfirmedCreation = JSON.parse(localStorage.getItem(pendingCreationKey) || 'null'); } catch {}
  const pendingPanel = node('section', '', 'simulation-repair-panel'); pendingPanel.id = 'pending-creation-panel';
  const pendingHint = node('p', '上次开局尚未确认，请先核对，避免重复开局。');
  const pendingRetry = node('button', '核对并重试上次开局', 'secondary'); pendingRetry.type = 'button';
  pendingPanel.append(pendingHint, pendingRetry); bar.after(pendingPanel);
  function syncPendingCreation() { pendingPanel.hidden = !unconfirmedCreation; }
  syncPendingCreation();
  const storagePanel = node('section', '', 'simulation-repair-panel'); storagePanel.id = 'offline-storage-panel'; storagePanel.hidden = true;
  const storageHint = node('p', '离线存档读取失败，原始数据已保留。请重试读取、恢复备份或确认重置。');
  storageHint.setAttribute('role', 'alert');
  const storageActions = node('div', '', 'simulation-repair-actions');
  const storageRetry = node('button', '重试读取', 'secondary'), storageBackup = node('button', '恢复最近备份', 'secondary'), storageReset = node('button', '重置离线存档', 'secondary');
  for (const button of [storageRetry, storageBackup, storageReset]) button.type = 'button';
  storageActions.append(storageRetry, storageBackup, storageReset); storagePanel.append(storageHint, storageActions); bar.after(storagePanel);
  const storageDialog = node('dialog', '', 'storage-recovery-dialog'); storageDialog.id = 'storage-recovery-dialog';
  const storageConfirm = node('button', '确认重置', 'primary'), storageCancel = node('button', '取消', 'secondary');
  storageConfirm.type = storageCancel.type = 'button';
  storageDialog.append(node('h2', '重置离线存档'), node('p', '重置后从空白开始，原始损坏存档会另存保留。'), storageConfirm, storageCancel);
  document.body.append(storageDialog);
  let storageRepairing = false;
  function renderStorageIssue() {
    const issue = api.storageStatus?.(); storagePanel.hidden = !issue;
    $('#sim-create button').disabled = Boolean(issue);
    storageBackup.disabled = storageRepairing || !issue?.backupAvailable;
    storageRetry.disabled = storageReset.disabled = storageRepairing;
  }
  async function repairStorage(action) {
    if (storageRepairing) return;
    storageRepairing = true; storageConfirm.disabled = storageCancel.disabled = true; renderStorageIssue();
    try {
      const result = await api.recoverStorage(action);
      if (result.storageIssue) throw new Error('OFFLINE_STORAGE_INVALID');
      choose(result.id); render(result); storageDialog.close(); await refresh({ force: true });
    } catch { storageHint.textContent = '恢复未完成，原始存档未丢弃。请检查设备存储后重试。'; storageDialog.close(); }
    finally { storageRepairing = false; storageConfirm.disabled = storageCancel.disabled = false; renderStorageIssue(); }
  }
  storageRetry.onclick = () => repairStorage('retry');
  storageBackup.onclick = () => repairStorage('backup');
  storageReset.onclick = () => storageDialog.showModal();
  storageConfirm.onclick = () => repairStorage('reset'); storageCancel.onclick = () => storageDialog.close();
  storageDialog.addEventListener('cancel', event => { if (storageRepairing) event.preventDefault(); });
  const confirmation = node('dialog', '');
  confirmation.id = 'create-confirm-dialog';
  const confirmationContent = node('div', '', 'creation-review');
  const confirmCreate = node('button', '确认开局', 'primary full');
  confirmCreate.id = 'confirm-create'; confirmCreate.type = 'button';
  const backToConfig = node('button', '返回修改', 'secondary full');
  backToConfig.type = 'button';
  const confirmationError = node('p', '', 'muted');
  confirmationError.setAttribute('role', 'alert');
  confirmation.append(node('h2', '确认本局配置'), confirmationContent, confirmationError, confirmCreate, backToConfig);
  document.body.append(confirmation);
  backToConfig.onclick = () => confirmation.close();
  confirmation.addEventListener('cancel', event => { if (confirmCreate.disabled) event.preventDefault(); });
  confirmation.addEventListener('close', () => { pendingCreation = null; });
  function choose(id) {
    if (id !== selected) reportExpanded = false;
    selected = id;
    revision++;
    try { localStorage.setItem('warrior-selected-battle', id); } catch {}
  }
  function openCreate() {
    if (api.storageStatus?.()) { $('#offline-storage-panel')?.scrollIntoView({ block: 'center' }); return; }
    if (unconfirmedCreation) { syncPendingCreation(); pendingRetry.focus(); return; }
    dialogMode = 'create';
    $('#create-dialog').dataset.mode = 'create';
    $('#create-dialog h2').textContent = '开一局';
    $('#create-form button[type=submit]').textContent = '开打';
    $('#form-error').textContent = '';
    window.agentSetup?.close();
    openDialog('#create-dialog');
  }
  $('#sim-create').onsubmit = event => { event.preventDefault(); openCreate(); };
  const deleteButton = node('button', '删除当前战局', 'delete-battle-button'); deleteButton.type = 'button';
  battleControls.append(deleteButton);
  const deleteDialog = node('dialog', '', 'delete-battle-dialog'); deleteDialog.id = 'delete-battle-dialog';
  deleteDialog.setAttribute('aria-labelledby', 'delete-battle-title');
  const deleteTitle = node('h2', '删除当前战局？'); deleteTitle.id = 'delete-battle-title';
  const deleteName = node('strong', ''), deleteError = node('p', '', 'delete-battle-error'); deleteError.setAttribute('role', 'alert');
  const deleteConfirm = node('button', '确认删除', 'delete-battle-confirm'), deleteCancel = node('button', '取消', 'secondary');
  deleteConfirm.type = deleteCancel.type = 'button';
  const deleteActions = node('div', '', 'delete-battle-actions'); deleteActions.append(deleteCancel, deleteConfirm);
  deleteDialog.append(deleteTitle, deleteName, node('p', '仅删除此局，记录会备份。其他战局与 Agent 设置不变。'), deleteError, deleteActions);
  document.body.append(deleteDialog);
  let deleteTarget = null;
  deleteButton.onclick = () => {
    if (!current || current.placeholder || resetting) return;
    deleteTarget = current.id; deleteName.textContent = battleLabel(deleteTarget); deleteError.textContent = '';
    settingsDialog.close(); deleteDialog.showModal(); deleteCancel.focus();
  };
  deleteCancel.onclick = () => deleteDialog.close();
  deleteDialog.addEventListener('cancel', event => { if (resetting) event.preventDefault(); });
  deleteConfirm.onclick = async () => {
    if (resetting || !deleteTarget) return;
    resetting = true; revision++; deleteConfirm.disabled = deleteCancel.disabled = true;
    try {
      const result = await api.remove(deleteTarget);
      battles = result.battles;
      const next = battles.filter(battle => !battle.placeholder).at(-1) || battles[0];
      choose(next.id); initialSelection = false; reportExpanded = false;
      renderBoard(result.leaderboard || []); render(next); deleteDialog.close(); page('overview');
    } catch (error) {
      deleteError.textContent = error.code === 'BATTLE_HAS_PENDING_ORDERS' ? '还有待结算订单，请先停止本局并等待结算。'
        : error.code === 'BATTLE_HAS_EXECUTIONS' ? '此局关联真实订单，暂不能删除。'
        : '删除未确认完成，请刷新核对；新功能需重启服务后使用。';
    } finally { resetting = false; deleteConfirm.disabled = deleteCancel.disabled = false; if (refreshQueued) void refresh(); }
  };
  const resetDialog = node('dialog', '');
  resetDialog.id = 'reset-records-dialog';
  const resetConfirm = node('button', '确认清零', 'primary full');
  const resetCancel = node('button', '取消', 'secondary full');
  const resetError = node('p', '', 'muted'); resetError.setAttribute('role', 'alert');
  resetDialog.append(node('h2', '战绩清零'), node('p', '清空全部模拟战绩与订单，局数从第一局重新计数。Agent 设置、图标和钱包不变，旧记录将备份。'), resetError, resetConfirm, resetCancel);
  document.body.append(resetDialog);
  $('#sim-reset').onclick = () => { settingsDialog.close(); resetError.textContent = ''; resetDialog.showModal(); };
  resetCancel.onclick = () => resetDialog.close();
  resetDialog.addEventListener('cancel', event => { if (resetting) event.preventDefault(); });
  resetConfirm.onclick = async () => {
    if (resetting) return;
    resetting = true; revision++;
    resetConfirm.disabled = resetCancel.disabled = true;
    try {
      const fresh = await api.reset();
      choose(fresh.id); battles = [fresh]; reportExpanded = false; initialSelection = false;
      renderBoard([]); render(fresh);
      resetDialog.close(); page('overview');
    } catch { resetError.textContent = '清零未确认完成，请刷新核对后重试'; }
    finally { resetting = false; resetConfirm.disabled = resetCancel.disabled = false; if (refreshQueued) void refresh(); }
  };
  document.querySelectorAll('.new-experiment').forEach(button => { button.onclick = openCreate; });
  $('#sim-strategy-lab').remove();
  $('#create-form').onsubmit = async event => {
    event.preventDefault();
    if (unconfirmedCreation) { pendingCreation = structuredClone(unconfirmedCreation); confirmation.showModal(); return; }
    if (dialogMode === 'strategy') { $('#create-dialog').close(); return; }
    if (!$('#agent-editor').hidden) {
      $('#form-error').textContent = '请先保存或取消 Agent 设置。';
      return;
    }
    const selectedIds = new Set([...document.querySelectorAll('input[name=models]:checked')].map(input => input.value));
    let agents = (window.agentSetup?.getAgents() || []).filter(agent => selectedIds.has(agent.id)).map(agent => ({...agent, coin: battleCoin}));
    try { agents = window.Warrior.battleModels?.configure(agents) || agents; }
    catch(error) { $('#form-error').textContent=error.message;return; }
    if (!agents.length) { $('#form-error').textContent = '请至少选择一位 AI。'; return; }
    if (agents.length > 8) { $('#form-error').textContent = '每局最多选择 8 位 AI。'; return; }
    if(agents.some(a=>!window.WarriorStrategyCatalog.supportsAsset(a.strategy,a.coin))){$('#form-error').textContent='CZ大表哥和一姐只支持 BTC / BNB，请切换币种或取消选择。';return;}
    const initialBalance = Number($('#budget').value);
    if (!Number.isFinite(initialBalance) || initialBalance < 10 || initialBalance > 1000) { $('#form-error').textContent = '每位本金需为 10–1,000 U。'; return; }
    const choice = $('#rounds .selected').dataset.rounds;
    const config = { initialBalance, rounds: choice === 'until-loss' ? choice : Number(choice), period: battlePeriod, agents, realtimeEntry: !offline && createEntryToggle.checked };
    pendingCreation = structuredClone({ name: sequenceLabel(numberedBattles().length + 1), config, requestId: crypto.randomUUID() });
    const selectedPeriod = periodFor(battlePeriod);
    const firstSlot = nextPeriodSlot(Date.now(), selectedPeriod);
    confirmationContent.replaceChildren();
    for (const [label, value] of [
      ['局数', pendingCreation.name],
      ['参与 Agent', agents.map(agent => localize(window.Warrior.agentLabel(agent))).join(' / ')],
      ['市场', `${localize('按钱包连接状态选择行情')} · ${agents[0].coin} · ${localize(selectedPeriod.label)}`],
      ['每位本金', number(initialBalance) + ' U'],
      ['总预算', number(initialBalance * agents.length) + ' U'],
      ['轮次', choice === 'until-loss' ? '亏完为止' : choice],
      ['实时进场', localize(config.realtimeEntry ? '开局先分析，行情变化后再复查' : '仅在开局判断')],
      ['预计最后一轮到期', choice === 'until-loss' ? '不设固定时间' : new Date(addPeriods(firstSlot,Number(choice),selectedPeriod)).toLocaleString()],
    ]) {
      const row = node('p', '');
      row.append(node('span', label), node('strong', value, '', label !== '局数' && !['亏完为止', '不设固定时间'].includes(value)));
      confirmationContent.append(row);
    }
    confirmationContent.append(node('p', '模拟模式 · 不交易', 'muted'), node('p', '时间仅为估计；暂停、跳过节点或官方延迟结算会影响完成时间。', 'muted'));
    confirmationError.textContent = '';
    confirmation.showModal();
  };
  async function submitCreation(creation) {
    if (!creation || confirmCreate.disabled) return;
    const draft = structuredClone(creation);
    const button = confirmCreate;
    button.disabled = true;
    pendingRetry.disabled = true;
    backToConfig.disabled = true;
    revision++;
    try {
      // Persist before sending. A lost response or page reload reuses the same ID and payload.
      localStorage.setItem(pendingCreationKey, JSON.stringify(draft));
      unconfirmedCreation = draft; syncPendingCreation();
      if (offline && current?.enabled) await api.setEnabled(current.id, false);
      const battle = await api.create(draft.name, draft.config, draft.requestId);
      localStorage.removeItem(pendingCreationKey);
      unconfirmedCreation = null; syncPendingCreation();
      choose(battle.id);
      if (!battles.some(item => item.id === battle.id)) battles.push(battle);
      render(battle);
      confirmation.close();
      $('#create-dialog').close();
      page('overview');
      await refresh();
    } catch (error) {
      // A definitive validation failure did not create a battle; an uncertain transport failure keeps its ID.
      if (['INVALID_BATTLE_BUDGET','AI_CONNECTION_NOT_TESTED','AI_CONFIGURATION_CHANGED','STRATEGY_SERVICE_UPGRADE_REQUIRED','BATTLE_CREATION_RETIRED'].includes(error.code) || error.status === 400) {
        localStorage.removeItem(pendingCreationKey); unconfirmedCreation = null; syncPendingCreation();
      }
      const message = error.code === 'STRATEGY_SERVICE_UPGRADE_REQUIRED' ? error.message : '开局未确认，请核对后重试；不会重复创建同一局。';
      confirmationError.textContent = message; pendingHint.textContent = message;
    } finally { button.disabled = false; pendingRetry.disabled = false; backToConfig.disabled = false; if (refreshQueued) void refresh(); }
  }
  confirmCreate.onclick = () => submitCreation(pendingCreation);
  pendingRetry.onclick = () => submitCreation(unconfirmedCreation);
  function renderBoard(rows) {
    const root = $('#board-results');
    if (!rows.length) {
      root.replaceChildren(node('p', '暂无排行数据', 'board-empty card'));
      return;
    }
    const leader = rows[0];
    const leaderPolicy = policyForRow(leader);
    const champion = node('article', '', 'board-champion card');
    const championIdentity = node('div', '', 'board-champion-identity');
    const championCopy = node('div', '', 'board-champion-copy');
    championCopy.append(node('span', '当前第一', 'board-kicker'), node('h2', window.Warrior.agentLabel(leaderPolicy)), node('p', battleLabel(leader.battleId)));
    championIdentity.append(node('span', '01', 'board-champion-rank', true), agentAvatar(leaderPolicy, 'podium-ai-avatar board-champion-avatar'), championCopy);
    const championStats = node('div', '', 'board-champion-stats');
    const profitStat = node('div', '', 'board-champion-stat');
    profitStat.append(node('span', '模拟收益'), node('strong', `${signed(leader.profit)} U`, tone(leader.profit), true));
    const winStat = node('div', '', 'board-champion-stat');
    winStat.append(node('span', '胜率'), node('strong', leader.winRate == null ? '—' : `${number(leader.winRate * 100)}%`, '', true), node('small', `${leader.wins}/${leader.wins + leader.losses}`, '', true));
    championStats.append(profitStat, winStat);
    champion.append(championIdentity, championStats);

    const ranking = node('section', '', 'board-list card');
    const rankingTop = node('div', '', 'board-list-top');
    rankingTop.append(node('h2', '完整排名'));
    const count = node('span', '', 'board-entry-count');
    count.append(node('strong', String(rows.length), '', true), node('span', '参赛席位'));
    rankingTop.append(count);
    const labels = node('div', '', 'board-list-labels');
    ['排名', 'AI / 战局', '模拟收益', '胜率'].forEach(label => labels.append(node('span', label)));
    const list = node('ol', '', 'board-ranking');
    rows.forEach((row, index) => {
      const policy = policyForRow(row);
      const item = node('li', '', `board-rank-row${index === 0 ? ' is-leading' : ''}`);
      item.append(node('span', String(index + 1).padStart(2, '0'), 'board-rank-number', true));
      const identity = node('div', '', 'board-rank-identity');
      const identityCopy = node('div', '', 'board-rank-copy');
      identityCopy.append(node('strong', window.Warrior.agentLabel(policy)), node('small', battleLabel(row.battleId)));
      identity.append(agentAvatar(policy), identityCopy);
      item.append(identity);
      const profit = node('div', '', 'board-rank-value');
      profit.append(node('strong', `${signed(row.profit)} U`, tone(row.profit), true), node('small', `${signed(row.returnRate * 100)}%`, '', true));
      const wins = node('div', '', 'board-rank-value');
      wins.append(node('strong', row.winRate == null ? '—' : `${number(row.winRate * 100)}%`, '', true), node('small', `${row.wins}/${row.wins + row.losses}`, '', true));
      item.append(profit, wins);
      list.append(item);
    });
    ranking.append(rankingTop, labels, list);
    root.replaceChildren(champion, ranking);
  }
  function renderReport(data) {
    const root = $('.report-card');
    if (data.placeholder) { root.replaceChildren(node('p', '暂无模拟战绩')); return; }
    const expandedDetails = new Set([...root.querySelectorAll('details[open][data-audit-key]')].map(item => item.dataset.auditKey));
    const details = (label, payload, key) => {
      const element = node('details', '', 'audit-details'); element.dataset.auditKey = key;
      element.open = expandedDetails.has(key);
      element.append(node('summary', label), node('pre', JSON.stringify(payload, null, 2), '', true));
      return element;
    };
    const total = data.agents.reduce((sum, agent) => sum + agent.equity, 0);
    const totalProfit = total - data.initialTotal - (data.addedCapital||0);
    const allOrders = data.agents.flatMap(agent => agent.orders.map(order => ({ agent, order }))).sort((a, b) => b.order.start - a.order.start);
    const reportPreviewLimit = 6;
    const visibleOrders = reportExpanded ? allOrders : allOrders.slice(0, reportPreviewLimit);
    const settledCount = allOrders.filter(({ order }) => ['WON', 'LOST', 'SPLIT'].includes(order.status)).length;
    const summary = node('section', '', 'report-summary');
    const summaryCopy = node('div', '', 'report-summary-copy');
    const tag = node('span', statusLabels[data.status] || '进行中', 'subtle-chip');
    summaryCopy.append(node('h2', battleLabel(data.id)), tag, node('p', '模拟战报 · 不含真实交易', 'muted'));
    const summaryProfit = node('div', '', `report-summary-profit ${tone(totalProfit)}`);
    summaryProfit.append(node('span', '模拟收益'), node('strong', `${signed(totalProfit)} U`, '', true));
    summary.append(summaryCopy, summaryProfit);

    const metrics = node('section', '', 'report-metrics');
    [
      ['初始本金', `${number(data.initialTotal)} U`],
      ...(data.addedCapital ? [['累计补筹', `${number(data.addedCapital)} U`]] : []),
      ['当前净值', `${number(total)} U`],
      ['已结算', String(settledCount)],
      ['撞车率', data.diversity?.collisionRate==null?'—':`${number(data.diversity.collisionRate*100)}%`]
    ].forEach(([label, value]) => {
      const metric = node('div', '', 'report-metric');
      metric.append(node('span', label), node('strong', value, '', true));
      metrics.append(metric);
    });

    const agentsSection = node('section', '', 'report-agents');
    agentsSection.append(node('h3', 'AI 表现'));
    const agentList = node('div', '', 'report-agent-list');
    data.agents.forEach(agent => {
      const item = node('article', '', 'report-agent');
      const identity = node('div', '', 'report-agent-identity');
      const copy = node('div', '', 'report-agent-copy');
      copy.append(node('strong', window.Warrior.agentLabel(agent.policy)), node('small', agent.policy.coin, '', true));
      identity.append(agentAvatar(agent.policy), copy);
      const equity = node('div', '', 'report-agent-stat');
      equity.append(node('span', '净值'), node('strong', `${number(agent.equity)} U`, '', true));
      const agentProfit = agent.equity - data.config.initialBalance - (agent.addedCapital||0);
      const profit = node('div', '', 'report-agent-stat');
      profit.append(node('span', '模拟收益'), node('strong', `${signed(agentProfit)} U`, tone(agentProfit), true));
      const winRate = node('div', '', 'report-agent-stat');
      winRate.append(node('span', '胜率'), node('strong', agent.winRate == null ? '—' : `${number(agent.winRate * 100)}%`, '', true));
      item.append(identity, equity, profit, winRate);
      agentList.append(item);
    });
    agentsSection.append(agentList);

    const ordersSection = node('section', '', 'report-orders');
    const ordersTop = node('div', '', 'report-orders-top');
    const orderTitle = node('div', '', 'report-orders-title');
    orderTitle.append(node('h3', '最近订单'), node('small', '点击订单查看明细'));
    ordersTop.append(orderTitle);
    const orderCount = node('span', '', 'report-order-count');
    orderCount.append(node('strong', String(visibleOrders.length), '', true), node('span', '/'), node('span', String(allOrders.length), '', true));
    ordersTop.append(orderCount);
    const list = node('div', '', 'report-order-list');
    visibleOrders.forEach(({ agent, order }) => {
      const article = node('article', '', 'report-order');
      article.dataset.status = order.status;
      const disclosure = node('details', '', 'report-order-details');
      disclosure.dataset.auditKey = 'row-' + order.id;
      disclosure.open = expandedDetails.has(disclosure.dataset.auditKey);
      const heading = node('summary', '', 'report-order-heading');
      const body = node('div', '', 'report-order-body');
      const who = node('div', '', 'report-order-agent');
      who.append(node('strong', window.Warrior.agentLabel(agent.policy)), node('small', new Intl.DateTimeFormat(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(order.start), '', true));
      const market = node('div', '', 'report-order-market');
      market.append(node('span', order.direction === 'UP' ? '看涨' : '看跌', `report-direction${order.direction === 'UP' ? '' : ' is-down'}`), node('small', agent.policy.coin, '', true));
      const money = node('div', '', 'report-order-money');
      money.append(node('strong', number(order.amount) + ' U', '', true), node('small', '赔率 ' + number(order.quote.odds) + '×'));
      heading.append(who, market, money, node('span', orderLabels[order.status] || order.status, 'report-order-status'));
      if (order.status === 'OPEN') body.append(returnPanel(order));
      const settlement = order.settlement;
      if (settlement) {
        const settlementSummary = node('div', '', 'settlement-summary');
        for (const [label, value] of [['结算份额', number(settlement.shares)], ['模拟返还', number(settlement.payout) + ' U'], ['订单净收益', signed(settlement.netProfit) + ' U']]) {
          const row = node('p', ''); row.append(node('span', label), node('strong', value, '', true)); settlementSummary.append(row);
        }
        body.append(settlementSummary);
      }
      const accounting = { orderId: order.id, marketTopicId: order.topicId ?? null, tokenId: order.tokenId ?? null,
        mode: 'paper', stake: order.amount, shares: order.quote.shares ?? null, payout: order.payout ?? null,
        status: order.status, settlement: settlement || null };
      body.append(details(settlement ? '结算凭据与余额变化' : '订单明细（尚无结算凭据）', accounting, 'order-' + order.id));
      if (!offline && order.intent && order.marketSource !== 'public-spot') {
        const bridge = node('button', '核对真实执行意图', 'secondary'); bridge.type = 'button';
        bridge.dataset.intentId = order.intent.id;
        bridge.disabled = !data.enabled || Boolean(data.recovery) || order.status !== 'OPEN' || Date.now() >= order.intent.expiresAt;
        bridge.onclick = () => window.Warrior.executionPanel?.intent(data.id, order.intent.id);
        body.append(bridge);
      }
      disclosure.append(heading, body);
      article.append(disclosure);
      list.append(article);
    });
    if (!list.children.length) list.append(node('p', '暂无模拟订单', 'report-empty'));
    ordersSection.append(ordersTop, list);
    if (allOrders.length > reportPreviewLimit) {
      const toggle = node('button', reportExpanded ? '收起订单' : '查看全部订单', 'report-history-toggle secondary');
      toggle.type = 'button';
      toggle.append(node('span', `(${allOrders.length})`, '', true));
      toggle.onclick = () => { reportExpanded = !reportExpanded; renderReport(data); };
      ordersSection.append(toggle);
    }
    const reconciliation = node('details', '', 'audit-section report-audit');
    reconciliation.dataset.auditKey = 'reconciliation';
    reconciliation.open = expandedDetails.has('reconciliation');
    const reconciliationTitle = node('summary', '模拟账本对账');
    if (data.agents.some(agent => agent.reconciliation?.matched === false)) reconciliationTitle.append(node('span', '账本存在差异', 'is-negative'));
    reconciliation.append(reconciliationTitle, node('p', '初始本金 − 下注扣款 + 结算返还 = 可用余额；这不是钱包到账凭据。', 'muted'));
    for (const agent of data.agents) {
      if (!agent.reconciliation) { reconciliation.append(node('p', '旧记录或离线演示没有完整对账凭据。', 'muted')); break; }
      const row = node('div', '');
      row.append(node('strong', window.Warrior.agentLabel(agent.policy)), node('span', agent.reconciliation.matched ? '账本相符' : '账本存在差异'));
      row.append(details('查看对账算式', agent.reconciliation, 'account-' + agent.id));
      reconciliation.append(row);
    }
    const history = node('details', '', 'audit-section report-audit');
    history.dataset.auditKey = 'history';
    history.open = expandedDetails.has('history');
    history.append(node('summary', '逐轮决策记录'));
    if (!offline) {
      const records = node('button', '查看真实执行记录', 'secondary'); records.type = 'button'; records.id = 'view-executions';
      records.onclick = () => window.Warrior.executionPanel?.records(data.id);
      history.append(records);
    }
    const grouped = new Map();
    for (const event of data.auditTrail || []) {
      if (!grouped.has(event.roundId)) grouped.set(event.roundId, []);
      grouped.get(event.roundId).push(event);
    }
    if (!grouped.size) history.append(node('p', '尚无完整逐轮记录；旧数据不会补造。', 'muted'));
    [...grouped].reverse().forEach(([roundId, events], index) => {
      const group = node('details', '', 'audit-details'); group.dataset.auditKey = 'round-' + roundId;
      group.open = expandedDetails.has(group.dataset.auditKey);
      const title = node('summary', '');
      title.append(node('span', '轮次'), node('strong', ' ' + (grouped.size - index) + ' · ' + new Date(Number(roundId)).toLocaleString(), '', true));
      group.append(title);
      const eventLabels = { ROUND_STARTED: '轮次开始', MARKET_PREP_FAILED: '市场准备失败', MARKET_SNAPSHOT: '指标与原始盘口', DECISION_INPUT: '送入 AI 的完整输入', MODEL_REQUEST: '实际发送的模型请求', MODEL_RESPONSE: 'AI 原始响应', DECISION: '风控结果', ORDER_INTENT: '下注意图', PAPER_ORDER: '模拟扣款', SETTLEMENT_EVIDENCE: '官方结算原始凭据', SETTLEMENT: '结算凭据与余额变化', INPUT_FAILED: '输入不可用', ROUND_SKIPPED: '本轮跳过' };
      for (const event of events) group.append(details(eventLabels[event.type] || event.type, event, 'event-' + event.id));
      history.append(group);
    });
    root.replaceChildren(summary, metrics, agentsSection, ordersSection, reconciliation, history);
  }
  let priceSnapshots = new Map();
  let valuation = null, valuationBusy = false, lastValuationAt = 0;
  let clockOffset = 0, clockServerTime = null;
  function renderEquity() {
    if (!current) return;
    if (current.placeholder) {if($('#book-equity'))$('#book-equity').hidden=true;document.querySelectorAll('.profit-leader-badges > span').forEach(badge=>badge.hidden=true);return;}
    const estimate = window.Warrior.marketValues.equityEstimate(current,valuation,Date.now()+clockOffset);
    const profitLeader=estimate.agents.every(row=>Number.isFinite(row.cumulativePnl))
      ? estimate.agents.reduce((leader,row)=>row.cumulativePnl>0&&(!leader||row.cumulativePnl>leader.cumulativePnl)?row:leader,null) : null;
    const multiples=estimate.agents.map(row=>{
      const principal=current.config?.initialBalance+(current.agents.find(agent=>agent.id===row.id)?.addedCapital||0);
      return {id:row.id,multiple:Number.isFinite(row.estimatedEquity)&&Number.isFinite(principal)&&principal>0?row.estimatedEquity/principal:null};
    });
    const multipleLeader=multiples.every(row=>Number.isFinite(row.multiple))
      ? multiples.reduce((leader,row)=>row.multiple>1&&(!leader||row.multiple>leader.multiple)?row:leader,null) : null;
    const label=$('.balance-row .label');
    const fallback = estimate.estimatedEquity === null;
    if(label)label.replaceChildren(node('span',fallback ? '账面净值' : '预估净值'),node('span','USDT','unit',true));
    $('#total').textContent=number(fallback ? estimate.bookEquity : estimate.estimatedEquity);
    $('#total').dataset.basis = fallback ? 'book' : 'estimated';
    $('#gain').replaceChildren(node('span',estimate.cumulativePnl===null ? '估值暂不可用' : '累计盈亏'),
      ...(estimate.cumulativePnl===null ? [] : [node('b',' '+signed(estimate.cumulativePnl)+' U','',true)]));
    $('#gain').dataset.tone=estimate.cumulativePnl===null ? 'flat' : tone(estimate.cumulativePnl);
    let book=$('#book-equity');
    if(!book){book=node('div','','valuation-book');book.id='book-equity';$('#gain').after(book);}
    book.hidden=false;
    book.replaceChildren(node('span',fallback ? '含待结算本金' : '账面净值'),node('strong',number(fallback ? current.agents.reduce((sum,a)=>sum+(a.reserved||0),0) : estimate.bookEquity)+' U','',true));
    for(const row of estimate.agents){
      const card=[...$('.model-grid').children].find(item=>item.dataset.simAgent===row.id);
      if(!card)continue;
      const tierAgent=current.agents.find(agent=>agent.id===row.id);
      const principal=current.config?.initialBalance+(tierAgent?.addedCapital||0);
      const tier=window.Warrior.marketValues.equityTier(row.estimatedEquity,principal);
      card.dataset.equityTier=tier;
      const performance=window.Warrior.marketValues.equityPerformance(row.estimatedEquity,principal);
      card.dataset.performance=performance.state;
      const crown=card.querySelector('.profit-leader-crown'),coins=card.querySelector('.profit-leader-coins');
      crown.hidden=multipleLeader?.id!==row.id;coins.hidden=profitLeader?.id!==row.id;
      crown.title=localize('盈利倍数最高');coins.title=localize('盈利金额最多');
      crown.setAttribute('aria-label',crown.title);coins.setAttribute('aria-label',coins.title);
      const bookFallback = row.estimatedEquity === null;
      card.querySelector('.agent-balance > span').textContent=bookFallback ? '账面净值' : '预估净值';
      card.querySelector('.agent-balance > strong').replaceChildren(document.createTextNode(number(bookFallback ? row.bookEquity : row.estimatedEquity)),node('small',' U'));
      let detail=card.querySelector('.valuation-book');
      if(!detail){detail=node('div','','valuation-book');card.querySelector('.agent-stats').prepend(detail);}
      detail.replaceChildren(node('span',bookFallback ? '含待结算本金' : '账面净值'),node('strong',number(bookFallback ? tierAgent.reserved : row.bookEquity),'',true));
      const floating=card.querySelector('.agent-floating');
      floating.dataset.tone=row.cumulativePnl===null ? 'unavailable' : tone(row.cumulativePnl);
      floating.replaceChildren(node('span','当前收益'),node('b',performance.text,'',true));
      if(row.cumulativePnl!==null)floating.append(node('small',signed(row.cumulativePnl)+' U','',true));
      floating.title=localize('倍数 = 当前净值 ÷ 累计投入；亏损按累计投入计算。');
      if(row.cumulativePnl===null)floating.append(node('small','估值暂不可用'));
    }
  }
  async function refreshValuation() {
    if (!api.valuation || !current || current.placeholder || current.recovery || valuationBusy || document.hidden || Date.now()-lastValuationAt<5000) return;
    if (!current.agents.some(agent=>agent.orders.some(order=>order.status==='OPEN'))) {valuation=null;return;}
    const target=current.id, epoch=revision;
    valuationBusy=true;lastValuationAt=Date.now();
    try{
      const result=await api.valuation(target);
      if(current?.id===target && revision===epoch){
        valuation=result;
        if(result.recovery) { current.recovery=result.recovery; renderRecovery(); void refresh({force:true}); }
      }
    }catch{if(current?.id===target && revision===epoch)valuation=null;}
    finally{valuationBusy=false;renderEquity();}
  }
  function renderCards(data) {
    priceSnapshots = new Map((data.auditTrail || []).filter(event => event.type === 'MARKET_SNAPSHOT').map(event => [event.id, event]));
    const referenceText = order => {
      const price = window.Warrior.marketValues.betReferencePrice(order, priceSnapshots);
      return price == null ? null : new Intl.NumberFormat(document.documentElement.lang, {minimumFractionDigits:2, maximumFractionDigits:2}).format(price) + ' USDT';
    };
    const grid = $('.model-grid');
    // Recompute on every battle switch so a smaller roster restores the wide cards.
    grid.dataset.columns = data.agents.length >= 7 ? '4' : '3';
    const ids = new Set(data.agents.map(agent => agent.id));
    [...grid.children].forEach(card => { if (!ids.has(card.dataset.simAgent)) card.remove(); });
    data.agents.forEach((agent, index) => {
      let card = [...grid.children].find(item => item.dataset.simAgent === agent.id);
      if (!card) {
        card = node('article', '', 'model-card card agent-summary');
        card.dataset.simAgent = agent.id;
        card.innerHTML = '<div class="model-top"><span class="model-ai-avatar"></span><div><strong data-no-translate></strong><span class="model-strategy"></span></div><span class="rank"></span></div><div class="agent-equity-head"><div class="agent-balance"><span>预估净值</span><strong data-no-translate></strong></div><div class="agent-floating"></div></div><div class="agent-stats"><div class="agent-funds"></div></div><div class="agent-round"><div class="agent-round-top"><span>本轮下注</span><span class="agent-state"></span></div><div class="agent-bet"></div></div><div class="agent-footer"><span class="agent-win"></span><span class="agent-detail-link">查看详情 ↗</span></div>';
        const badges=node('div','','profit-leader-badges');
        const crown=node('span','','profit-leader-crown');crown.hidden=true;crown.setAttribute('role','img');
        crown.innerHTML='<svg viewBox="0 0 40 32" fill="none"><path d="m5 10 9 6 6-12 6 12 9-6-4 17H9Z" fill="#f5cc64" stroke="#9c7539" stroke-width="1.8" stroke-linejoin="round"/><path d="M11 23h18" stroke="#fff1b4" stroke-width="2" stroke-linecap="round"/><path d="m20 13 3 4-3 4-3-4Z" fill="#ad87cc"/><circle cx="5" cy="9" r="2.2" fill="#f5cc64"/><circle cx="20" cy="4" r="2.2" fill="#f5cc64"/><circle cx="35" cy="9" r="2.2" fill="#f5cc64"/></svg>';
        const coins=node('span','','profit-leader-coins');coins.hidden=true;coins.setAttribute('role','img');
        coins.innerHTML='<svg viewBox="0 0 40 32" fill="none" aria-hidden="true"><path d="M5 19v7c0 3 17 3 17 0v-7" fill="#e5b95e" stroke="#a67b37" stroke-width="1.6"/><ellipse cx="13.5" cy="19" rx="8.5" ry="3.5" fill="#ffe7a1" stroke="#a67b37" stroke-width="1.6"/><path d="M19 7v18c0 3 16 3 16 0V7" fill="#eac36b" stroke="#a67b37" stroke-width="1.6"/><path d="M19 13c2 3 14 3 16 0m-16 6c2 3 14 3 16 0" stroke="#b78c42" stroke-width="1.4"/><ellipse cx="27" cy="7" rx="8" ry="3.5" fill="#ffedb4" stroke="#a67b37" stroke-width="1.6"/><path d="M27 5.5v3M25 7h4" stroke="#ba9147" stroke-width="1.3" stroke-linecap="round"/></svg>';
        badges.append(crown,coins);card.prepend(badges);
        card.onclick = event => {
          if(event.target.closest('.agent-top-up, .agent-live-intent'))return;
          window.openModelDetail(agent.id);
          const latestAgent = current?.agents.find(item => item.id === agent.id);
          if (!latestAgent) return;
          const orders = latestAgent.orders.filter(order => order.status === 'OPEN');
          if (!orders.length) return;
          const section = node('section', '', 'agent-order-details');
          for (const order of orders) {
            const orderCard = node('article', '', 'detail-order-card');
            const meta = node('div', '', 'detail-order-meta');
            meta.append(node('span', '待结算', 'subtle-chip'), node('span', new Intl.DateTimeFormat(document.documentElement.lang, {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(order.start), '', true));
            const heading = node('div', '', 'detail-order-heading');
            const direction = node('div'); direction.append(node('strong', order.direction === 'UP' ? '看涨' : '看跌', order.direction === 'UP' ? 'is-positive' : 'is-negative'), node('span', latestAgent.policy.coin, '', true));
            heading.append(direction, node('strong', number(order.amount) + ' U', '', true));
            const quote = node('div', '', 'detail-order-odds'); quote.append(node('span', '下注时赔率'), node('strong', number(order.quote.odds) + '×', '', true));
            const reference = node('div', '', 'detail-order-odds bet-reference');
            const savedPrice = referenceText(order);
            reference.append(node('span', '下注参考价'), node('strong', savedPrice || '未记录', '', Boolean(savedPrice)));
            orderCard.append(meta, heading, reference, node('small', '决策时现货快照，非合约成交价或结算基准价', 'bet-reference-note'), quote, returnPanel(order, true)); section.append(orderCard);
          }
          $('#detail-content .detail-model')?.after(section);
        };
        const detailLink=card.querySelector('.agent-detail-link');
        const detailButton=node('button','','agent-detail-link');detailButton.append(node('span','查看详情'));detailButton.type='button';detailLink.replaceWith(detailButton);
        const topUp=node('button','','agent-top-up');topUp.type='button';
        topUp.innerHTML='<span class="agent-top-up-mark" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M10 4v12M4 10h12"/></svg></span>';
        topUp.setAttribute('aria-label','补筹码');topUp.title='补筹码';
        const actions=node('div','','agent-card-actions');
        detailButton.replaceWith(actions);actions.append(detailButton,topUp);
        topUp.onclick=()=>openTopUp(agent.id);
        grid.append(card);
      }
      const policy = agent.policy;
      const topUp=card.querySelector('.agent-top-up');
      topUp.hidden=document.body.dataset.bettingMode==='live';
      topUp.disabled=terminal(data)||Boolean(data.placeholder);
      let capital=card.querySelector('.agent-added-capital');
      if(!capital){capital=node('div','','agent-added-capital');card.querySelector('.agent-round').after(capital);}
      capital.hidden=!agent.addedCapital;
      capital.replaceChildren(node('span','累计补筹'),node('b',number(agent.addedCapital)+' U','',true));
      card.querySelector('.model-top strong').textContent = window.Warrior.agentLabel(policy);
      delete card.querySelector('.model-top strong').dataset.noTranslate;
      card.querySelector('.model-strategy').textContent = '';
      card.querySelector('.rank').textContent = String(index + 1).padStart(2, '0');
      window.Warrior.skins?.applyElement(card.querySelector('.model-ai-avatar'), policy);
      card.querySelector('.agent-balance strong').textContent = number(agent.equity) + ' U';
      const funds = card.querySelector('.agent-funds'); funds.replaceChildren();
      for (const [label, value] of [['可用', agent.cash], ['冻结', agent.reserved]]) {
        const field = node('div', ''); field.append(node('span', label), node('b', number(value), '', true)); funds.append(field);
      }
      const observedAt=Number.isFinite(data.serverTime)?data.serverTime:Date.now();
      const pending=window.Warrior.marketValues.pendingBets(agent.orders,observedAt);
      const openOrders=pending.current;
      const order = openOrders.at(-1), bet = card.querySelector('.agent-bet');
      let liveButton = card.querySelector('.agent-live-intent');
      if (!liveButton) {
        liveButton = node('button', '核对并确认真实下注', 'secondary agent-live-intent');
        liveButton.type = 'button'; card.append(liveButton);
      }
      const eligibleIntent = order?.intent && !order.intent.simulationOnly && order.marketSource !== 'public-spot' ? order.intent : null;
      liveButton.hidden = !eligibleIntent;
      liveButton.disabled = !eligibleIntent || !data.enabled || Boolean(data.recovery) || observedAt >= eligibleIntent.expiresAt ||
        window.Warrior.liveParticipation?.isIncluded(data.id, agent.id) !== true;
      liveButton.dataset.expiresAt = String(eligibleIntent?.expiresAt || 0);
      liveButton.onclick = () => {
        if (window.Warrior.state.bettingMode !== 'live' || !eligibleIntent) return;
        window.Warrior.executionPanel?.intent(data.id, eligibleIntent.id);
      };
      const activeRound=[data.activeMarket,data.market].find(item=>item?.start<=observedAt&&item?.end>observedAt);
      const currentSlot=activeRound?.start??(data.nextSlot-(data.config.roundMs||300000));
      const currentEnd=activeRound?.end??data.nextSlot;
      const currentDecision=currentSlot<=observedAt&&currentEnd>observedAt&&Number(agent.lastDecision?.roundId)===currentSlot;
      card.dataset.betState = order ? 'open' : 'idle';
      bet.replaceChildren();
      if (openOrders.length > 1) bet.append(node('span', '待结算下注'), node('strong', number(pending.currentAmount) + ' U', '', true));
      else if (order) bet.append(node('span', order.direction === 'UP' ? '看涨' : '看跌', 'agent-direction ' + (order.direction === 'UP' ? 'is-up' : 'is-down')), node('strong', number(order.amount) + ' U', '', true));
      else { const label=node('span',waitingLabel(agent,currentDecision,data),'agent-waiting');label.title=localize(waitingLabels[agent.waitReason]||agent.lastDecision?.reason||agent.reason||'');bet.append(label); }
      let reference = card.querySelector('.agent-entry-price');
      if (!reference) { reference = node('div', '', 'agent-entry-price'); bet.after(reference); }
      reference.replaceChildren(); reference.hidden = !order;
      if (order) {
        const savedPrice = referenceText(order);
        reference.append(node('span', openOrders.length > 1 ? '最新下注参考价' : '下注参考价'), node('strong', savedPrice || '未记录', '', Boolean(savedPrice)));
      }
      let previous=card.querySelector('.agent-previous-pending');
      if(!previous){previous=node('div','','agent-previous-pending');reference.after(previous);}
      previous.hidden=pending.previous.length===0;
      previous.replaceChildren(node('span','往期待结算'),node('strong',number(pending.previousAmount)+' U','',true));
      previous.title='已到期，等待市场结算结果';
      card.querySelector('.agent-state').textContent = order ? '待结算' : data.recovery ? statusLabels[data.status] : terminal(data) ? statusLabels[data.status] : !data.enabled ? '已暂停' : agent.lastStatus === 'WATCHING' ? '等待信号' : agent.lastStatus === 'SKIPPED' && currentDecision ? '本轮跳过' : '等待节点';
      card.querySelector('.agent-win').replaceChildren(node('span', '胜率'), node('b', ' ' + (agent.winRate == null ? '—' : number(agent.winRate * 100) + '%'), '', true), node('small', ' ' + agent.wins + '/' + (agent.wins + agent.losses), '', true));
      window.WarriorDefeat.updateCard(card, data, agent);
    });
  }
  function clocks() {
    renderPrice();
    if (!current) return;
    document.querySelectorAll('.agent-live-intent').forEach(button => {
      if (Date.now() + clockOffset >= Number(button.dataset.expiresAt)) button.disabled = true;
    });
    renderEquity();
    renderRecovery();
    if (current.recovery) { $('#sim-next').textContent = '—'; $('#settle-countdown').textContent = statusLabels[current.status] || '连接恢复中'; return; }
    if (!current.enabled) { $('#sim-next').textContent = '—'; $('#settle-countdown').textContent = statusLabels[current.status]; return; }
    const seconds = Math.max(0, Math.ceil((current.nextSlot - (Date.now()+clockOffset)) / 1000));
    const hours = Math.floor(seconds/3600), minutes = Math.floor(seconds%3600/60), remainder = seconds%60;
    const text = hours ? `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}` : `${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}`;
    $('#sim-next').textContent = text; $('#settle-countdown').textContent = text;
  }
  function render(data, options = {}) {
    renderStorageIssue();
    const full = options.full ?? (offline || (data.view !== 'live' && data.view !== 'summary'));
    if (full) reportSnapshot = data;
    else if (reportSnapshot?.id === data.id && reportSnapshot.stateVersion !== data.stateVersion) reportSnapshot = null;
    deleteButton.hidden = Boolean(data.placeholder);
    current = data;
    renderSource(data);
    const battleIndex = battles.findIndex(battle => battle.id === data.id);
    if (battleIndex >= 0) battles[battleIndex] = data;
    renderBattleSwitcher();
    if(Number.isFinite(data.serverTime) && data.serverTime!==clockServerTime){clockServerTime=data.serverTime;clockOffset=data.serverTime-Date.now();}
    syncPrice(data);
    delete $('#experiment-name').dataset.noTranslate; $('#experiment-name').textContent = battleLabel(data.id);
    $('#run-status').textContent = statusLabels[data.status];
    $('#pause').dataset.running = String(data.enabled);
    $('#pause').setAttribute('aria-label', data.enabled ? '暂停下注' : '继续下注');
    $('#pause').title = data.enabled ? '暂停下注' : '继续下注';
    $('#pause .battle-action-label').textContent=data.enabled ? '暂停' : '继续';
    $('#pause').disabled = terminal(data);
    $('#end').disabled = terminal(data);
    syncEmotionControl(data);
    syncActionUrgeControl(data);
    syncRealtimeEntry(data);
    const total = data.agents.reduce((sum, agent) => sum + agent.equity, 0);
    $('#total').textContent = number(data.placeholder ? 0 : total);
    $('#gain').textContent = number(total - data.initialTotal - (data.addedCapital||0)) + ' U';
    $('#round-text').textContent = data.config.rounds ? data.roundCount + ' / ' + data.config.rounds : String(data.roundCount);
    $('#round-progress').style.width = data.config.rounds ? Math.min(100, data.roundCount / data.config.rounds * 100) + '%' : '0%';
    $('#section-heading-count').textContent = data.agents.length + ' 位 AI';
    $('#collision-rate').textContent = data.diversity?.collisionRate==null?'—':number(data.diversity.collisionRate*100)+'%';
    $('.collision-meter').dataset.level=data.diversity?.collisionRate==null?'empty':data.diversity.collisionRate>=.7?'high':data.diversity.collisionRate>=.4?'mid':'low';
    $('#active-assets').textContent = [...new Set(data.agents.map(agent => agent.policy.coin))].join(' / ');
    $('#sim-asset').textContent = [$('#active-assets').textContent, localize(periodFor(data.config?.period).label)].filter(Boolean).join(' · ');
    $('#sim-market').textContent = data.endReason === 'CLIENT_DISCONNECTED' ? '页面已离开，请点击继续。' : terminal(data) ? statusLabels[data.status] : '等待节点';
    // Technical errors stay in the backend snapshot/audit trail, not the command bar.
    // Keep actionable lifecycle and user-operation feedback separate from diagnostics.
    $('#sim-error').textContent = data.aiConnectionFailure ? aiOutageMessage : data.endReason === 'SERVER_RESTARTED' ? '服务器已重启，请手动继续本局' : data.endReason === 'SIMULATION_ERROR' ? '模拟运行异常，已暂停，请检查后继续' : '';
    notifyAiOutage(data.aiConnectionFailure);
    const engine = data.decisionEngine || {};
    $('#sim-ai-mode').textContent = engine.mode === 'offline' ? '规则 AI · 数据仅保存在本机' : engine.mode === 'mock' ? '本地模拟 AI · 未调用 DeepSeek' : engine.mode === 'off' ? 'AI 决策已关闭' : engine.mode === 'deepseek' ? 'DeepSeek 已启用 · 仅模拟下注' : '旧版规则模拟 · 未调用 AI';
    window.Warrior.setState({ simulation: data }, 'simulation:update');
    if (data.placeholder) $('.model-grid').replaceChildren(); else renderCards(data);
    if (window.Warrior.state.page === 'reports' && reportSnapshot?.id === data.id &&
        (!data.stateVersion || reportSnapshot.stateVersion === data.stateVersion)) renderReport(reportSnapshot);
    clocks();
    void refreshValuation();
    window.Warrior.roundRecap?.update(data, battleLabel(data.id));
  }
  async function ensureReport(data, epoch, signal) {
    if (window.Warrior.state.page !== 'reports' || !api.report) return;
    if (reportSnapshot?.id === data.id && (!data.stateVersion || reportSnapshot.stateVersion === data.stateVersion)) {
      renderReport(reportSnapshot); return;
    }
    const full = await api.report(data.id, { signal });
    if (selected === data.id && revision === epoch && window.Warrior.state.page === 'reports') {
      reportSnapshot = full; renderReport(full);
    }
  }
  let lastListVersion = null;
  async function refresh({ force = false } = {}) {
    if (document.hidden) return;
    if (resetting || emotionSaving || actionUrgeSaving || realtimeEntrySaving) { refreshQueued = true; return; }
    if (busy) {
      refreshQueued = true;
      if (force) refreshController?.abort();
      return;
    }
    refreshQueued = false;
    busy = true;
    const epoch = revision, target = selected;
    const controller = new AbortController(); refreshController = controller;
    try {
      const [listResult, snapshotResult] = await Promise.allSettled([
        api.list({ signal: controller.signal }), api.snapshot(target, { signal: controller.signal }),
      ]);
      if (epoch !== revision) return;
      if (listResult.status === 'fulfilled') {
        const list = listResult.value;
        battles = list.battles;
        for (const battle of battles) notifyAiOutage(battle.aiConnectionFailure);
        if (!battles.length) { renderBattleSwitcher(); return; }
        if (!battles.some(battle => battle.id === selected)) {
          choose(battles.at(-1).id); refreshQueued = true; return;
        }
        initialSelection = false;
        const listVersion = battles.map(battle => `${battle.id}:${battle.stateVersion || battle.serverTime}`).join('|');
        if (listVersion !== lastListVersion) {
          lastListVersion = listVersion; renderBattleSwitcher(); renderBoard(list.leaderboard || []);
        }
      }
      if (snapshotResult.status !== 'fulfilled') throw snapshotResult.reason;
      const data = snapshotResult.value;
      if (target !== selected || epoch !== revision) return;
      const changed = !current || current.id !== data.id || !data.stateVersion || current.stateVersion !== data.stateVersion;
      if (changed) render(data);
      else if (Number.isFinite(data.serverTime)) { clockServerTime = data.serverTime; clockOffset = data.serverTime - Date.now(); }
      await ensureReport(data, epoch, controller.signal);
    } catch (error) {
      if (error?.name !== 'AbortError') $('#sim-error').textContent = '服务连接中断，当前显示为上次数据';
    } finally {
      if (refreshController === controller) refreshController = null;
      busy = false;
      if (refreshQueued && !document.hidden) {
        refreshQueued = false; queueMicrotask(() => void refresh());
      }
    }
  }
  async function control(action) {
    if (!current || terminal(current)) return;
    revision++;
    const target = selected;
    $('#pause').disabled = true; $('#end').disabled = true; $('#confirm-end').disabled = true;
    try {
      const data = await action(target);
      if (selected === target) render(data);
    } catch { settingsFeedback.dataset.status='error';(settingsDialog.open ? settingsFeedback : $('#sim-error')).textContent = '操作失败，请刷新核对后重试'; }
    finally {
      $('#pause').disabled = terminal(current); $('#end').disabled = terminal(current); $('#confirm-end').disabled = false;
      if (refreshQueued) void refresh();
    }
  }
  $('#pause').onclick = () => control(id => api.setEnabled(id, !current.enabled));
  $('#end').onclick = () => {settingsDialog.close();openDialog('#end-dialog');};
  $('#confirm-end').onclick = () => control(async id => {
    const data = await api.end(id, 'MANUAL');
    $('#end-dialog').close();
    page('reports');
    return data;
  });
  $('#leaderboard .board-controls').hidden = true;
  $('#leaderboard .footnote').textContent = '实际模拟战绩 · 按收益排名 · 未结算订单不计胜率';
  $('.report-card').replaceChildren();
  $('.model-grid').replaceChildren();
  $('#total').textContent = '—'; $('#gain').textContent = '—';
  $('#pause').disabled = true; $('#end').disabled = true;
  emotionSlider.disabled = true; showEmotionLevel(0);
  actionUrgeSlider.disabled = true; showActionUrgeLevel(0);
  window.Warrior.on('page:change', () => void refresh({ force: true }));
  window.addEventListener('warrior-language-change', () => { if (current) render(current); if (reportSnapshot && window.Warrior.state.page === 'reports') renderReport(reportSnapshot); });
  const release = () => { if (!offline || api.keepInBackground) return; for (const battle of battles) if (battle.enabled) api.release(battle.id); if (current?.enabled) api.release(current.id); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { release(); clearPriceFallback(); if (!api.serviceOwned) priceStream?.stop(); refreshController?.abort(); }
    else { void refresh({ force: true }); priceStream?.start(priceSymbol); }
  });
  window.addEventListener('pagehide', () => { release(); if (!api.serviceOwned) priceStream?.stop(); });
  window.addEventListener('pageshow', () => { if (!document.hidden) { void refresh({ force: true }); priceStream?.start(priceSymbol); } });
  window.addEventListener('online', () => { void refresh({ force: true }); priceStream?.start(priceSymbol); schedulePriceFallback(1000); });
  api.subscribe?.(event => {
    notifyAiOutage(event?.aiConnectionFailure);
    if (event?.battleId === '*' || event?.battleId === selected || battles.some(battle => battle.id === event?.battleId)) void refresh();
  });
  // Widget navigation reads the requested battle first, then uses the same
  // renderer/detail click as the app. It never resumes or creates a battle.
  window.Warrior.openStrategy = async (battleId, agentId) => {
    const data = await api.snapshot(battleId);
    if (data.placeholder || !data.agents.some(agent => agent.id === agentId)) throw new Error('STRATEGY_NOT_FOUND');
    choose(battleId); initialSelection = false;
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    page('overview'); render(data);
    const card = [...document.querySelectorAll('[data-sim-agent]')].find(el => el.dataset.simAgent === agentId);
    if (!card) throw new Error('STRATEGY_NOT_FOUND');
    card.click();
  };
  void refresh();
  setInterval(() => void refresh(), offline ? 5000 : 15000);
  setInterval(() => void refreshValuation(), 5000);
  setInterval(clocks, 1000);
})();
