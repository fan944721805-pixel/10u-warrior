(() => {
  const list=document.querySelector('.ai-config-list');
  const editor=document.querySelector('#agent-editor');
  const addButton=document.querySelector('#add-coin');
  if(!list||!editor||!addButton)return;

  const compactStrategies=matchMedia('(max-width: 760px)');
  const strategyToggle=document.createElement('button');
  strategyToggle.type='button';strategyToggle.className='strategy-list-toggle';
  list.id=list.id||'create-strategy-list';
  strategyToggle.setAttribute('aria-controls',list.id);
  list.after(strategyToggle);
  let strategiesExpanded=false;
  function updateStrategyVisibility(){
    const cards=[...list.querySelectorAll('.ai-config')];
    const limit=compactStrategies.matches?1:3;
    cards.forEach((card,index)=>card.classList.toggle('strategy-folded',!strategiesExpanded&&index>=limit));
    strategyToggle.hidden=cards.length<=limit;
    strategyToggle.setAttribute('aria-expanded',String(strategiesExpanded));
    strategyToggle.textContent=strategiesExpanded?'收起':'展开更多';
  }
  strategyToggle.onclick=()=>{strategiesExpanded=!strategiesExpanded;updateStrategyVisibility();};
  compactStrategies.addEventListener('change',updateStrategyVisibility);
  document.querySelector('#create-dialog').addEventListener('close',()=>{strategiesExpanded=false;updateStrategyVisibility();});
  new MutationObserver(updateStrategyVisibility).observe(list,{childList:true});
  updateStrategyVisibility();

  const storageKey='warrior-agent-config-v1';
  const catalog=window.modelCatalog;
  const skinRegistry=window.Warrior?.skins;
  const providerNames={claude:'Claude',gpt:'GPT',deepseek:'DeepSeek'};
  const defaultAgentNames={claude:'狐火术师',gpt:'星环机甲',deepseek:'深海灵兽',trendFollowing:'跟风侠',meanReversion:'抄底摸顶王',priceAction:'蜡烛哥',breakout:'火箭哥',orderFlow:'大单侦探',volatilityGuard:'稳如老狗',consensus:'六票战神'};
  Object.assign(defaultAgentNames,{fengShui:'风水师',diviner:'占卜师',czBrother:'CZ大表哥',contrarian:'逆行者',showoff:'装逼的人',firstLady:'一姐'});
  const defaultAgentIds=Object.keys(defaultAgentNames);
  const providerStrategies={claude:'aggressive',gpt:'smart',deepseek:'conservative'};
  const maxCards=16,maxSelected=8;
  const {profiles:strategyProfiles,indicators:indicatorCatalog,defaultIndicators}=window.WarriorStrategyCatalog;
  let editingId=null, editingProvider='gpt', editingSkinId='anime-female';

  const safeProvider=value=>Object.hasOwn(providerNames,value)?value:'gpt';
  const safeCoin=value=>['BTC','ETH','BNB'].includes(value)?value:'BTC';
  const safeStrategy=(value,provider='gpt')=>Object.hasOwn(strategyProfiles,value)?value:providerStrategies[safeProvider(provider)];
  const strategyFor=(value,provider)=>strategyProfiles[safeStrategy(value,provider)];
  const safeSkin=value=>skinRegistry?.normalizeId(value)||'anime-female';
  const safeVariance=(value,profile)=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Math.round(Number(value)))):profile.variance;
  const safeActionUrge=(value,profile)=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Math.round(Number(value)))):profile.actionUrge;
  const safeEmotion=(value,profile)=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Math.round(Number(value)))):profile.emotionSensitivity;
  const safeMaxStake=(value,profile)=>Number.isFinite(Number(value))?Math.max(5,Math.min(profile.maxStakePct,Math.round(Number(value)/5)*5)):profile.maxStakePct;
  const recommendedIndicators=profile=>[...new Set(profile.recommended || profile.required || defaultIndicators)];
  const safeIndicators=(value,profile=strategyProfiles.smart)=>{
    const recommended=recommendedIndicators(profile);
    const selected=Array.isArray(value)?[...new Set(value.filter(key=>Object.hasOwn(indicatorCatalog,key)))]:recommended;
    return selected.length>=Math.min(3,profile.required.length||3)?selected:recommended;
  };
  const sameIndicators=(left,right)=>left.length===right.length&&left.every((key,index)=>key===right[index]);
  const safeIndicatorMode=(value,selected,profile)=>value==='custom'||value==='auto'?value:(sameIndicators(selected,recommendedIndicators(profile))?'auto':'custom');

  const strategyOptions=editor.querySelector('[data-agent-options="strategy"]');
  strategyOptions.replaceChildren(...Object.values(strategyProfiles).map(profile=>{
    const button=document.createElement('button');button.type='button';button.dataset.agentStrategy=profile.key;
    const avatar=document.createElement('span');avatar.className='ai-avatar strategy-avatar';avatar.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.textContent=profile.label;
    button.append(avatar,label);button.title=profile.description;
    setAvatar(avatar,'gpt','anime-female',profile.key);
    if(profile.key==='smart')button.classList.add('selected');
    return button;
  }));
  const indicatorGrid=editor.querySelector('.agent-indicator-grid');
  const indicatorAuto=document.querySelector('#agent-indicator-auto');
  const indicatorAdvanced=document.querySelector('#agent-indicator-advanced');
  const indicatorCount=document.querySelector('#agent-indicator-count');
  indicatorGrid.replaceChildren(...Object.values(indicatorCatalog).map(item=>{
    const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span'),required=document.createElement('small');
    input.type='checkbox';input.value=item.key;input.checked=recommendedIndicators(strategyProfiles.smart).includes(item.key);
    span.textContent=item.zh;required.textContent='策略必需';required.className='indicator-required';required.hidden=true;
    label.append(input,span,required);return label;
  }));
  const indicatorActions=document.createElement('div');indicatorActions.className='indicator-actions';
  for(const [text,values,mode] of [['全选指标',Object.keys(indicatorCatalog),'custom'],['恢复策略指标',null,'auto']]){
    const button=document.createElement('button');button.type='button';button.textContent=text;
    button.onclick=()=>{const profile=strategyFor(selectedOption('strategy'),selectedOption('model'));setIndicators(values||recommendedIndicators(profile),{mode});renderDecisionConfig()};indicatorActions.append(button);
  }
  indicatorGrid.before(indicatorActions);
  const indicatorNote=document.createElement('p');indicatorNote.className='ai-settings-note';
  indicatorNote.textContent='技术指标使用已收盘的 1 分钟 K 线；盘口单独更新。指标相关不代表独立证据，缺失时跳过。';
  indicatorGrid.after(indicatorNote);
  const syncStatus=document.createElement('p');syncStatus.id='agent-sync-status';syncStatus.setAttribute('role','status');
  editor.append(syncStatus);

  function setAvatar(element,provider,skinId='anime-female',strategy){
    if(!element)return;
    element.classList.remove('avatar-claude','avatar-gpt','avatar-deepseek');
    element.classList.add(`avatar-${safeProvider(provider)}`);
    skinRegistry?.applyElement(element,{provider:safeProvider(provider),skinId:safeSkin(skinId),strategy});
  }

  function renderStrategyAvatars(){
    strategyOptions.querySelectorAll('[data-agent-strategy]').forEach(button=>{
      const skinId=button.classList.contains('selected')?editingSkinId:'anime-female';
      setAvatar(button.querySelector('.ai-avatar'),editingProvider,skinId,button.dataset.agentStrategy);
    });
  }

  function setOption(group,value){
    editor.querySelectorAll(`[data-agent-${group}]`).forEach(button=>{
      const selected=button.dataset[`agent${group[0].toUpperCase()}${group.slice(1)}`]===value;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }

  function selectedOption(group){
    if(group==='model')return editingProvider;
    if(group==='coin')return window.Warrior?.state?.battleCoin||'BTC';
    const selected=editor.querySelector(`[data-agent-${group}].selected`);
    return selected?.dataset[`agent${group[0].toUpperCase()}${group.slice(1)}`];
  }

  function currentDecisionConfig(){
    const profile=strategyFor(selectedOption('strategy'),selectedOption('model'));
    const maxStakePct=safeMaxStake(document.querySelector('#max-stake').value,profile);
    return {
      profile,
      coin:safeCoin(selectedOption('coin')),
      variance:safeVariance(document.querySelector('#decision-variance').value,profile),
      actionUrge:safeActionUrge(document.querySelector('#action-urge').value,profile),
      emotionSensitivity:safeEmotion(document.querySelector('#emotion-sensitivity').value,profile),
      maxStakePct,
      allowAllIn:profile.allowAllIn&&maxStakePct===100&&document.querySelector('#agent-all-in').checked,
      indicators:[...editor.querySelectorAll('.agent-indicator-grid input:checked')].map(input=>input.value),
      indicatorMode:indicatorAuto.checked?'auto':'custom'
    };
  }

  function buildPrompt(config=currentDecisionConfig()){
    const {profile,coin,variance,actionUrge,emotionSensitivity,maxStakePct,allowAllIn,indicators}=config;
    return window.WarriorStrategyCatalog.buildDecisionPrompt({
      asset:`${coin}USDT`,timeframe:window.Warrior?.state?.battlePeriod||'5m',strategy:profile.key,decisionVariance:variance,actionUrge,emotionSensitivity,maxStakePct,allowAllIn,
      indicatorFields:indicators.map(key=>indicatorCatalog[key]?.field).filter(Boolean)
    });
  }

  function renderDecisionConfig(){
    const config=currentDecisionConfig(),{profile,variance,actionUrge,emotionSensitivity,maxStakePct,allowAllIn}=config;
    document.querySelector('#decision-variance-value').textContent=String(variance);
    document.querySelector('#action-urge-value').textContent=String(actionUrge);
    document.querySelector('#emotion-sensitivity-value').textContent=String(emotionSensitivity);
    document.querySelector('#agent-emotion-note').textContent=profile.emotionLabel;
    document.querySelector('#max-stake-value').textContent=`${maxStakePct}%`;
    document.querySelector('#max-stake').max=String(profile.maxStakePct);
    const minimumIndicators=Math.min(3,profile.required.length||3);
    document.querySelector('.agent-indicators legend span').textContent=`至少保留 ${minimumIndicators} 项`;
    indicatorNote.textContent=profile.key==='priceAction'
      ? '裸 K 只提供已收盘的开高低收，不提供成交量；5m / 15m / 1h / 1d 对局分别看 1m / 3m / 15m / 4h K 线。'
      : '技术指标使用已收盘的 1 分钟 K 线；盘口单独更新。指标相关不代表独立证据，缺失时跳过。';
    indicatorCount.textContent=`${config.indicators.length} / ${Object.keys(indicatorCatalog).length}`;
    const allIn=document.querySelector('#agent-all-in'),allInNote=document.querySelector('#agent-all-in-note');
    const allInAvailable=profile.allowAllIn&&maxStakePct===100;
    allIn.disabled=!allInAvailable;
    if(allIn.disabled)allIn.checked=false;
    allInNote.textContent=!profile.allowAllIn?'当前策略禁止梭哈。':maxStakePct!==100?'单轮上限必须为 100% 才能梭哈。':'只使用模拟余额；仍须满足该策略的强信号条件。';
    const risk=document.querySelector('#agent-risk-summary');
    const rules={
      aggressive:['连胜加码',allowAllIn?'强信号可梭哈':'禁止梭哈'],
      smart:['先判局势再换重点',allowAllIn?'极强优势可梭哈':'禁止梭哈'],
      conservative:['不全同向就捂钱袋']
    }[profile.key] || ['允许不下注'];
    rules.push(profile.emotionLabel);
    const ladder=document.createElement('span');ladder.className='agent-stake-ladder';
    for(const [label,percent] of [['试一口',profile.stakeTiers[0]],['有把握',profile.stakeTiers[1]],['火力全开',profile.stakeTiers[2]]]){
      const item=document.createElement('i'),small=document.createElement('small'),strong=document.createElement('strong');
      small.textContent=label;strong.textContent=`${Math.min(percent,maxStakePct)}%`;strong.dataset.noTranslate='';item.append(small,strong);ladder.append(item);
    }
    risk.replaceChildren(ladder,...rules.map(rule=>{const span=document.createElement('span');span.textContent=rule;return span}));
    document.querySelector('#agent-prompt').textContent=buildPrompt(config);
  }

  function renderStrategy(strategy,provider){
    const profile=strategyFor(strategy,provider),preview=document.querySelector('#agent-strategy-preview');
    preview.dataset.strategy=profile.key;
    preview.querySelector('strong').textContent=profile.label;
    preview.querySelector('small').textContent=profile.description;
    renderDecisionConfig();
  }

  function setIndicators(value,{mode='auto'}={}){
    const profile=strategyFor(selectedOption('strategy'),selectedOption('model'));
    const required=new Set(profile.required),automatic=mode!=='custom';
    const selected=new Set([...(automatic?recommendedIndicators(profile):safeIndicators(value,profile)),...required]);
    indicatorAuto.checked=automatic;
    editor.querySelectorAll('.agent-indicator-grid input').forEach(input=>{
      input.checked=selected.has(input.value);input.disabled=automatic||required.has(input.value);
      input.parentElement.querySelector('.indicator-required').hidden=!required.has(input.value);
    });
  }

  function applyProfilePreset(strategy){
    const profile=strategyFor(strategy,selectedOption('model'));
    document.querySelector('#max-stake').max=String(profile.maxStakePct);
    document.querySelector('#decision-variance').value=String(profile.variance);
    document.querySelector('#action-urge').value=String(profile.actionUrge);
    document.querySelector('#emotion-sensitivity').value=String(profile.emotionSensitivity);
    document.querySelector('#max-stake').value=String(profile.maxStakePct);
    document.querySelector('#agent-all-in').checked=profile.allowAllIn;
    setIndicators(recommendedIndicators(profile),{mode:'auto'});
    renderStrategy(profile.key,selectedOption('model'));
  }

  function refreshBudget(){
    document.querySelector('#budget')?.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function bindDynamicCheckbox(card){
    if(card.dataset.selectionBound==='true')return;
    card.dataset.selectionBound='true';
    const checkbox=card.querySelector('input[name="models"]');
    checkbox.addEventListener('change',()=>{
      let overLimit=false;
      if(checkbox.checked&&list.querySelectorAll('input[name="models"]:checked').length>maxSelected){
        checkbox.checked=false;
        overLimit=true;
      }
      const enabled=checkbox.checked;
      card.classList.toggle('inactive',!enabled);
      const legacy=card.querySelector('.coin-trigger');
      if(legacy)legacy.disabled=!enabled;
      refreshBudget();
      if(overLimit){
        document.querySelector('#form-error').textContent='每局最多选择 8 位 AI。';
        toast('每局最多选择 8 位 AI。');
      }
    });
  }

  function createAgentCard(config){
    const profile=strategyFor(config.strategy,config.provider);
    const card=document.createElement('div');
    card.className='ai-config';
    card.dataset.aiConfig=config.id;
    card.dataset.provider=safeProvider(config.provider);
    card.dataset.strategy=profile.key;

    const choice=document.createElement('label');
    choice.className='ai-choice';
    choice.setAttribute('aria-label',`选择 ${profile.label}`);
    const checkbox=document.createElement('input');
    checkbox.type='checkbox';checkbox.name='models';checkbox.value=config.id;checkbox.checked=true;
    const avatar=document.createElement('span');
    avatar.className=`ai-avatar strategy-avatar avatar-${safeProvider(config.provider)}`;avatar.setAttribute('aria-hidden','true');
    const name=document.createElement('strong');name.textContent=profile.label;
    choice.append(checkbox,avatar,name);

    const legacy=document.createElement('button');
    legacy.type='button';legacy.className='coin-trigger legacy-coin-trigger';legacy.dataset.coinTrigger=config.id;legacy.dataset.coin=config.coin;
    legacy.setAttribute('aria-label',`${profile.label} 币种 ${config.coin}`);legacy.hidden=true;
    const coin=document.createElement('b');coin.textContent=config.coin;legacy.append(coin);
    card.append(choice,legacy);list.insertBefore(card,addButton);
    setAvatar(avatar,config.provider,config.skinId,config.strategy);
    bindDynamicCheckbox(card);
    return card;
  }

  function applyToCard(id,config){
    const card=list.querySelector(`[data-ai-config="${CSS.escape(id)}"]`);if(!card)return;
    const profile=strategyFor(config.strategy,config.provider);
    card.querySelector('.ai-choice').setAttribute('aria-label',`选择 ${profile.label}`);
    card.querySelector('.ai-choice strong').textContent=profile.label;
    card.querySelector('.agent-strategy')?.remove();
    card.dataset.provider=safeProvider(config.provider);
    card.dataset.strategy=profile.key;
    setAvatar(card.querySelector('.ai-avatar'),config.provider,config.skinId,config.strategy);
    const legacy=card.querySelector('.coin-trigger');legacy.dataset.coin=config.coin;legacy.querySelector('b').textContent=config.coin;legacy.setAttribute('aria-label',`${profile.label} 币种 ${config.coin}`);
    const modelCard=document.body.dataset.ruleAi==='true'?null:document.querySelector(`.model-card[data-model="${CSS.escape(id)}"]`);
    if(modelCard){
      modelCard.querySelector('.model-top strong').textContent=profile.label;
      const modelStrategy=modelCard.querySelector('.model-strategy');if(modelStrategy)modelStrategy.textContent=strategyFor(config.strategy,config.provider).label;
      setAvatar(modelCard.querySelector('.model-ai-avatar'),config.provider,config.skinId,config.strategy);
    }
    skinRegistry?.applyAgent(id,{...catalog[id],...config,skinId:safeSkin(config.skinId)});
  }

  function readStored(){
    try{
      const value=JSON.parse(localStorage.getItem(storageKey)||'[]');
      if(Array.isArray(value))return {agents:value,deleted:[]};
      return {agents:Array.isArray(value?.agents)?value.agents:[],deleted:Array.isArray(value?.deleted)?value.deleted:[]};
    }catch{return {agents:[],deleted:[]}}
  }

  const stored=readStored();
  const deletedIds=new Set(stored.deleted.filter(id=>defaultAgentIds.includes(id)));

  function syncSimulationStrategies(agents){
    const slots=['A','B','C'];
    const payload=agents.slice(0,3).map((agent,index)=>({
      id:slots[index],name:agent.name,provider:agent.provider,skinId:agent.skinId,coin:agent.coin,strategy:agent.strategy,
      decisionVariance:agent.decisionVariance,actionUrge:agent.actionUrge,maxStakePct:agent.maxStakePct,
      emotionSensitivity:agent.emotionSensitivity,allowAllIn:agent.allowAllIn,indicators:agent.indicators
    }));
    const request=window.Warrior?.simulationApi?.setStrategies
      ? window.Warrior.simulationApi.setStrategies(payload)
      : fetch('/api/simulation/strategies',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({agents:payload})}).then(response=>{if(!response.ok)throw new Error('SYNC_FAILED');return response.json()});
    request
      .then(value=>{syncStatus.textContent='';window.dispatchEvent(new CustomEvent('warrior-simulation-strategies-synced',{detail:value}))})
      .catch(error=>{syncStatus.textContent=error.code==='STRATEGY_SERVICE_UPGRADE_REQUIRED'?'新增指标与策略需要重启本机服务后使用。':'策略同步失败，请重启本机服务';window.dispatchEvent(new CustomEvent('warrior-simulation-strategies-sync-failed'))});
  }

  function persist({syncStrategies=true}={}){
    const agents=getAgents();
    try{localStorage.setItem(storageKey,JSON.stringify({version:5,agents,deleted:[...deletedIds]}))}catch{}
    if(syncStrategies)syncSimulationStrategies(agents);
    return agents;
  }
  function getAgents(){
    return [...list.querySelectorAll('.ai-config')].map(card=>{
      const id=card.dataset.aiConfig,item=catalog[id]||{};
      const provider=safeProvider(item.provider||id);
      const profile=strategyFor(item.strategy,provider);
      const maxStakePct=safeMaxStake(item.maxStakePct,profile),indicators=item.indicatorMode==='auto'?recommendedIndicators(profile):safeIndicators(item.indicators,profile);
      return {id,name:profile.label,provider,skinId:safeSkin(item.skinId),coin:safeCoin(card.querySelector('.coin-trigger')?.dataset.coin||item.coin),strategy:profile.key,decisionVariance:safeVariance(item.decisionVariance,profile),actionUrge:safeActionUrge(item.actionUrge,profile),emotionSensitivity:safeEmotion(item.emotionSensitivity,profile),maxStakePct,allowAllIn:profile.allowAllIn&&maxStakePct===100&&Boolean(item.allowAllIn??profile.allowAllIn),indicators,indicatorMode:safeIndicatorMode(item.indicatorMode,indicators,profile),custom:!defaultAgentIds.includes(id)};
    });
  }

  function closeEditor(){
    editor.hidden=true;editingId=null;addButton.setAttribute('aria-expanded','false');
    document.querySelector('#agent-editor-error').textContent='';
    window.Warrior?.aiSettings?.closed();
  }

  function openEditor(id=null){
    const newProvider=window.Warrior?.aiSettings?.selectedProvider()||'gpt';
    window.Warrior?.aiSettings?.open('strategy',{fromEditor:true});
    editingId=id;
    const isNew=!id,item=isNew?{}:(catalog[id]||{});
    const provider=safeProvider(item.provider||(isNew?newProvider:id));
    editingProvider=provider;
    const strategy=safeStrategy(item.strategy,provider),profile=strategyFor(strategy,provider);
    document.querySelector('#save-agent').textContent=isNew?'添加 Agent':'保存设置';
    editingSkinId=safeSkin(item.skinId);
    setOption('strategy',strategy);renderStrategyAvatars();
    document.querySelector('#decision-variance').value=String(safeVariance(item.decisionVariance,profile));
    document.querySelector('#action-urge').value=String(safeActionUrge(item.actionUrge,profile));
    document.querySelector('#emotion-sensitivity').value=String(safeEmotion(item.emotionSensitivity,profile));
    document.querySelector('#max-stake').max=String(profile.maxStakePct);
    const maxStakePct=safeMaxStake(item.maxStakePct,profile),indicators=safeIndicators(item.indicators,profile);
    const indicatorMode=safeIndicatorMode(item.indicatorMode,indicators,profile);
    document.querySelector('#max-stake').value=String(maxStakePct);
    document.querySelector('#agent-all-in').checked=profile.allowAllIn&&maxStakePct===100&&Boolean(item.allowAllIn??profile.allowAllIn);
    indicatorAdvanced.open=indicatorMode==='custom';
    setIndicators(indicators,{mode:indicatorMode});renderStrategy(strategy,provider);
    document.querySelector('#agent-editor-error').textContent='';
    editor.hidden=false;addButton.setAttribute('aria-expanded','true');
    window.Warrior?.aiSettings?.editing(id,provider);
    editor.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function saveEditor(){
    // Keep legacy stored asset metadata unchanged; the new battle owns its asset.
    const provider=safeProvider(selectedOption('model')),coin=safeCoin(catalog[editingId]?.coin||'BTC'),strategy=strategyFor(selectedOption('strategy'),provider),decision=currentDecisionConfig();
    const name=strategy.label;
    const minimumIndicators=Math.min(3,strategy.required.length||3);
    if(decision.indicators.length<minimumIndicators){document.querySelector('#agent-editor-error').textContent=`请至少保留 ${minimumIndicators} 项数据。`;window.Warrior?.aiSettings?.invalid();return}
    const decisionConfig={skinId:editingSkinId,decisionVariance:decision.variance,actionUrge:decision.actionUrge,emotionSensitivity:decision.emotionSensitivity,maxStakePct:decision.maxStakePct,allowAllIn:decision.allowAllIn,indicators:decision.indicators,indicatorMode:decision.indicatorMode};
    let id=editingId;
    if(!id){
      if(list.querySelectorAll('.ai-config').length>=maxCards){document.querySelector('#agent-editor-error').textContent='当前最多添加 16 位 Agent。';return}
      id=`agent-${Date.now().toString(36)}`;
      catalog[id]={name,provider,coin,strategy:strategy.key,...decisionConfig,icon:'',color:'blue-bg',action:`${coin} · 等待第一轮`,reason:strategy.description};
      createAgentCard({id,name,provider,skinId:decisionConfig.skinId,coin,strategy:strategy.key});refreshBudget();
      toast('Agent 已添加，可在 AI 策略中设置');
    }else{
      const item=catalog[id];Object.assign(item,{name,provider,coin,strategy:strategy.key,...decisionConfig,action:`${coin} · 等待第一轮`,reason:strategy.description});delete item.play;
      applyToCard(id,{name,provider,skinId:decisionConfig.skinId,coin,strategy:strategy.key});
      toast(`${name} Agent 设置已保存`);
    }
    persist();window.dispatchEvent(new CustomEvent('warrior-agent-skin-change',{detail:{agentId:id,skinId:decisionConfig.skinId}}));closeEditor();
    window.Warrior?.aiSettings?.saved(id);
  }

  function removeAgent(id,{silent=false}={}){
    const card=id?list.querySelector(`[data-ai-config="${CSS.escape(id)}"]`):null;
    if(!card||!catalog[id])return {ok:false,reason:'missing'};
    if(list.querySelectorAll('.ai-config').length<=1){
      const message='至少保留一位 Agent。';
      if(editingId===id)document.querySelector('#agent-editor-error').textContent=message;
      if(!silent)toast(message);
      return {ok:false,reason:'last-agent'};
    }
    const name=window.Warrior.agentLabel(catalog[id]);
    card.remove();
    if(defaultAgentIds.includes(id))deletedIds.add(id);
    delete catalog[id];
    persist();refreshBudget();
    if(editingId===id)closeEditor();
    if(!silent)toast(name+' 已删除');
    return {ok:true,name};
  }

  // Add new built-ins without selecting them or changing the user's existing lineup.
  for(const id of ['fengShui','diviner','czBrother','contrarian','showoff','firstLady']) {
    const savedCustomCount=stored.agents.filter(agent=>agent.custom&&!catalog[agent.id]).length;
    if(!deletedIds.has(id)&&!list.querySelector(`[data-ai-config="${id}"]`)&&catalog[id]&&list.querySelectorAll('.ai-config').length+savedCustomCount<maxCards) {
      const card=createAgentCard({id,...catalog[id]});
      card.querySelector('input').checked=false;card.classList.add('inactive');card.querySelector('.coin-trigger').disabled=true;
    }
  }
  deletedIds.forEach(id=>{
    list.querySelector(`[data-ai-config="${CSS.escape(id)}"]`)?.remove();
    delete catalog[id];
  });

  stored.agents.forEach(config=>{
    if(!config?.id||!config?.name)return;
    if(deletedIds.has(config.id))return;
    const migratedName=defaultAgentNames[config.id]&&config.name===providerNames[config.id]?defaultAgentNames[config.id]:config.name;
    const provider=safeProvider(config.provider),profile=strategyFor(config.strategy,provider);
    const maxStakePct=safeMaxStake(config.maxStakePct,profile),savedIndicators=safeIndicators(config.indicators,profile);
    const indicatorMode=safeIndicatorMode(config.indicatorMode,savedIndicators,profile),indicators=indicatorMode==='auto'?recommendedIndicators(profile):savedIndicators;
    const normalized={...config,name:migratedName,provider,skinId:safeSkin(config.skinId),coin:safeCoin(config.coin),strategy:profile.key,decisionVariance:safeVariance(config.decisionVariance,profile),actionUrge:safeActionUrge(config.actionUrge,profile),emotionSensitivity:safeEmotion(config.emotionSensitivity,profile),maxStakePct,allowAllIn:profile.allowAllIn&&maxStakePct===100&&Boolean(config.allowAllIn??profile.allowAllIn),indicators,indicatorMode};delete normalized.play;
    if(catalog[normalized.id]){
      Object.assign(catalog[normalized.id],normalized);applyToCard(normalized.id,normalized);
    }else if(normalized.custom){
      catalog[normalized.id]={...normalized,icon:'',color:'blue-bg',action:`${normalized.coin} · 等待第一轮`,reason:profile.description};
      createAgentCard(normalized);
    }
  });

  persist();
  function bindEditorOptions(){strategyOptions.querySelectorAll('[data-agent-strategy]').forEach(button=>button.onclick=()=>{
    const value=button.dataset.agentStrategy;
    setOption('strategy',value);
    editingSkinId=skinRegistry?.resolveId({strategy:value,provider:editingProvider}) || 'anime-female';
    renderStrategyAvatars();
    applyProfilePreset(value);
  })}
  bindEditorOptions();
  window.addEventListener('warrior-skins-change',renderStrategyAvatars);
  document.querySelector('#decision-variance').oninput=renderDecisionConfig;
  document.querySelector('#action-urge').oninput=renderDecisionConfig;
  document.querySelector('#emotion-sensitivity').oninput=renderDecisionConfig;
  document.querySelector('#max-stake').oninput=renderDecisionConfig;
  document.querySelector('#agent-all-in').onchange=renderDecisionConfig;
  indicatorAuto.onchange=()=>{
    const profile=strategyFor(selectedOption('strategy'),selectedOption('model'));
    setIndicators(indicatorAuto.checked?recommendedIndicators(profile):currentDecisionConfig().indicators,{mode:indicatorAuto.checked?'auto':'custom'});
    if(!indicatorAuto.checked)indicatorAdvanced.open=true;
    renderDecisionConfig();
  };
  editor.querySelectorAll('.agent-indicator-grid input').forEach(input=>input.onchange=()=>{document.querySelector('#agent-editor-error').textContent='';renderDecisionConfig()});
  document.querySelector('#copy-agent-prompt').onclick=async()=>{
    const prompt=buildPrompt();
    try{await navigator.clipboard.writeText(prompt);toast('提示词已复制')}
    catch{toast('复制失败，请手动选择提示词')}
  };
  window.addEventListener('warrior-language-change',renderDecisionConfig);
  addButton.onclick=()=>editor.hidden?openEditor():closeEditor();
  document.querySelector('#close-agent-editor').onclick=closeEditor;
  document.querySelector('#cancel-agent-editor').onclick=closeEditor;
  document.querySelector('#save-agent').onclick=saveEditor;
  window.agentSetup={open:openEditor,close:closeEditor,persist,remove:removeAgent,getAgents,buildPrompt:config=>buildPrompt(config),sync:persist,persistSkins:()=>persist({syncStrategies:false}),setNewModel(provider){if(editingId!==null||editor.hidden)return;editingProvider=safeProvider(provider);renderDecisionConfig()}};
  list.querySelectorAll('.ai-config').forEach(bindDynamicCheckbox);
  list.querySelectorAll('.agent-strategy').forEach(element=>element.remove());
  skinRegistry?.applyCatalog(catalog);
  refreshBudget();
})();
