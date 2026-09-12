(() => {
  const arena=document.querySelector('#orb-arena');
  if(!arena)return;
  const skinDefaults={
    claude:{strategy:'aggressive',strategyLabel:'激进策略',coin:'BTC',direction:'看涨',particles:['#fff19b','#ff9d74']},
    gpt:{strategy:'smart',strategyLabel:'智能策略',coin:'BTC',direction:'看涨',particles:['#9ff8ff','#a69cff']},
    deepseek:{strategy:'conservative',strategyLabel:'保守策略',coin:'BTC',direction:'看空',particles:['#a9ecff','#f47db5']}
  };
  const strategyLabels={aggressive:'激进策略',smart:'智能策略',conservative:'保守策略'};
  const safeProvider=value=>Object.hasOwn(skinDefaults,value)?value:'gpt';
  const safeStrategy=(value,provider)=>Object.hasOwn(strategyLabels,value)?value:skinDefaults[safeProvider(provider)].strategy;
  const meta={
    claude:{name:'狐火术师',provider:'claude',...skinDefaults.claude},
    gpt:{name:'星环机甲',provider:'gpt',...skinDefaults.gpt},
    deepseek:{name:'深海灵兽',provider:'deepseek',...skinDefaults.deepseek}
  };
  const initial={round:12,maxRounds:20,roundMode:'fixed',market:'Binance Prediction',startTotal:30,ai:{
    claude:{balance:11.64,base:10,active:true,coin:'ETH',direction:'看涨',expression:'waiting'},
    gpt:{balance:10.92,base:10,active:true,coin:'BTC',direction:'看涨',expression:'waiting'},
    deepseek:{balance:9.90,base:10,active:true,coin:'ETH',direction:'看空',expression:'waiting'}
  }};
  Object.keys(meta).forEach(id=>{
    if(window.modelCatalog?.[id])return;
    delete meta[id];delete initial.ai[id];
    arena.querySelector(`[data-orb="${CSS.escape(id)}"]`)?.remove();
    document.querySelector(`.model-card[data-model="${CSS.escape(id)}"]`)?.remove();
    document.querySelector(`[data-test-model="${CSS.escape(id)}"]`)?.remove();
  });
  if(!Object.keys(meta).length){
    Object.entries(window.modelCatalog||{}).slice(0,3).forEach(([id,item])=>{
      const provider=safeProvider(item.provider),skin=skinDefaults[provider],strategy=safeStrategy(item.strategy,provider);
      meta[id]={name:item.name||id,provider,...skin,strategy,strategyLabel:strategyLabels[strategy]};
      initial.ai[id]={balance:10,base:10,active:true,coin:item.coin||skin.coin,direction:skin.direction,expression:'waiting'};
    });
  }
  initial.startTotal=Object.values(initial.ai).reduce((sum,item)=>sum+item.base,0);
  let baseline=structuredClone(initial),state=structuredClone(initial),selected=Object.keys(meta)[0]||'',busy=false,isPaused=false,remaining=300;
  const eventLog=[];
  let ids=Object.keys(meta);const orbs={};
  const clamp=(min,value,max)=>Math.max(min,Math.min(max,value));
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const activeIds=()=>ids.filter(id=>state.ai[id].active);
  const signed=value=>`${value>=0?'+':'−'}${Math.abs(value).toFixed(2)}U`;
  const sizeFor=value=>arena.clientWidth<420?clamp(68,54+value*3.25,124):clamp(78,62+value*3.8,158);
  const trash=document.querySelector('#arena-trash');
  let dragState=null;
  const pointInside=(rect,x,y,padding=0)=>x>=rect.left-padding&&x<=rect.right+padding&&y>=rect.top-padding&&y<=rect.bottom+padding;

  function bindAgentDrag(orb){
    if(orb.dataset.dragBound)return;
    orb.dataset.dragBound='true';
    orb.addEventListener('pointerdown',event=>{
      const id=orb.dataset.orb;
      if(busy||!state.ai[id]?.active||(event.button!==undefined&&event.button!==0))return;
      const rect=orb.getBoundingClientRect();
      dragState={id,orb,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,dx:0,dy:0,started:false,targetId:null,dropType:null,homeX:(rect.left+rect.right)/2,homeY:(rect.top+rect.bottom)/2,lastTrail:0,ghost:null,previousMessage:document.querySelector('#arena-message').textContent};
      try{orb.setPointerCapture(event.pointerId)}catch{}
      event.preventDefault();
    });
    orb.addEventListener('pointermove',event=>{
      if(!dragState||dragState.orb!==orb||dragState.pointerId!==event.pointerId)return;
      dragState.dx=event.clientX-dragState.startX;dragState.dy=event.clientY-dragState.startY;
      if(!dragState.started&&Math.hypot(dragState.dx,dragState.dy)<7)return;
      if(!dragState.started)activateDrag();
      const tilt=clamp(-11,(event.clientX-dragState.lastX)*.72,11);dragState.lastX=event.clientX;
      orb.style.setProperty('--drag-x',`${dragState.dx}px`);orb.style.setProperty('--drag-y',`${dragState.dy}px`);orb.style.setProperty('--drag-tilt',`${tilt}deg`);
      if(performance.now()-dragState.lastTrail>42){spawnDragTrail(event.clientX,event.clientY,dragState.id);dragState.lastTrail=performance.now()}
      updateDropTarget(event.clientX,event.clientY);
      event.preventDefault();
    });
    const finish=event=>{
      if(!dragState||dragState.orb!==orb||dragState.pointerId!==event.pointerId)return;
      const current=dragState;
      if(!current.started){releaseDrag();return}
      if(event.type==='pointercancel'){void returnDraggedAgent(current);return}
      if(current.dropType==='trash'){void discardDraggedAgent(current);return}
      if(current.dropType==='feed'&&current.targetId){
        const source=current.id,target=current.targetId;
        releaseDrag({keepBusy:true,restoreMessage:false});
        void devour(target,source,true,true);
        return;
      }
      void returnDraggedAgent(current);
    };
    orb.addEventListener('pointerup',finish);orb.addEventListener('pointercancel',finish);
  }

  function activateDrag(){
    if(!dragState)return;
    dragState.started=true;setBusy(true);
    arena.classList.add('is-agent-dragging');document.body.classList.add('is-orb-dragging');
    arena.dataset.dragSource=dragState.id;dragState.orb.classList.add('is-dragging');dragState.orb.setAttribute('aria-grabbed','true');
    const ghost=document.createElement('span');ghost.className='orb-drag-ghost';ghost.dataset.skin=meta[dragState.id].provider;ghost.style.left=`${state.ai[dragState.id].x}%`;ghost.style.top=`${state.ai[dragState.id].y}%`;ghost.style.setProperty('--ghost-size',`${dragState.orb.getBoundingClientRect().width}px`);arena.append(ghost);dragState.ghost=ghost;
    activeIds().filter(id=>id!==dragState.id).forEach(id=>orbs[id]?.classList.add('is-feed-target'));
    trash?.setAttribute('aria-hidden','false');
    document.querySelector('#arena-message').textContent=`拖动 ${meta[dragState.id].name}：喂给另一位 Agent，或丢进垃圾桶`;
  }

  function spawnDragTrail(clientX,clientY,id){
    const rect=arena.getBoundingClientRect(),trail=document.createElement('i'),colors=meta[id]?.particles||['#e8f879','#9f8cff'];
    trail.className='orb-drag-trail';trail.style.left=`${clientX-rect.left}px`;trail.style.top=`${clientY-rect.top}px`;trail.style.setProperty('--trail-color',colors[Math.random()>.5?0:1]);trail.style.setProperty('--trail-x',`${(Math.random()-.5)*28}px`);trail.style.setProperty('--trail-y',`${12+Math.random()*24}px`);arena.append(trail);setTimeout(()=>trail.remove(),620);
  }

  function updateDropTarget(x,y){
    if(!dragState?.started)return;
    const overTrash=trash&&pointInside(trash.getBoundingClientRect(),x,y,6);
    let targetId=null,nearest=Infinity;
    if(!overTrash){
      activeIds().filter(id=>id!==dragState.id).forEach(id=>{
        const target=orbs[id],rect=target?.getBoundingClientRect();if(!rect)return;
        const distance=Math.hypot(x-(rect.left+rect.right)/2,y-(rect.top+rect.bottom)/2);
        if(distance<=Math.max(45,Math.max(rect.width,rect.height)*.56)&&distance<nearest){nearest=distance;targetId=id}
      });
    }
    dragState.dropType=overTrash?'trash':targetId?'feed':null;dragState.targetId=targetId;
    trash?.classList.toggle('is-drop-ready',Boolean(overTrash));
    activeIds().filter(id=>id!==dragState.id).forEach(id=>orbs[id]?.classList.toggle('is-feed-ready',id===targetId));
    const sourceName=meta[dragState.id].name,message=document.querySelector('#arena-message');
    if(overTrash)message.textContent=`松开，永久删除 ${sourceName}`;
    else if(targetId)message.textContent=`松开，把 ${sourceName} 喂给 ${meta[targetId].name}`;
    else message.textContent=`拖动 ${sourceName}：喂给另一位 Agent，或丢进垃圾桶`;
  }

  function releaseDrag({keepBusy=false,restoreMessage=true}={}){
    const current=dragState;if(!current)return null;
    current.orb.classList.remove('is-dragging');current.orb.style.removeProperty('--drag-x');current.orb.style.removeProperty('--drag-y');current.orb.style.removeProperty('--drag-tilt');current.orb.setAttribute('aria-grabbed','false');current.ghost?.remove();
    arena.classList.remove('is-agent-dragging');delete arena.dataset.dragSource;document.body.classList.remove('is-orb-dragging');
    trash?.classList.remove('is-drop-ready');trash?.setAttribute('aria-hidden','true');
    Object.values(orbs).forEach(orb=>orb?.classList.remove('is-feed-target','is-feed-ready'));
    if(restoreMessage)document.querySelector('#arena-message').textContent=current.previousMessage;
    dragState=null;if(!keepBusy)setBusy(false);return current;
  }

  async function returnDraggedAgent(current){
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,animation=current.orb.animate([
      {transform:`translate(calc(-50% + ${current.dx}px),calc(-50% + ${current.dy}px)) scale(1.08) rotate(var(--drag-tilt,0deg))`},
      {transform:'translate(-50%,-50%) scale(.94) rotate(-3deg)',offset:.72},
      {transform:'translate(-50%,-50%) scale(1) rotate(0deg)'}
    ],{duration:reduced?1:430,easing:'cubic-bezier(.2,.9,.25,1.25)',fill:'forwards'});
    releaseDrag({keepBusy:true,restoreMessage:false});await animation.finished.catch(()=>{});animation.cancel();
    document.querySelector('#arena-message').textContent=current.previousMessage;setBusy(false);
  }

  async function discardDraggedAgent(current){
    const {id,orb}=current,name=meta[id]?.name||'Agent';
    if(activeIds().length<=1){
      releaseDrag();addEvent('竞技场至少保留一位 Agent。');toast('竞技场至少保留一位 Agent。');return;
    }
    const removed=window.agentSetup?.remove(id,{silent:true});
    if(!removed?.ok){releaseDrag();addEvent('删除失败，请重试。');return}
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,trashRect=trash.getBoundingClientRect();
    const targetX=(trashRect.left+trashRect.right)/2-current.homeX,targetY=(trashRect.top+trashRect.bottom)/2-current.homeY;
    const animation=orb.animate([
      {transform:`translate(calc(-50% + ${current.dx}px),calc(-50% + ${current.dy}px)) scale(1.08)`,opacity:1,filter:'brightness(1.12)'},
      {transform:`translate(calc(-50% + ${targetX}px),calc(-50% + ${targetY}px)) scale(.08) rotate(320deg)`,opacity:0,filter:'blur(8px) saturate(.35)'}
    ],{duration:reduced?1:680,easing:'cubic-bezier(.55,.02,.72,.35)',fill:'forwards'});
    trash.classList.add('is-consuming');releaseDrag({keepBusy:true,restoreMessage:false});
    await animation.finished.catch(()=>{});animation.cancel();trash.classList.remove('is-consuming');
    removeAgentFromArena(id);addEvent(`${name} 被扔进垃圾桶，已从阵容删除`);toast(`${name} 已从竞技场删除`);setBusy(false);
  }

  function syncAgentMeta(id){
    const catalog=window.modelCatalog?.[id]||{},provider=safeProvider(catalog.provider||id),skin=skinDefaults[provider];
    const strategy=safeStrategy(catalog.strategy,provider);
    meta[id]={name:catalog.name||meta[id]?.name||id,provider,strategy,strategyLabel:strategyLabels[strategy],coin:catalog.coin||skin.coin,direction:skin.direction,particles:skin.particles};
    return meta[id];
  }
  function ensureAgentDom(id){
    const item=syncAgentMeta(id),provider=item.provider;
    let orb=arena.querySelector(`[data-orb="${CSS.escape(id)}"]`);
    if(!orb){
      orb=document.createElement('div');orb.className='orb';orb.dataset.orb=id;
      orb.innerHTML='<span class="orb-aura" aria-hidden="true"></span><span class="orb-orbit" aria-hidden="true"><i></i><i></i><b></b></span><div class="orb-body"><i class="orb-gloss"></i><span class="orb-mascot" aria-hidden="true"><i></i><i></i><b></b></span><span class="orb-expression" aria-hidden="true"></span><span class="orb-balance"></span></div><span class="orb-drop-label">松开投喂</span>';
      arena.insertBefore(orb,arena.querySelector('#arena-message'));
    }
    if(!orb.querySelector('.orb-drop-label')){const label=document.createElement('span');label.className='orb-drop-label';label.textContent='松开投喂';orb.append(label)}
    orb.dataset.skin=provider;orb.setAttribute('aria-label',`拖动 ${item.name}，可投喂给另一位 Agent 或丢进垃圾桶`);orb.setAttribute('aria-grabbed','false');orbs[id]=orb;if(!ids.includes(id))ids.push(id);bindAgentDrag(orb);

    let card=document.querySelector(`.model-card[data-model="${CSS.escape(id)}"]`);
    if(!card){
      card=document.createElement('button');card.className='model-card card';card.dataset.model=id;
      card.innerHTML='<div class="model-top"><span class="model-ai-avatar" aria-hidden="true"></span><div><strong></strong><span class="model-strategy"></span></div><span class="rank"></span></div><div class="model-value">0.00 <span>USDT</span><small class="positive">0.00%</small></div><div class="model-bottom single-action"><span>决策 ↗</span></div>';
      document.querySelector('.model-grid').append(card);
    }
    card.querySelector('.model-ai-avatar').className=`model-ai-avatar avatar-${provider}`;
    card.querySelector('.model-top strong').textContent=item.name;
    let strategy=card.querySelector('.model-strategy');if(!strategy){strategy=document.createElement('span');strategy.className='model-strategy';card.querySelector('.model-top strong').after(strategy)}strategy.textContent=item.strategyLabel;
    card.querySelector('.rank').textContent=String([...document.querySelectorAll('.model-card')].indexOf(card)+1).padStart(2,'0');
    card.onclick=()=>window.openModelDetail?.(id);

    const targets=document.querySelector('.test-targets');let testButton=targets.querySelector(`[data-test-model="${CSS.escape(id)}"]`);
    if(!testButton){testButton=document.createElement('button');testButton.type='button';testButton.dataset.testModel=id;testButton.textContent=item.name;testButton.setAttribute('aria-pressed','false');testButton.onclick=()=>{selected=id;renderAll()};targets.append(testButton)}
    else testButton.textContent=item.name;
  }
  function assignPositions(){
    const active=activeIds(),xs={1:[50],2:[34,66],3:[18,50,82],4:[14,38,62,86],5:[10,30,50,70,90],6:[9,25,42,58,75,91]}[active.length]||[50],ys={1:[50],2:[45,57],3:[44,58,42],4:[39,61,39,61],5:[38,61,39,61,38],6:[38,61,38,61,38,61]}[active.length]||[50];
    active.forEach((id,index)=>Object.assign(state.ai[id],{x:xs[index]??50,y:ys[index]??50}));
  }
  function syncCatalog(id){
    const item=state.ai[id],catalog=window.modelCatalog?.[id];
    if(!catalog)return;
    catalog.coin=item.coin;catalog.action=state.round===0?`${item.coin} · 等待第一轮`:`${item.coin} ${item.direction}`;
    catalog.reason=`本轮选择 ${item.coin}，判断${item.direction}。`;
  }
  function renderPage(){
    const active=activeIds(),total=active.reduce((sum,id)=>sum+state.ai[id].balance,0),gain=total-state.startTotal,rate=state.startTotal?gain/state.startTotal*100:0;
    const totalParts=total.toFixed(2).split('.');document.querySelector('#total').innerHTML=`${totalParts[0]}<span>.${totalParts[1]}</span>`;
    document.querySelector('#gain').innerHTML=`${gain>=0?'＋':'−'}${Math.abs(gain).toFixed(2)} <span>（${Math.abs(rate).toFixed(2)}%）</span>`;
    document.querySelector('#gain').classList.toggle('negative',gain<0);
    const openEnded=state.roundMode==='until-loss',roundInfo=document.querySelector('.round-info'),roundProgress=document.querySelector('#round-progress');
    document.querySelector('#round-text').innerHTML=openEnded?`${state.round} <span>/ 亏完为止</span>`:`${state.round} <span>/ ${state.maxRounds} 轮</span>`;
    roundInfo.classList.toggle('is-open-ended',openEnded);roundProgress.style.width=openEnded?'42%':`${clamp(0,state.round/state.maxRounds*100,100)}%`;
    document.querySelector('#active-market').textContent=state.market||'Binance Prediction';
    document.querySelector('#active-assets').textContent=[...new Set(active.map(id=>state.ai[id].coin))].sort().join(' · ');
    document.querySelector('.section-heading>span').textContent=`${active.length} 位 AI`;
    arena.setAttribute('aria-label',`AI 球体竞技场：${active.map(id=>`${meta[id].name} ${state.ai[id].balance.toFixed(2)} USDT`).join('，')}`);
  }
  function renderCard(id){
    const item=state.ai[id],card=document.querySelector(`.model-card[data-model="${id}"]`);
    if(!item||!card)return;
    const wasEaten=!item.active&&item.eatenBy;
    card.hidden=!item.active&&!wasEaten;card.classList.toggle('orb-card-eliminated',Boolean(wasEaten));
    const rate=item.base?(item.balance-item.base)/item.base*100:0;
    card.querySelector('.model-value').innerHTML=`${item.balance.toFixed(2)} <span>USDT</span><small class="${rate<0?'negative':'positive'}">${rate>=0?'＋':'−'}${Math.abs(rate).toFixed(2)}%</small>`;
    syncCatalog(id);
  }
  function pulse(id,kind){
    const orb=orbs[id];if(!orb)return;const className=kind==='gain'?'is-gaining':'is-losing';orb.classList.remove('is-gaining','is-losing');void orb.offsetWidth;orb.classList.add(className);setTimeout(()=>orb.classList.remove(className),1180);particles(id,kind);
  }
  function particles(id,kind='gain'){
    const orb=orbs[id];if(!orb)return;
    const colors=kind==='loss'?['#f2a0bb','#bf7a9e']:meta[id].particles;
    for(let i=0;i<14;i++){const p=document.createElement('i');p.className='orb-particle';const angle=Math.PI*2*i/14+(Math.random()-.5)*.18,distance=38+Math.random()*42;p.style.setProperty('--dx',`${Math.cos(angle)*distance}px`);p.style.setProperty('--dy',`${Math.sin(angle)*distance}px`);p.style.setProperty('--particle-color',colors[i%colors.length]);orb.append(p);setTimeout(()=>p.remove(),1120)}
  }
  function renderAll(effect){
    ids.forEach(id=>{
      const item=state.ai[id],orb=orbs[id];if(!item||!orb)return;orb.hidden=!item.active;orb.classList.remove('is-eaten','is-threatened','is-hunting','is-devouring');
      if(item.active){orb.dataset.stage=item.balance>=18?'awakened':item.balance<5?'seed':'normal';orb.dataset.expression=item.expression||'waiting';orb.style.setProperty('--orb-size',`${sizeFor(item.balance)}px`);orb.style.setProperty('--x',`${item.x}%`);orb.style.setProperty('--y',`${item.y}%`);orb.style.zIndex=String(3+Math.round(item.balance));orb.querySelector('.orb-balance').textContent=`${item.balance.toFixed(2)}U`}
      renderCard(id);
    });
    renderPage();
    document.querySelectorAll('[data-test-model]').forEach(button=>{const active=Boolean(state.ai[button.dataset.testModel]?.active);button.disabled=busy||!active;button.classList.toggle('selected',button.dataset.testModel===selected&&active);button.setAttribute('aria-pressed',String(button.dataset.testModel===selected&&active))});
    document.querySelectorAll('[data-test-expression]').forEach(button=>{const active=state.ai[selected]?.active,isCurrent=state.ai[selected]?.expression===button.dataset.testExpression;button.disabled=busy||!active;button.classList.toggle('selected',Boolean(isCurrent));button.setAttribute('aria-pressed',String(Boolean(isCurrent)))});
    if(effect)pulse(effect.id,effect.kind);
  }
  function addEvent(text){
    document.querySelector('#arena-message').textContent=text;eventLog.unshift({text,round:state.round,at:Date.now()});if(eventLog.length>100)eventLog.pop();
  }
  function setBusy(value){busy=value;document.querySelectorAll('[data-test-action],[data-test-model],[data-test-expression]').forEach(button=>button.disabled=value||Boolean(button.dataset.testModel&&!state.ai[button.dataset.testModel].active)||Boolean(button.dataset.testExpression&&!state.ai[selected]?.active))}
  function chooseFallback(){if(state.ai[selected]?.active)return;selected=activeIds()[0]||selected}
  function setExpression(id,expression){
    if(busy||!state.ai[id]?.active)return;state.ai[id].expression=expression;renderAll();addEvent(expression==='betting'?`${meta[id].name} 正在下注，进入战斗状态`:`${meta[id].name} 正在等待五分钟结算`);
  }
  function applyDelta(id,delta,advance=true){
    if(busy||!state.ai[id]?.active)return;
    if(advance)state.round+=1;const item=state.ai[id];item.balance=clamp(.5,item.balance+delta,60);item.direction=delta>=0?'看涨':'看空';item.expression=delta>=0?'win':'loss';document.querySelector('#run-status').textContent='进行中';renderAll({id,kind:delta>=0?'gain':'loss'});addEvent(`第 ${state.round} 轮 · ${meta[id].name} ${delta>=0?'盈利':'亏损'} ${signed(delta)}`);remaining=300;setTimeout(checkDevour,650);
  }
  function randomSettlement(){
    if(busy||isPaused)return;state.round+=1;document.querySelector('#run-status').textContent='进行中';for(const id of activeIds()){const item=state.ai[id],delta=Number((Math.random()*4.2-1.8).toFixed(2));item.balance=clamp(.5,item.balance+delta,60);item.coin=Math.random()>.5?'BTC':'ETH';item.direction=Math.random()>.5?'看涨':'看空';item.expression=delta>=0?'win':'loss';pulse(id,delta>=0?'gain':'loss')}
    renderAll();addEvent(`第 ${state.round} 轮 · 随机测试结算完成`);remaining=300;setTimeout(checkDevour,700);
  }
  function checkDevour(){
    if(busy)return;const active=activeIds();if(active.length<2)return;const sorted=[...active].sort((a,b)=>state.ai[b].balance-state.ai[a].balance),predator=sorted[0],victim=sorted.at(-1);if(state.ai[predator].balance>=state.ai[victim].balance*1.8)devour(predator,victim);
  }
  function forceDevour(){
    if(busy)return;chooseFallback();const predator=selected,victim=activeIds().filter(id=>id!==predator).sort((a,b)=>state.ai[a].balance-state.ai[b].balance)[0];if(!victim){addEvent('只剩一位 AI，无法继续吞噬');return}state.ai[predator].expression='betting';state.ai[victim].expression='waiting';setBusy(true);const needed=state.ai[victim].balance*1.85;if(state.ai[predator].balance<needed){state.ai[predator].balance=needed;renderAll({id:predator,kind:'gain'})}setTimeout(()=>devour(predator,victim,true),window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?30:720);
  }
  async function devour(predator,victim,alreadyBusy=false,removeVictim=false){
    if((busy&&!alreadyBusy)||!state.ai[predator]?.active||!state.ai[victim]?.active)return;if(!alreadyBusy)setBusy(true);
    const hunter=orbs[predator],target=orbs[victim],start=state.ai[predator],end=state.ai[victim],hunterName=meta[predator].name,victimName=meta[victim].name,reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;start.expression='betting';end.expression='waiting';hunter.dataset.expression='betting';target.dataset.expression='waiting';
    const duration=reduced?1:1120,midX=(start.x+end.x)/2,midY=clamp(18,Math.min(start.y,end.y)-20,68);
    addEvent(`${meta[predator].name} 正在追击 ${meta[victim].name}…`);hunter.classList.add('is-hunting');target.classList.add('is-threatened');
    const chase=hunter.animate([
      {left:`${start.x}%`,top:`${start.y}%`,transform:'translate(-50%,-50%) scale(1) rotate(0deg)'},
      {left:`${midX}%`,top:`${midY}%`,transform:'translate(-50%,-50%) scale(1.08) rotate(-5deg)',offset:.52},
      {left:`${end.x}%`,top:`${end.y}%`,transform:'translate(-50%,-50%) scale(.96) rotate(2deg)'}
    ],{duration,easing:'cubic-bezier(.16,.84,.24,1)',fill:'forwards'});
    await wait(reduced?1:560);end.expression='loss';target.dataset.expression='loss';particles(victim,'loss');
    const absorbed=target.animate([
      {left:`${end.x}%`,top:`${end.y}%`,transform:'translate(-50%,-50%) scale(1) rotate(0deg)',opacity:1,filter:'blur(0) saturate(.5)'},
      {left:`${end.x-3}%`,top:`${end.y-9}%`,transform:'translate(-50%,-50%) scale(.72) rotate(95deg)',opacity:.9,offset:.42},
      {left:`${end.x}%`,top:`${end.y}%`,transform:'translate(-50%,-50%) scale(.04) rotate(260deg)',opacity:0,filter:'blur(10px) saturate(.2)'}
    ],{duration:reduced?1:650,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
    await Promise.all([chase.finished.catch(()=>{}),absorbed.finished.catch(()=>{})]);
    target.classList.add('is-eaten');hunter.classList.add('is-devouring');state.ai[predator].expression='win';state.ai[victim].expression='loss';state.ai[predator].balance=clamp(.5,state.ai[predator].balance+state.ai[victim].balance,60);state.ai[victim].balance=0;state.ai[victim].active=false;state.ai[victim].eatenBy=predator;renderCard(victim);renderPage();particles(predator,'gain');
    await wait(reduced?1:680);chase.cancel();absorbed.cancel();
    if(removeVictim){
      const removed=window.agentSetup?.remove(victim,{silent:true});
      if(removed?.ok){removeAgentFromArena(victim,{absorbedBy:predator});addEvent(`${hunterName} 吃掉 ${victimName}，${victimName} 已从阵容移除`);toast(`${victimName} 已被 ${hunterName} 吃掉`)}
      else{assignPositions();chooseFallback();renderAll();addEvent(`${hunterName} 吞噬 ${victimName}，成为更强球体`)}
    }else{assignPositions();chooseFallback();renderAll();addEvent(`${hunterName} 吞噬 ${victimName}，成为更强球体`)}
    setBusy(false);
  }
  function removeAgentFromArena(id,{absorbedBy=null}={}){
    const item=state.ai[id],baselineItem=baseline.ai[id];
    if(!absorbedBy){
      const removedBase=item?.base||baselineItem?.base||0;
      state.startTotal=Math.max(0,state.startTotal-removedBase);baseline.startTotal=Math.max(0,baseline.startTotal-removedBase);
    }else if(baseline.ai[absorbedBy]&&baselineItem){
      baseline.ai[absorbedBy].balance=clamp(.5,baseline.ai[absorbedBy].balance+baselineItem.balance,60);
    }
    orbs[id]?.remove();delete orbs[id];
    document.querySelector(`.model-card[data-model="${CSS.escape(id)}"]`)?.remove();
    document.querySelector(`[data-test-model="${CSS.escape(id)}"]`)?.remove();
    delete state.ai[id];delete baseline.ai[id];delete meta[id];ids=ids.filter(itemId=>itemId!==id);
    chooseFallback();assignPositions();renderAll();
    document.querySelectorAll('.model-card').forEach((card,index)=>{const rank=card.querySelector('.rank');if(rank)rank.textContent=String(index+1).padStart(2,'0')});
  }
  function restore(){state=structuredClone(baseline);selected=activeIds()[0]||'claude';remaining=300;eventLog.length=0;assignPositions();renderAll();addEvent('测试数据已重置')}
  function configure(config={}){
    const selectedModels=config.selectedModels||ids,coins=config.coins||{},budget=Number(config.budget)||10,openEnded=config.rounds==='until-loss';baseline={round:0,maxRounds:openEnded?null:(Number(config.rounds)||20),roundMode:openEnded?'until-loss':'fixed',market:config.market||'Binance Prediction',startTotal:budget*selectedModels.length,ai:{}};
    selectedModels.forEach(ensureAgentDom);
    ids.forEach(id=>baseline.ai[id]={balance:selectedModels.includes(id)?budget:0,base:budget,active:selectedModels.includes(id),coin:coins[id]||meta[id].coin,direction:'看涨',expression:'waiting'});state=structuredClone(baseline);selected=selectedModels[0]||'claude';isPaused=false;remaining=300;eventLog.length=0;assignPositions();renderAll();addEvent('新对局球体已就位，等待结算')
  }
  document.querySelector('#test-panel-toggle').onclick=event=>{const panel=document.querySelector('#test-panel'),willOpen=panel.hidden;panel.hidden=!willOpen;event.currentTarget.setAttribute('aria-expanded',String(willOpen))};
  document.querySelectorAll('[data-test-model]').forEach(button=>button.onclick=()=>{selected=button.dataset.testModel;renderAll()});
  document.querySelectorAll('[data-test-expression]').forEach(button=>button.onclick=()=>setExpression(selected,button.dataset.testExpression));
  document.querySelectorAll('[data-test-action]').forEach(button=>button.onclick=()=>{const action=button.dataset.testAction;if(action==='gain')applyDelta(selected,2);if(action==='loss')applyDelta(selected,-2);if(action==='random')randomSettlement();if(action==='devour')forceDevour();if(action==='reset')restore()});
  window.addEventListener('resize',()=>renderAll());
  window.orbArena={reset:configure,setPaused:value=>{isPaused=Boolean(value)},randomSettlement,getEvents:()=>eventLog.map(entry=>({...entry}))};
  ids.forEach(ensureAgentDom);assignPositions();renderAll();
  const featuredId=ids.at(-1);if(featuredId)addEvent(`第 ${state.round} 轮 · ${meta[featuredId].name} 判断 ${state.ai[featuredId].coin} ${state.ai[featuredId].direction}`);
  setInterval(()=>{if(isPaused||document.hidden)return;remaining-=1;if(remaining<=0){remaining=300;randomSettlement()}const min=String(Math.floor(remaining/60)).padStart(2,'0'),sec=String(remaining%60).padStart(2,'0');document.querySelector('#settle-countdown').textContent=`${min}:${sec} 后结算`},1000);
})();
