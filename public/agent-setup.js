(() => {
  const list=document.querySelector('.ai-config-list');
  const editor=document.querySelector('#agent-editor');
  const addButton=document.querySelector('#add-coin');
  if(!list||!editor||!addButton)return;

  const storageKey='warrior-agent-config-v1';
  const catalog=window.modelCatalog;
  const providerNames={claude:'Claude',gpt:'GPT',deepseek:'DeepSeek'};
  const defaultAgentNames={claude:'狐火术师',gpt:'星环机甲',deepseek:'深海灵兽'};
  const defaultAgentIds=Object.keys(defaultAgentNames);
  const providerStrategies={claude:'aggressive',gpt:'smart',deepseek:'conservative'};
  const strategyProfiles={
    aggressive:{key:'aggressive',label:'激进策略',description:'更积极捕捉短线机会，接受更高波动。'},
    smart:{key:'smart',label:'智能策略',description:'综合多种信号，动态调整判断。'},
    conservative:{key:'conservative',label:'保守策略',description:'优先控制风险，只在信号明确时出手。'}
  };
  let editingId=null;

  const gearMarkup='<span class="gear-glyph" aria-hidden="true">⚙</span>';
  const safeProvider=value=>Object.hasOwn(providerNames,value)?value:'gpt';
  const safeCoin=value=>value==='ETH'?'ETH':'BTC';
  const safeStrategy=(value,provider='gpt')=>Object.hasOwn(strategyProfiles,value)?value:providerStrategies[safeProvider(provider)];
  const strategyFor=(value,provider)=>strategyProfiles[safeStrategy(value,provider)];

  function setAvatar(element,provider){
    element.classList.remove('avatar-claude','avatar-gpt','avatar-deepseek');
    element.classList.add(`avatar-${safeProvider(provider)}`);
  }

  function setOption(group,value){
    editor.querySelectorAll(`[data-agent-${group}]`).forEach(button=>{
      const selected=button.dataset[`agent${group[0].toUpperCase()}${group.slice(1)}`]===value;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }

  function selectedOption(group){
    const selected=editor.querySelector(`[data-agent-${group}].selected`);
    return selected?.dataset[`agent${group[0].toUpperCase()}${group.slice(1)}`];
  }

  function renderStrategy(strategy,provider){
    const profile=strategyFor(strategy,provider),preview=document.querySelector('#agent-strategy-preview');
    preview.dataset.strategy=profile.key;
    preview.querySelector('strong').textContent=profile.label;
    preview.querySelector('small').textContent=profile.description;
  }

  function refreshBudget(){
    document.querySelector('#budget')?.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function bindDynamicCheckbox(card){
    const checkbox=card.querySelector('input[name="models"]');
    checkbox.addEventListener('change',()=>{
      const enabled=checkbox.checked;
      card.classList.toggle('inactive',!enabled);
      const legacy=card.querySelector('.coin-trigger');
      if(legacy)legacy.disabled=!enabled;
      refreshBudget();
    });
  }

  function bindSettings(card){
    const button=card.querySelector('[data-agent-settings]');
    button.onclick=()=>openEditor(card.dataset.aiConfig);
  }

  function createAgentCard(config){
    const card=document.createElement('div');
    card.className='ai-config';
    card.dataset.aiConfig=config.id;
    card.dataset.provider=safeProvider(config.provider);

    const choice=document.createElement('label');
    choice.className='ai-choice';
    choice.setAttribute('aria-label',`选择 ${config.name}`);
    const checkbox=document.createElement('input');
    checkbox.type='checkbox';checkbox.name='models';checkbox.value=config.id;checkbox.checked=true;
    const avatar=document.createElement('span');
    avatar.className=`ai-avatar avatar-${safeProvider(config.provider)}`;avatar.setAttribute('aria-hidden','true');
    const name=document.createElement('strong');name.textContent=config.name;
    const strategy=document.createElement('small');strategy.className='agent-strategy';strategy.textContent=strategyFor(config.strategy,config.provider).label;
    choice.append(checkbox,avatar,name,strategy);

    const settings=document.createElement('button');
    settings.type='button';settings.className='agent-settings-button';settings.dataset.agentSettings=config.id;
    settings.setAttribute('aria-label',`设置 ${config.name} Agent`);settings.innerHTML=gearMarkup;

    const legacy=document.createElement('button');
    legacy.type='button';legacy.className='coin-trigger legacy-coin-trigger';legacy.dataset.coinTrigger=config.id;legacy.dataset.coin=config.coin;
    legacy.setAttribute('aria-label',`${config.name} 币种 ${config.coin}`);legacy.hidden=true;
    const coin=document.createElement('b');coin.textContent=config.coin;legacy.append(coin);
    card.append(choice,settings,legacy);list.append(card);
    bindDynamicCheckbox(card);bindSettings(card);
    return card;
  }

  function applyToCard(id,config){
    const card=list.querySelector(`[data-ai-config="${CSS.escape(id)}"]`);if(!card)return;
    card.querySelector('.ai-choice').setAttribute('aria-label',`选择 ${config.name}`);
    card.querySelector('.ai-choice strong').textContent=config.name;
    let strategy=card.querySelector('.agent-strategy');
    if(!strategy){strategy=document.createElement('small');strategy.className='agent-strategy';card.querySelector('.ai-choice').append(strategy)}
    strategy.textContent=strategyFor(config.strategy,config.provider).label;
    card.dataset.provider=safeProvider(config.provider);
    setAvatar(card.querySelector('.ai-avatar'),config.provider);
    const settings=card.querySelector('[data-agent-settings]');settings.setAttribute('aria-label',`设置 ${config.name} Agent`);
    const legacy=card.querySelector('.coin-trigger');legacy.dataset.coin=config.coin;legacy.querySelector('b').textContent=config.coin;legacy.setAttribute('aria-label',`${config.name} 币种 ${config.coin}`);
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

  function persist(){
    const agents=[...list.querySelectorAll('.ai-config')].map(card=>{
      const id=card.dataset.aiConfig,item=catalog[id]||{};
      const provider=safeProvider(item.provider||id);
      return {id,name:item.name||id,provider,coin:safeCoin(card.querySelector('.coin-trigger')?.dataset.coin||item.coin),strategy:safeStrategy(item.strategy,provider),custom:!defaultAgentIds.includes(id)};
    });
    try{localStorage.setItem(storageKey,JSON.stringify({version:2,agents,deleted:[...deletedIds]}))}catch{}
  }

  function closeEditor(){
    editor.hidden=true;editingId=null;addButton.setAttribute('aria-expanded','false');
    document.querySelector('#agent-editor-error').textContent='';
  }

  function openEditor(id=null){
    editingId=id;
    const isNew=!id,item=isNew?{}:(catalog[id]||{}),card=id?list.querySelector(`[data-ai-config="${CSS.escape(id)}"]`):null;
    const nextNumber=String(list.querySelectorAll('.ai-config').length+1).padStart(2,'0');
    const name=isNew?`Agent ${nextNumber}`:(item.name||id);
    const provider=safeProvider(item.provider||(isNew?'gpt':id));
    const coin=safeCoin(card?.querySelector('.coin-trigger')?.dataset.coin||item.coin||'BTC');
    const strategy=safeStrategy(item.strategy,provider);
    document.querySelector('#agent-editor-title').textContent=isNew?'添加 AI Agent':`设置 ${name} Agent`;
    document.querySelector('#agent-name').value=name;
    document.querySelector('#save-agent').textContent=isNew?'添加 Agent':'保存设置';
    setOption('model',provider);setOption('strategy',strategy);setOption('coin',coin);renderStrategy(strategy,provider);
    document.querySelector('#agent-editor-error').textContent='';
    editor.hidden=false;addButton.setAttribute('aria-expanded','true');
    editor.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function saveEditor(){
    const name=document.querySelector('#agent-name').value.trim().replace(/[<>]/g,'');
    if(!name){document.querySelector('#agent-editor-error').textContent='请输入 Agent 名称。';return}
    const provider=safeProvider(selectedOption('model')),coin=safeCoin(selectedOption('coin')),strategy=strategyFor(selectedOption('strategy'),provider);
    let id=editingId;
    if(!id){
      if(list.querySelectorAll('.ai-config').length>=6){document.querySelector('#agent-editor-error').textContent='当前最多添加 6 位 Agent。';return}
      id=`agent-${Date.now().toString(36)}`;
      catalog[id]={name,provider,coin,strategy:strategy.key,icon:'',color:'blue-bg',action:`${coin} · 等待第一轮`,reason:strategy.description};
      createAgentCard({id,name,provider,coin,strategy:strategy.key});refreshBudget();
      toast(`${name} 已添加，可点击齿轮继续设置`);
    }else{
      const item=catalog[id];Object.assign(item,{name,provider,coin,strategy:strategy.key,action:`${coin} · 等待第一轮`,reason:strategy.description});delete item.play;
      applyToCard(id,{name,provider,coin,strategy:strategy.key});
      toast(`${name} Agent 设置已保存`);
    }
    persist();closeEditor();
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
    const name=catalog[id].name||'Agent';
    card.remove();
    if(defaultAgentIds.includes(id))deletedIds.add(id);
    delete catalog[id];
    persist();refreshBudget();
    if(editingId===id)closeEditor();
    if(!silent)toast(name+' 已删除');
    return {ok:true,name};
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
    const normalized={...config,name:migratedName,provider,coin:safeCoin(config.coin),strategy:profile.key};delete normalized.play;
    if(catalog[normalized.id]){
      Object.assign(catalog[normalized.id],normalized);applyToCard(normalized.id,normalized);
    }else if(normalized.custom){
      catalog[normalized.id]={...normalized,icon:'',color:'blue-bg',action:`${normalized.coin} · 等待第一轮`,reason:profile.description};
      createAgentCard(normalized);
    }
  });

  persist();
  list.querySelectorAll('.ai-config').forEach(bindSettings);
  editor.querySelectorAll('[data-agent-model],[data-agent-strategy],[data-agent-coin]').forEach(button=>button.onclick=()=>{
    const group=button.hasAttribute('data-agent-model')?'model':button.hasAttribute('data-agent-strategy')?'strategy':'coin';
    const value=button.dataset[`agent${group[0].toUpperCase()}${group.slice(1)}`];
    setOption(group,value);if(group==='strategy')renderStrategy(value,selectedOption('model'));
  });
  addButton.onclick=()=>editor.hidden?openEditor():closeEditor();
  document.querySelector('#close-agent-editor').onclick=closeEditor;
  document.querySelector('#cancel-agent-editor').onclick=closeEditor;
  document.querySelector('#save-agent').onclick=saveEditor;
  document.querySelector('#agent-name').oninput=()=>{document.querySelector('#agent-editor-error').textContent=''};
  window.agentSetup={open:openEditor,close:closeEditor,persist,remove:removeAgent};
  refreshBudget();
})();
