const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
let paused=false;let rounds=20;let market='Binance Prediction';let focusReturn=null;let freshGame=false;let gameNumber=1;
const presets=document.createElement('div');presets.className='budget-presets';presets.innerHTML='<button type="button" data-budget="10" class="selected" aria-pressed="true">10U 战神</button><button type="button" data-budget="100" aria-pressed="false">100U 战神</button>';$('.budget-control').after(presets);$$('[data-budget]').forEach(b=>b.onclick=()=>{$('#budget').value=b.dataset.budget;updateBudget()});
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800)}
function page(name){$$('.page').forEach(e=>e.hidden=e.id!==name);$$('.nav').forEach(e=>{e.classList.toggle('active',e.dataset.page===name);e.setAttribute('aria-current',e.dataset.page===name?'page':'false')});window.Warrior?.setState({page:name},'page:change');window.scrollTo({top:0,behavior:'smooth'})}
function openDialog(id){focusReturn=document.activeElement;$(id).showModal()}
$$('.nav').forEach(b=>b.onclick=()=>page(b.dataset.page));$$('.new-experiment').forEach(b=>b.onclick=()=>openDialog('#create-dialog'));
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());$$('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});d.addEventListener('close',()=>focusReturn?.focus())});
$('#pause').onclick=()=>{paused=!paused;$('#pause').dataset.running=String(!paused);$('#pause').setAttribute('aria-label',paused?'继续下注':'暂停下注');$('#pause').title=paused?'继续下注':'暂停下注';$('#run-status').textContent=paused?'已暂停':'进行中';$('.live-dot').style.background=paused?'#aaa':'#408d6f';window.orbArena?.setPaused(paused);toast(paused?'演示已暂停':'演示已继续')};
$('#end').onclick=()=>openDialog('#end-dialog');$('#confirm-end').onclick=()=>{$('#end-dialog').close();$('#run-status').textContent='已结束';$('#pause').disabled=true;window.orbArena?.setPaused(true);page('reports');toast('已打开示例战报')};
$('#profile').onclick=()=>{renderWallet();openDialog('#wallet-dialog')};$('.brand').onclick=e=>{e.preventDefault();page('overview')};
$$('.legend-item').forEach(b=>b.onclick=()=>{$$('.legend-item').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});$$('.series').forEach(p=>p.style.opacity=b.dataset.series==='all'||p.classList.contains(b.dataset.series)?'1':'.12')});
function updateBudget(){const count=window.Warrior?.battleModels?.seatCount?.() ?? $$('input[name=models]:checked').length;const budget=Number($('#budget').value);$('#budget-total').textContent=`${Number.isFinite(budget)?budget*count:0} USDT`;$('#form-error').textContent='';$$('[data-budget]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.budget)===budget);b.setAttribute('aria-pressed',String(Number(b.dataset.budget)===budget))})}
let activeCoinModel=null;let customCoins=[];try{const saved=JSON.parse(localStorage.getItem('warrior-custom-coins')||'[]');if(Array.isArray(saved))customCoins=saved.filter(coin=>/^[A-Z0-9]{2,10}$/.test(coin)&&!['BTC','ETH','BNB'].includes(coin))}catch{}
const availableCoins=()=>['BTC','ETH','BNB',...customCoins];
function closeCoinPicker(){const picker=$('#coin-picker');picker.hidden=true;$$('[data-coin-trigger]').forEach(button=>button.setAttribute('aria-expanded','false'));activeCoinModel=null}
function setCoinFor(model,coin){const trigger=$(`[data-coin-trigger="${model}"]`);if(!trigger)return;trigger.dataset.coin=coin;trigger.querySelector('b').textContent=coin;trigger.setAttribute('aria-label',`${window.Warrior.agentLabel(models[model])} 币种 ${coin}`);$('#form-error').textContent=''}
function renderCoinChoices(){if(!activeCoinModel)return;const selected=$(`[data-coin-trigger="${activeCoinModel}"]`).dataset.coin;$('#coin-picker-label').textContent=`为 ${window.Warrior.agentLabel(models[activeCoinModel])} 选择币种`;const list=$('#coin-choice-list');list.replaceChildren();availableCoins().forEach(coin=>{const button=document.createElement('button');button.type='button';button.dataset.coinChoice=coin;button.textContent=coin;button.classList.toggle('selected',coin===selected);button.setAttribute('role','option');button.setAttribute('aria-selected',String(coin===selected));button.onclick=()=>{setCoinFor(activeCoinModel,coin);closeCoinPicker()};list.append(button)})}
function openCoinPicker(model){if($(`[data-coin-trigger="${model}"]`).disabled)return;const wasOpen=!$('#coin-picker').hidden&&activeCoinModel===model;$('#coin-adder').hidden=true;$('#add-coin').setAttribute('aria-expanded','false');closeCoinPicker();if(wasOpen)return;activeCoinModel=model;$('#coin-picker').hidden=false;$(`[data-coin-trigger="${model}"]`).setAttribute('aria-expanded','true');renderCoinChoices()}
function setCoinAdder(open){$('#coin-adder').hidden=!open;$('#add-coin').setAttribute('aria-expanded',String(open));if(open){closeCoinPicker();$('#custom-coin').focus()}else{$('#custom-coin').value='';$('#coin-adder').classList.remove('has-error');$('#coin-adder-error').textContent='2–10 位字母或数字'}}
function addCustomCoin(){const coin=$('#custom-coin').value.trim().toUpperCase();if(!/^[A-Z0-9]{2,10}$/.test(coin)){$('#coin-adder').classList.add('has-error');$('#coin-adder-error').textContent='请输入 2–10 位字母或数字。';return}if(!availableCoins().includes(coin)){customCoins.push(coin);try{localStorage.setItem('warrior-custom-coins',JSON.stringify(customCoins))}catch{}}setCoinAdder(false);toast(`${coin} 已添加，点击 AI 币种名称使用`)}
$('#minus').onclick=()=>{$('#budget').value=Math.max(10,Number($('#budget').value)-5);updateBudget()};$('#plus').onclick=()=>{$('#budget').value=Math.min(1000,Number($('#budget').value)+5);updateBudget()};$('#budget').oninput=updateBudget;$$('input[name=models]').forEach(c=>c.onchange=()=>{const enabled=c.checked;const row=c.closest('.ai-config');row.classList.toggle('inactive',!enabled);row.querySelector('.coin-trigger').disabled=!enabled;if(!enabled&&activeCoinModel===c.value)closeCoinPicker();updateBudget()});$$('[data-coin-trigger]').forEach(button=>button.onclick=()=>openCoinPicker(button.dataset.coinTrigger));$('#coin-picker-close').onclick=closeCoinPicker;$('#add-coin').onclick=()=>setCoinAdder($('#coin-adder').hidden);$('#cancel-coin').onclick=()=>setCoinAdder(false);$('#confirm-coin').onclick=addCustomCoin;$('#custom-coin').oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');$('#coin-adder').classList.remove('has-error');$('#coin-adder-error').textContent='2–10 位字母或数字'};$('#custom-coin').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addCustomCoin()}};
$$('[data-rounds]').forEach(b=>b.onclick=()=>{rounds=b.dataset.rounds==='until-loss'?'until-loss':Number(b.dataset.rounds);$$('[data-rounds]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))})});
if(document.body.dataset.ruleAi!=='true')$('#create-form').onsubmit=e=>{e.preventDefault();const selectedModels=$$('input[name=models]:checked').map(x=>x.value);if(!selectedModels.length){$('#form-error').textContent='请至少选择一位 AI。';return}const coins=Object.fromEntries(selectedModels.map(id=>[id,$(`[data-coin-trigger="${id}"]`)?.dataset.coin||'BTC']));const budget=Number($('#budget').value);const total=budget*selectedModels.length;const coinSummary=selectedModels.map(id=>`${window.Warrior.agentLabel(models[id])} ${coins[id]}`).join(' · ');const roundLabel=rounds==='until-loss'?'亏完为止':`${rounds} 轮`;freshGame=true;gameNumber+=1;$('#experiment-name').textContent=`第 ${String(gameNumber).padStart(3,'0')} 局`;$('#total').textContent=total.toFixed(2);$('#gain').textContent='0.00 （0.00%）';$('#run-status').textContent='准备就绪';$('#pause').disabled=false;paused=false;$('#pause').dataset.running='true';$('#pause').setAttribute('aria-label','暂停下注');$('#pause').title='暂停下注';$$('.model-card').forEach(c=>{const id=c.dataset.model;const selected=selectedModels.includes(id);c.hidden=!selected;c.classList.remove('orb-card-eliminated');if(selected){models[id].coin=coins[id];const chip=c.querySelector('.action-chip');if(chip){chip.textContent=`${coins[id]} · 等待第一轮`;chip.classList.remove('neutral','negative')}}});$('.section-heading>span').textContent=`${selectedModels.length} 位 AI`;$$('.model-card .model-value').forEach(v=>v.innerHTML=`${budget.toFixed(2)} <span>USDT</span><small class="positive">0.00%</small>`);window.orbArena?.reset({selectedModels,coins,budget,rounds,market});closeCoinPicker();setCoinAdder(false);$('#create-dialog').close();page('overview');toast('已创建演示对局，尚未产生真实交易')};
const defaultDecisionIndicators=['priceChange','rsi','ema','volume','orderbook','odds'];
const strategyProfiles=window.WarriorStrategyCatalog.profiles;
const strategyAgent=(strategy,provider='gpt')=>{const profile=strategyProfiles[strategy];return {name:profile.label,provider,skinId:'anime-female',strategy,decisionVariance:profile.variance,actionUrge:profile.actionUrge,emotionSensitivity:profile.emotionSensitivity,maxStakePct:profile.maxStakePct,allowAllIn:profile.allowAllIn,indicators:[...profile.recommended],icon:'',color:'blue-bg',coin:'BTC',action:'BTC · 等待第一轮',reason:profile.description}};
const models=window.modelCatalog={
  liangXi:strategyAgent('liangXi'),
  claude:{...strategyAgent('aggressive','claude'),name:'狐火术师',color:'orange-bg',action:'ETH 看涨'},
  gpt:{...strategyAgent('smart','gpt'),name:'星环机甲',action:'BTC 看涨'},
  deepseek:{...strategyAgent('conservative','deepseek'),name:'深海灵兽',color:'purple-bg',action:'ETH 看空'},
  trendFollowing:strategyAgent('trendFollowing'),
  meanReversion:strategyAgent('meanReversion'),
  priceAction:strategyAgent('priceAction'),
  breakout:strategyAgent('breakout'),
  orderFlow:strategyAgent('orderFlow'),
  volatilityGuard:strategyAgent('volatilityGuard'),
  consensus:strategyAgent('consensus'),
  fengShui:strategyAgent('fengShui'),
  diviner:strategyAgent('diviner'),
  czBrother:strategyAgent('czBrother'), contrarian:strategyAgent('contrarian'), showoff:strategyAgent('showoff'), firstLady:strategyAgent('firstLady'),
};
const decisionProfiles={aggressive:{label:'10U战神',action:'看涨 · 4.20U',confidence:76,mode:'连胜加码',reason:'短线、动量和主动买卖同向，当前两连胜，按策略加码。'},smart:{label:'超级AI',action:'看涨 · 2.00U',confidence:83,mode:'先判局势',reason:'ADX、EMA 和 MACD 判断为趋势局，再用流量与盘口确认方向。'},conservative:{label:'守财奴',action:'本轮不下注',confidence:62,mode:'捂紧钱袋',reason:'当前波动或价差偏高，即使方向看涨也不押。'}};
const decisionIndicators={priceChange:{label:'1m / 5m 涨跌',value:'+0.18% / +0.42%',tone:'up'},rsi:{label:'RSI 14',value:'61.4',tone:'up'},ema:{label:'EMA 5 / 20',value:'EMA5 > EMA20',tone:'up'},macd:{label:'MACD 12 / 26 / 9',value:'柱线 +8.2',tone:'up'},adx:{label:'ADX / DMI 14',value:'28.4 · +DI 占优',tone:'up'},bollinger:{label:'布林带 20',value:'价格位置 72%',tone:'up'},atr:{label:'ATR 14 波动幅度',value:'0.34%',tone:'neutral'},roc:{label:'ROC 10 / 20',value:'+0.72% / +1.14%',tone:'up'},momentum:{label:'动量 10',value:'+58.2',tone:'up'},volatility:{label:'已实现波动率 20',value:'0.14%',tone:'neutral'},volume:{label:'成交量倍率',value:'1.32×',tone:'up'},takerFlow:{label:'主动买卖流 5 分钟',value:'主动买入 64.8%',tone:'up'},orderbook:{label:'订单簿失衡',value:'+8.6%',tone:'up'},spread:{label:'买卖价差与微价格',value:'1.8 bps',tone:'neutral'},odds:{label:'市场赔率',value:'1.86×',tone:'neutral'}};
function liveDetail(key,m){
  if(document.body.dataset.ruleAi!=='true')return false;
  const simulation=window.Warrior?.state?.simulation;
  const localCards=[...document.querySelectorAll('.ai-config-list .ai-config')];
  const index=localCards.findIndex(card=>card.dataset.aiConfig===key);
  const agent=simulation?.agents?.find(item=>item.id===key)||simulation?.agents?.[index];
  if(!agent)return false;
  const policy=agent.policy||m,decision=agent.lastDecision,provider=['claude','gpt','deepseek'].includes(policy.provider)?policy.provider:'gpt';
  const root=$('#detail-content');root.replaceChildren();
  root.dataset.battleId=simulation.id;root.dataset.agentId=agent.id;
  const heading=document.createElement('div');heading.className='detail-model';
  const avatar=document.createElement('span');avatar.className=`detail-ai-avatar avatar-${provider}`;avatar.setAttribute('aria-hidden','true');
  const title=document.createElement('div'),name=document.createElement('h2'),subtitle=document.createElement('p');
  name.textContent=window.Warrior.agentLabel(policy);title.append(name);heading.append(avatar,title);
  subtitle.className='detail-ai-model';
  const modelCaption=document.createElement('span');modelCaption.textContent='使用方式';
  const modelValue=document.createElement('strong');
  if(policy.aiConnectionId!==undefined) {
    modelValue.textContent=policy.aiConnectionId==='none'?'本地规则':window.Warrior.battleModels?.label(policy)||'未记录';
    if(policy.aiConnectionId!=='none')modelValue.dataset.noTranslate='';
  } else if(decision?.engine?.model) {modelValue.textContent=decision.engine.model;modelValue.dataset.noTranslate='';}
  else modelValue.textContent='未记录';
  subtitle.append(modelCaption,modelValue);title.append(subtitle);

  window.WarriorDefeat.clearDetail();
  if(window.WarriorDefeat.isDefeated(simulation,agent)){
    window.WarriorDefeat.showDetail(root,heading,simulation,agent);
    window.Warrior?.skins?.applyElement(avatar,{...policy,skinId:policy.skinId||m.skinId,provider});
    openDialog('#detail-dialog');return true;
  }

  const featured=document.createElement('section');featured.className='decision decision-featured';
  const meta=document.createElement('div');meta.className='decision-meta';
  const round=document.createElement('span');round.dataset.noTranslate='';const decisionTime=Number(decision?.roundId);round.textContent=Number.isFinite(decisionTime)&&decisionTime>0?new Intl.DateTimeFormat(document.documentElement.lang,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(decisionTime):'—';
  const mode=document.createElement('span');mode.textContent=decision?.capitalManagement?.recoveryActive?'搏命梭哈':decision?.capitalManagement?.stakeMultiplier<1?'盈利减仓':({NORMAL:'正常',ADD_ON:'加码',ALL_IN:'条件梭哈',WAIT:'等待信号'})[decision?.riskMode]||'等待信号';meta.append(round,mode);
  const headline=document.createElement('div');headline.className='decision-headline';
  const actionWrap=document.createElement('div'),actionLabel=document.createElement('small'),action=document.createElement('h3');actionLabel.textContent='当前判断';
  action.textContent=!decision?(simulation.enabled?'等待判断':'已暂停'):decision.action==='BET'?`${policy.coin||'BTC'} · ${decision.direction==='UP'?'看涨':'看跌'} · ${Number(decision.stake ?? decision.stakeUsdt ?? 0).toFixed(2)}U`:decision.action==='REJECTED'?'未通过检查，暂不下注':'本轮不下注';
  if(decision?.action==='BET'&&agent.orders?.some(order=>order.status==='OPEN'&&String(order.start)===String(decision.roundId))){actionLabel.textContent='决策依据';action.hidden=true;}
  actionWrap.append(actionLabel,action);const confidence=document.createElement('strong'),confidenceValue=document.createElement('span');confidenceValue.dataset.noTranslate='';confidenceValue.textContent=decision?`${Number(decision.confidence).toFixed(0)}%`:'—';const confidenceLabel=document.createElement('small');confidenceLabel.textContent='判断把握';confidence.append(confidenceValue,confidenceLabel);confidence.hidden=!decision||!Number.isFinite(decision.confidence);headline.append(actionWrap,confidence);
  const reason=document.createElement('p');reason.textContent=decision?.reason||'有合适机会时，再决定是否下注。';meta.hidden=!decision;actionLabel.hidden=!decision;featured.append(meta,headline,reason);
  if(strategyProfiles[policy.strategy]&&window.WarriorStrategyCatalog.divinationStrategies.includes(policy.strategy)) {
    confidenceLabel.textContent='模拟评分';confidenceValue.textContent=decision?`${Number(decision.confidence).toFixed(0)}/100`:'—';
    if(decision?.divination) {
      const oracle=document.createElement('section');oracle.className='divination-reading';
      const oracleTitle=document.createElement('strong');oracleTitle.textContent='本轮占卜';
      const draw=document.createElement('p');draw.dataset.noTranslate='';draw.textContent=window.WarriorStrategyCatalog.formatDivination(decision.divination,document.documentElement.lang);
      const seed=document.createElement('small');seed.dataset.noTranslate='';seed.textContent=`Seed · ${decision.divination.seed}`;
      const note=document.createElement('small');note.textContent='指标起卦 · 娱乐模拟，非真实胜率';
      oracle.append(oracleTitle,draw,seed,note);featured.append(oracle);
      if(decision.capitalManagement?.recoveryActive)reason.textContent=decision.reason;
      else if(decision.engine?.mode==='deepseek')reason.textContent=decision.divination.interpretation||decision.reason;
      else reason.textContent=decision.action==='BET'?'占卜与指标同向，小注尝试。':'占卜或指标未通过，本轮观望。';
    }
  }
  const metrics=document.createElement('details');metrics.className='indicator-section detail-disclosure';
  const metricsHeading=document.createElement('summary');metricsHeading.className='indicator-heading';const metricsTitle=document.createElement('strong');metricsTitle.textContent='行情参考';metricsHeading.append(metricsTitle);if(!decision){const metricsState=document.createElement('span');metricsState.textContent='暂无数据';metricsHeading.append(metricsState);}
  const grid=document.createElement('div');grid.className='indicator-snapshot';
  const source=decision?.indicators||{};
  const rows=[
    ['1m / 5m 涨跌',source.price_change_pct?`${Number(source.price_change_pct.oneMinute).toFixed(3)}% / ${Number(source.price_change_pct.fiveMinutes).toFixed(3)}%`:null],
    ['买卖强弱（RSI）',Number.isFinite(source.rsi_14)?Number(source.rsi_14).toFixed(2):null],
    ['短期／长期均价',source.ema_5_20?`${Number(source.ema_5_20.ema5).toFixed(2)} / ${Number(source.ema_5_20.ema20).toFixed(2)}`:null],
    ['成交量倍率',Number.isFinite(source.volume_ratio)?`${Number(source.volume_ratio).toFixed(2)}×`:null],
    ['买卖挂单对比',Number.isFinite(source.spot_order_book_imbalance)?`${(Number(source.spot_order_book_imbalance)*100).toFixed(2)}%`:null],
    ['市场赔率',source.market_odds?`${Number(source.market_odds.up).toFixed(2)}× / ${Number(source.market_odds.down).toFixed(2)}×`:null],
  ].filter(row=>row[1]!==null);
  for(const definition of Object.values(window.WarriorStrategyCatalog.indicators)) {
    if(window.WarriorStrategyCatalog.defaultIndicators.includes(definition.key))continue;
    const value=source[definition.field];
    if(value===null||value===undefined)continue;
    const display=typeof value==='number'?value.toFixed(4):Object.entries(value).map(([key,number])=>`${key}: ${Number(number).toFixed(4)}`).join(' / ');
    rows.push([definition.zh,display]);
  }
  rows.forEach(([label,value])=>{const item=document.createElement('div'),labelNode=document.createElement('span'),valueNode=document.createElement('strong');labelNode.textContent=label;valueNode.dataset.noTranslate='';valueNode.textContent=value;item.append(labelNode,valueNode);grid.append(item)});
  if(!rows.length){const empty=document.createElement('p');empty.textContent='暂无数据';grid.append(empty)}metrics.append(metricsHeading,grid);
  const policyNode=document.createElement('section');policyNode.className='decision-policy';
  [['判断灵活度',`${policy.decisionVariance??45}/100`],['手痒程度',`${policy.actionUrge??strategyProfiles[policy.strategy]?.actionUrge??50}/100`],['情绪波动',`${policy.emotionSensitivity??strategyProfiles[policy.strategy]?.emotionSensitivity??0}/100`],['每轮最多下注',`${policy.maxStakePct??100}%`],['允许全押',policy.allowAllIn?'允许':'关闭']].forEach(([label,value])=>{const item=document.createElement('div'),labelNode=document.createElement('span'),valueNode=document.createElement('strong');labelNode.textContent=label;valueNode.textContent=value;item.append(labelNode,valueNode);policyNode.append(item)});
  const note=document.createElement('p');note.className='dialog-note';note.textContent='模拟下注';
  const policyDetails=document.createElement('details');policyDetails.className='detail-disclosure';const policyTitle=document.createElement('summary');policyTitle.textContent='策略说明';policyDetails.append(policyTitle,policyNode);
  root.append(heading,featured,window.WarriorEquity.mount(simulation,agent),metrics,policyDetails,note);window.Warrior?.skins?.applyElement(avatar,{...policy,skinId:policy.skinId||m.skinId,provider});openDialog('#detail-dialog');return true;
}
function detail(key){const m=models[key];if(!m)return;const fresh=freshGame,provider=['claude','gpt','deepseek'].includes(m.provider)?m.provider:'gpt',profile=decisionProfiles[m.strategy]||decisionProfiles.smart,selected=(Array.isArray(m.indicators)?m.indicators:defaultDecisionIndicators).filter(name=>decisionIndicators[name]),headline=profile.action==='本轮不下注'?profile.action:`${m.coin} ${profile.action}`,metrics=selected.map(name=>{const item=decisionIndicators[name];return `<div data-tone="${item.tone}"><span>${item.label}</span><strong data-no-translate>${item.value}</strong></div>`}).join('');$('#detail-content').innerHTML=`<div class="detail-model"><span class="detail-ai-avatar avatar-${provider}" aria-hidden="true"></span><div><h2>${window.Warrior.agentLabel(m)}</h2><p class="muted">模拟决策 · ${profile.label}</p></div></div><section class="decision decision-featured"><div class="decision-meta"><span>${fresh?'等待第一轮':'第 12 轮 · 刚刚'}</span><span>${profile.mode}</span></div><div class="decision-headline"><div><small>${fresh?'策略就绪':'AI 决策'}</small><h3>${fresh?`${m.coin} · 等待指标`:headline}</h3></div><strong>${fresh?'—':`${profile.confidence}%`}<small>置信度</small></strong></div><p>${fresh?'收到完整且新鲜的指标后，AI 可以选择看涨、看跌或不下注。':profile.reason}</p></section><section class="indicator-section"><div class="indicator-heading"><strong>本轮指标快照</strong><span>模拟数据</span></div><div class="indicator-snapshot">${metrics}</div></section><section class="decision-policy"><div><span>决策变化</span><strong data-no-translate>${m.decisionVariance??45}/100</strong></div><div><span>手痒程度</span><strong data-no-translate>${m.actionUrge??strategyProfiles[m.strategy]?.actionUrge??50}/100</strong></div><div><span>情绪波动</span><strong data-no-translate>${m.emotionSensitivity??strategyProfiles[m.strategy]?.emotionSensitivity??0}/100</strong></div><div><span>单轮上限</span><strong data-no-translate>${m.maxStakePct??100}%</strong></div><div><span>条件梭哈</span><strong>${m.allowAllIn?'允许':'关闭'}</strong></div></section><p class="decision-boundary">手痒只放宽有效信号；情绪影响门槛和金额。没数据、没优势或方向打架时仍然不下注。</p><p class="dialog-note">模拟决策 · 未连接自动 AI 下单</p>`;window.Warrior?.skins?.applyElement($('#detail-content .detail-ai-avatar'),{...m,provider});openDialog('#detail-dialog')}
window.openModelDetail=key=>{const model=models[key]||window.Warrior?.state?.simulation?.agents?.find(agent=>agent.id===key)?.policy;if(!model)return;if(!liveDetail(key,model))detail(key)};$$('[data-model]').forEach(b=>b.onclick=()=>window.openModelDetail(b.dataset.model));$('#review').onclick=()=>window.openModelDetail('claude');
