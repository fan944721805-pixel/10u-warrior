/* Card collection UI with service-backed paper battles and model settings. */
(() => {
  'use strict';
  const D=window.CardLabData,copy=window.WarriorCardCopy,locales=window.WarriorCardLocales,storageKey='warrior-single-card-concept-v2';
  const $=s=>document.querySelector(s),main=$('#main');
  const Draws=window.CardLabDraws,preferencesKey=storageKey+'-preferences-v1';
  const defaultCapitalLimits={maxStakePct:100,exposurePct:100,stopLossPct:null,allowAllIn:false};
  const defaultControls={urge:0,tilt:0,gain:100,cooling:'normal',variance:0};
  const defaults={locale:'zh',cards:[],featured:null,roster:[],models:{},targets:{},controls:defaultControls,pending:null,battleSequence:0,budget:10,asset:'BTC',period:'5m'};
  let saved=null;try{saved=JSON.parse(localStorage.getItem(preferencesKey)||localStorage.getItem(storageKey));}catch{}
  const validControls=c=>c&&['urge','tilt','variance'].every(k=>Number.isFinite(c[k])&&c[k]>=0&&c[k]<=100)&&Number.isFinite(c.gain)&&c.gain>=0&&c.gain<=200&&['slow','normal','fast'].includes(c.cooling);
  let state={...defaults};
  if(saved&&(!saved.cards||Array.isArray(saved.cards)&&saved.cards.every(D.validCard))){
    saved={...saved,cards:saved.cards||[]};
    state={...defaults,...saved,cards:saved.cards,locale:Object.hasOwn(locales,saved.locale)?saved.locale:'zh',featured:D.validCard(saved.featured)?saved.featured:defaults.featured,controls:validControls(saved.controls)?saved.controls:{...defaultControls},pending:validControls(saved.pending)?saved.pending:null};
    state.roster=Array.isArray(saved.roster)?[...new Set(saved.roster)].filter(id=>typeof id==='string').slice(0,8):[];
    state.models=saved.models&&typeof saved.models==='object'?saved.models:{};state.targets=saved.targets&&typeof saved.targets==='object'?saved.targets:{};
    state.battleName=typeof saved.battleName==='string'?saved.battleName.slice(0,30):defaults.battleName;
    state.asset=['BTC','ETH','BNB'].includes(saved.asset)?saved.asset:'BTC';state.period=['5m','15m','1h','1d'].includes(saved.period)?saved.period:'5m';
    state.budget=Number.isFinite(saved.budget)&&saved.budget>=10&&saved.budget<=1000?saved.budget:10;
    state.round=Number.isInteger(saved.round)&&saved.round>=1&&saved.round<=99?saved.round:7;
    state.battleSequence=Number.isSafeInteger(saved.battleSequence)&&saved.battleSequence>=0?saved.battleSequence:0;
    state.roundLimit=[10,20,'until-loss'].includes(saved.roundLimit)?saved.roundLimit:20;state.realtimeEntry=saved.realtimeEntry===true;
    state.pendingDraw=D.validCard(saved.pendingDraw)?saved.pendingDraw:null;
    delete state.pool; // Drop the retired pool setting from existing previews.
  }
  state.cards=[];state.featured=null;state.pendingDraw=null;state.lastDrawId=null;
  let collectionView={status:'idle',data:null,busy:false,error:null,pending:null};
  let page='draw',filter='all',category='all',selectingLineup=false,identityNoticeDismissed=false,dialogCard=null,battleDetailId=null,rankingDetailId=null,rankingScope=1,toastTimer,drawTimer,drawing=false,controlDraft=null,controlSession=null,setupDraft=null,apiDrafts=null,apiProvider='openai',mutating=false,replaceSourceId=null,replaceTargetId=null,replaceSnapshot=null;
  const pages=['draw','collection','arena','ranking'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t=key=>copy[key]?.[locales[state.locale].index]??copy[key]?.[1]??key;
  const pName=id=>t(id==='kzgMask'?'kzg':'persona_'+id);
  const cardName=c=>pName(c.personaId);
  const cardById=id=>state.cards.find(c=>c.id===id)||state.featured?.id===id&&state.featured;
  const roster=()=>state.roster.map(cardById).filter(Boolean);
  const iconPaths={draw:'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6',collection:'M4 4h6v7H4zM14 4h6v7h-6zM4 15h6v5H4zM14 15h6v5h-6z',arena:'m4 19 4-7 4 3 4-10 4 3M4 4v16h17',ai:'M9 3h6l1 4 4 2v6l-4 2-1 4H9l-1-4-4-2V9l4-2zM9 9h6v6H9z',reports:'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5',ranking:'M8 3h8v7a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6M8 21h8',arrow:'M4 12h16m-6-6 6 6-6 6',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',save:'M6 3h12v18l-6-4-6 4z',compare:'M4 5h6v14H4zM14 5h6v14h-6z',lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3',sliders:'M5 3v5m0 4v9M12 3v10m0 4v4M19 3v2m0 4v12M2 8h6v4H2zM9 13h6v4H9zM16 5h6v4h-6z',info:'M12 8v1m0 3v5M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20'};
  const icon=key=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[key]||iconPaths.draw}"/></svg>`;
  function persist(){try{const {cards,featured,pendingDraw,lastDrawId,removedCards,...preferences}=state;localStorage.setItem(preferencesKey,JSON.stringify(preferences));return true;}catch{toast('storageError');return false;}}
  function collectionReady(){return collectionView.status==='ready'&&!collectionView.busy&&!collectionView.pending;}
  function collectionMessage(){return ['COLLECTION_MIGRATION_INVALID','COLLECTION_MIGRATION_CONFLICT'].includes(collectionView.error)?'collectionMigrationError':collectionView.error==='COLLECTION_PENDING_INVALID'?'collectionPendingInvalid':collectionView.pending?'collectionUnconfirmed':collectionView.error==='DRAW_COOLDOWN'?'drawEmpty':collectionView.error==='COLLECTION_CHANGED'?'cardChanged':collectionView.status==='idle'||collectionView.status==='loading'?'collectionLoading':'collectionUnavailable';}
  function collectionNotice(){return collectionView.status==='ready'&&!collectionView.pending?'':`<div class="notice collection-service-status" role="status"><span>${t(collectionMessage())}</span>${collectionView.status==='error'?button('collectionRetry','retry-collection','secondary',collectionView.busy?'disabled':''):''}${['COLLECTION_MIGRATION_INVALID','COLLECTION_MIGRATION_CONFLICT'].includes(collectionView.error)?button('collectionUseService','collection-use-service','secondary'):''}</div>`;}
  function toast(key){clearTimeout(toastTimer);const el=$('#toast');el.textContent=t(key);el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,3200);}
  function readDrawBudget(){return collectionView.data?.budget||{remaining:0,nextAt:null};}
  function updateDrawStatus(){
    const budget=readDrawBudget(),ready=collectionReady(),count=$('#draw-count'),timer=$('#draw-timer');
    if(count)count.textContent=collectionView.data?`${t('drawAvailable')} ${budget.remaining} / ${Draws.CAP}`:t(collectionMessage());
    if(timer){const seconds=Math.max(0,Math.ceil((budget.nextAt-collectionService.time())/1000));timer.textContent=!collectionView.data?'':budget.nextAt===null?t('drawFull'):`${t('drawNext')} ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
    const btn=main.querySelector('[data-action="draw"]');
    if(btn){btn.disabled=!ready||drawing||mutating||budget.remaining===0;btn.innerHTML=icon('draw')+t(drawing?'drawing':collectionView.pending?'collectionRetry':budget.remaining?(state.featured?'draw':'nav_draw'):'drawCooling');}
    const setupDraw=$('#setup-dialog .setup-draw-button');
    if(setupDraw){setupDraw.disabled=!ready||budget.remaining===0;setupDraw.innerHTML=icon('draw')+t(budget.remaining?'goDraw':'drawCooling');}
    const reroll=$('#card-dialog [data-action=reroll-attributes]');
    if(reroll){reroll.disabled=!ready||drawing||mutating||budget.remaining===0;reroll.textContent=t(mutating?'refreshingAttributes':budget.remaining?'refreshAttributes':'drawCooling');}
    for(const el of document.querySelectorAll('[data-action=confirm-replacement],[data-action=keep-owned]'))el.disabled=!ready||mutating;
  }
  async function requestDraw(){
    if(drawing||mutating||!collectionReady())return;drawing=true;updateDrawStatus();
    try{await collectionService.mutate('draw');}
    catch{toast(collectionMessage());}
    finally{drawing=false;render();updateDrawStatus();}
  }
  async function refreshAttributes(id){
    if(drawing||mutating||!collectionReady())return;const current=state.cards.find(c=>c.id===id);if(!current)return;
    mutating=true;updateDrawStatus();
    try{await collectionService.mutate('reroll',{cardId:id,cardRevision:current.revision||0});if(dialogCard?.id===id)openCard(cardById(id),true);toast('attributesRefreshed');}
    catch{toast(collectionMessage());}
    finally{mutating=false;updateDrawStatus();}
  }
  const duplicateCards=c=>state.cards.filter(card=>card.personaId===c.personaId&&card.id!==c.id);
  function openReplacement(refresh=false){
    if(!refresh){replaceSourceId=state.featured.id;replaceTargetId=null;}
    const source=state.pendingDraw?.id===replaceSourceId?state.pendingDraw:null,targets=source?duplicateCards(source):[];
    if(!source||state.lastDrawId!==source.id||!targets.length){$('#replace-dialog').close();return;}
    const target=targets[0];replaceTargetId=target.id;
    replaceSnapshot=JSON.stringify([source,target]);
    $('#replace-dialog').innerHTML=`<div class="dialog-head"><h2 id="replace-title">${t('replaceOwned')}</h2><button class="icon-button" data-action="close-replacement" aria-label="${t('close')}">${icon('close')}</button></div><div class="replacement-body"><p class="replacement-note">${t('replacementNote')}</p>${comparisonTable(source,target)}<div class="replacement-actions">${button('keepOldCard','keep-owned','secondary')}${button('confirmReplace','confirm-replacement','primary')}</div></div>`;
    if($('#card-dialog').open)$('#card-dialog').close();
    if(!$('#replace-dialog').open)$('#replace-dialog').showModal();
  }
  async function confirmReplacement(){
    if(mutating||drawing||!collectionReady())return;
    const source=state.pendingDraw?.id===replaceSourceId?state.pendingDraw:null,target=state.cards.find(c=>c.id===replaceTargetId);
    if(!source||!target||JSON.stringify([source,target])!==replaceSnapshot){toast('cardChanged');openReplacement(true);return;}
    mutating=true;updateDrawStatus();
    try{await collectionService.mutate('replace',{pendingId:source.id,cardId:target.id,cardRevision:target.revision||0});$('#replace-dialog').close();render();toast('cardReplaced');}
    catch{toast(collectionMessage());}
    finally{mutating=false;updateDrawStatus();}
  }
  async function keepOwned(){
    if(mutating||drawing||!collectionReady())return;const source=state.pendingDraw,target=state.cards.find(c=>c.personaId===source?.personaId);if(!target)return;
    mutating=true;updateDrawStatus();
    try{await collectionService.mutate('discard',{pendingId:source.id,cardId:target.id,cardRevision:target.revision||0});$('#replace-dialog').close();render();}
    catch{toast(collectionMessage());}
    finally{mutating=false;updateDrawStatus();}
  }
  const isReference=c=>!!c&&/^(original|catalog)-/.test(c.id)&&!isSaved(c);
  const ownsPersona=id=>state.cards.some(c=>c.personaId===id);
  function isSaved(c){return !!c&&state.cards.some(x=>x.id===c.id);}
  function saveCard(c,notify=true){if(isSaved(c)){if(notify)toast('alreadySaved');return true;}toast('drawToOwn');return false;}
  function addCard(c){if(page==='draw')return;if(!c||isReference(c)){toast('drawToOwn');return;}if(state.roster.includes(c.id))return;if(state.roster.length>=8){toast('lineupFull');return;}if(!saveCard(c,false))return;state.roster.push(c.id);persist();toast('addedToast');render();if(dialogCard)openCard(dialogCard,true);}
  function removeCard(id){state.roster=state.roster.filter(value=>value!==id);delete state.models[id];delete state.targets[id];persist();render();toast('removedToast');}
  const imageTag=(c,cls='')=>`<img class="character-avatar ${cls}" src="${D.personas[c.personaId].image}" alt="${esc(pName(c.personaId))}" loading="lazy">`;
  const statRow=c=>`<div class="stat-row">${['urge','sensitivity','variance'].map((key,i)=>`<div><strong>${c.stats[i]}</strong><small>${t(key)}</small><i><span style="width:${c.stats[i]}%"></span></i></div>`).join('')}</div>`;
  const cardTraitIds=c=>c.agent?.policy.cardTraits||D.traitsFor(c);
  const traits=c=>`<div class="traits">${cardTraitIds(c).map(key=>`<span class="trait">${t('trait_'+key)}</span>`).join('')}</div>`;
  const strategyCard=(c,interactive=false)=>`<article class="strategy-card" data-persona="${c.personaId}" ${interactive?`role="button" tabindex="0" data-action="detail-featured" aria-haspopup="dialog" aria-label="${esc(cardName(c))} · ${t('detail')}"`:''}><div class="portrait">${imageTag(c)}</div><div class="card-body"><h2>${esc(cardName(c))}</h2><p class="core-line character-quote">${esc(t('catchphrase_'+c.personaId))}</p>${traits(c)}${statRow(c)}</div></article>`;
  const miniCard=c=>`<button class="mini-card" data-action="detail" data-id="${esc(c.id)}">${imageTag(c)}<span class="mini-copy"><b>${esc(cardName(c))}</b><span class="mini-traits">${cardTraitIds(c).map(key=>`<span>${t('trait_'+key)}</span>`).join('')}</span></span></button>`;
  const button=(label,action,cls='primary',attrs='',ico='')=>`<button type="button" class="${cls}" data-action="${action}" ${attrs}>${ico?icon(ico):''}${t(label)}</button>`;
  function heading(key,desc,action=''){const compact=key==='collectionTitle';return `<div class="page-heading"><div><h1>${t(key)}</h1>${compact?'':`<p>${t(desc)}</p>`}</div>${action}</div>`;}
  const notice=(key,extra='')=>`<div class="notice ${extra}">${icon('info')}<span>${t(key)}</span></div>`;
  function nav(){const names=pages;$('#navigation').innerHTML=names.map(key=>`<button class="nav-button ${page===key?'active':''}" data-page="${key}" ${page===key?'aria-current="page"':''}>${icon(key)}<span>${t('nav_'+key)}</span></button>`).join('');$('#mobile-navigation').innerHTML=['draw','collection','arena','ranking'].map(key=>`<button class="nav-button ${page===key?'active':''}" data-page="${key}" ${page===key?'aria-current="page"':''}>${icon(key)}<span>${t('nav_'+key)}</span></button>`).join('');$('#crumb').textContent=t('nav_'+page);}
  function renderDraw(){const c=state.featured;return `${collectionNotice()}<section class="hero"><div class="hero-copy"><h1>${t('heroFirst')}<br><em>${t('heroSecond')}</em></h1><p class="hero-desc">${t('heroDesc')}</p><div class="pool-control"><div class="draw-status"><b id="draw-count"></b><span id="draw-timer" role="timer"></span></div><div class="action-row">${button(drawing?'drawing':'draw','draw','primary',drawing?'disabled':'','draw')}</div></div></div><div class="reveal-stage ${drawing?'drawing':''}"><div class="orbit"></div><span class="floating-note">✦ ${t('fixedCore')}</span>${c?strategyCard(c,true):`<div class="draw-empty-card"><img src="delivery-rider-avatar.png" alt=""><strong>${t('collectionFirstDraw')}</strong></div>`}${c?`<div class="stage-actions">${state.pendingDraw?.id===c.id?button('keepOldCard','keep-owned','stage-save','','check'):button(isSaved(c)?'saved':'save','save','stage-save'+(isSaved(c)?' saved':''),'',isSaved(c)?'check':'save')}${button('compare','detail-featured','stage-compare','','compare')}${state.pendingDraw?.id===c.id&&duplicateCards(c).length?button('replaceOwned','replace-owned','stage-compare','','compare'):''}</div>`:''}</div></section><section><div class="section-head"><h2>${t('recent')}</h2>${button('browse','collection','text-button','','arrow')}</div><div class="mini-grid">${state.cards.slice(0,4).map(miniCard).join('')}</div></section>`;}
  function collectionCard(c){
    const added=state.roster.includes(c.id),reference=isReference(c),owned=ownsPersona(c.personaId);
    const selectable=selectingLineup&&!reference;
    return `<article class="collection-item ${reference&&!owned?'unowned':''} ${selectable?'lineup-selectable':''} ${selectable&&added?'lineup-selected':''}" data-owned="${owned}" data-card-id="${esc(c.id)}"><button type="button" class="collection-detail-trigger" data-action="detail" data-id="${esc(c.id)}" aria-haspopup="dialog" aria-label="${esc(cardName(c))} · ${t('detail')}"></button>${selectable?`<label class="lineup-check"><input type="checkbox" data-lineup="${esc(c.id)}" ${added?'checked':''} aria-label="${esc(cardName(c))} · ${t('lineupToggle')}"></label>`:''}<div class="collection-head"><div class="collection-art">${imageTag(c)}</div><div class="collection-identity"><h3>${esc(cardName(c))}</h3><span class="ownership-label ${owned?'is-owned':''}">${icon(owned?'check':'lock')}${t(owned?'owned':'unowned')}</span></div></div><p class="core-line character-quote">${esc(t('catchphrase_'+c.personaId))}</p><div class="collection-content">${reference?`<p class="catalog-hint">${t(owned?'originalPreview':'unownedPreview')}</p><div class="card-buttons">${button(owned?'viewOwned':'goDraw',owned?'view-owned':'go-draw','card-reference-link',`data-persona="${c.personaId}"`)}</div>`:traits(c)+statRow(c)}</div></article>`;
  }
  function categoryCards(){
    const missing=D.order.filter(id=>!ownsPersona(id)).map(id=>D.makeCard(id,'original',0,'catalog-'+id));
    const cards=category==='originals'?D.order.map(id=>D.makeCard(id,'original',0,'original-'+id)):[...state.cards,...missing];
    return cards.filter(c=>['all','originals'].includes(category)||D.personas[c.personaId].source===category||category==='peers'&&c.personaId==='sunBrother');
  }
  function filteredCards(){return categoryCards().filter(c=>filter==='all'||ownsPersona(c.personaId)===(filter==='owned'));}
  function empty(){return `<div class="empty"><h3>${t('emptyTitle')}</h3><p>${t('emptyDesc')}</p>${button('draw','go-draw','primary')}</div>`;}
  function renderCollection(){
    const ownedIds=new Set(state.cards.map(c=>c.personaId));
    const cards=categoryCards(),owned=cards.filter(c=>ownsPersona(c.personaId)).length;
    const counts={all:cards.length,owned,unowned:cards.length-owned};
    const tab=f=>`<button class="filter ${filter===f?'active':''}" data-filter="${f}" aria-pressed="${filter===f}"><span>${t(f==='all'?'ownershipAll':'filter_'+f)}</span><b>${counts[f]}</b></button>`;
    const categoryTab=f=>`<button class="filter ${category===f?'active':''}" data-category="${f}" aria-pressed="${category===f}">${t(f==='all'?'allTypes':'filter_'+f)}</button>`;
    return `${collectionNotice()}<div class="collection-heading"><p class="collection-progress">${t('collectedCharacters')} <b>${ownedIds.size} / ${D.order.length}</b> · ${t('ownedCards')} <b>${state.cards.length}</b></p>${button(selectingLineup?'finishLineupSelection':'selectLineup','toggle-lineup-selection','primary',`aria-pressed="${selectingLineup}"`,'check')}</div><div class="collection-toolbar"><div class="category-tabs" role="group" aria-label="${t('categoryFilter')}">${['all','technical','oracle','peers','originals'].map(categoryTab).join('')}</div><div class="ownership-tabs" role="group" aria-label="${t('ownershipFilter')}">${['all','owned','unowned'].map(tab).join('')}</div><select id="ownership-select" class="ownership-select" aria-label="${t('ownershipFilter')}">${['all','owned','unowned'].map(f=>`<option value="${f}" ${filter===f?'selected':''}>${t(f==='all'?'ownershipAll':'filter_'+f)} · ${counts[f]}</option>`).join('')}</select></div><div class="collection-grid" id="collection-grid">${filteredCards().map(collectionCard).join('')||empty()}</div>`;
  }
  function rosterErrors(config=state){const ids=config.roster||state.roster,cards=ids.map(id=>state.cards.find(c=>c.id===id)).filter(Boolean),errors=[];if(!cards.length)return ['needCard'];if(ids.length>8)errors.push('lineupFull');if(config.asset==='ETH'&&cards.some(c=>['czBrother','firstLady'].includes(c.personaId)))errors.push('unsupportedAsset');const cz=cards.filter(c=>c.personaId==='czBrother');if(cards.some(c=>c.personaId==='showoff'&&(config!==state?!cz.length:!cz.some(target=>target.id===state.targets[c.id]))))errors.push('dependencyMissing');if(!Number.isFinite(config.budget)||config.budget<10||config.budget>1000)errors.push('invalidBudget');return errors;}
  function autoBind(){const cz=roster().filter(c=>c.personaId==='czBrother');for(const c of roster())if(c.personaId==='showoff'&&cz.length===1&&!cz.some(x=>x.id===state.targets[c.id]))state.targets[c.id]=cz[0].id;}
  const effectiveUrge=(c,controls=state.controls)=>{const personal=Math.min(100,c.stats[0]+(c.agent?.traitEffects?.urgeBonus||0));return Math.round(personal+(100-personal)*controls.urge/100);};
  const collectionService=window.WarriorCardCollection.create({request:window.WarriorCardRuntime.request,storage:localStorage,data:D,onChange:view=>{
    const changed=view.data?.revision!==collectionView.data?.revision||view.status!==collectionView.status||!!view.pending!==!!collectionView.pending;
    collectionView=view;
    if(view.data){state.cards=view.data.cards;state.pendingDraw=view.data.pending;state.lastDrawId=view.data.pending?.id||null;state.featured=state.cards.find(c=>c.id===view.data.featuredId)||state.pendingDraw||state.cards[0]||null;
      if(view.status==='ready'&&!view.busy){state.roster=state.roster.filter(id=>state.cards.some(c=>c.id===id));autoBind();persist();}}
    if(changed&&['draw','collection'].includes(page))render();else updateDrawStatus();
    if(changed&&dialogCard&&isSaved(dialogCard))openCard(cardById(dialogCard.id),true);
    if(setupDraft){if(changed)renderSetup();else updateSetupSummary();}
    if($('#replace-dialog').open&&changed)openReplacement(true);
  }});
  let battleView={status:'idle',battle:null,battles:[],busy:false,error:null,pending:null};
  const battleService=window.WarriorCardBattles.create({api:window.Warrior.simulationApi,storage:localStorage,onChange:view=>{
    battleView=view;
    if(page==='arena'){render();if($('#battle-detail-dialog').open)openBattleDetail(battleDetailId,true);}
    if(setupDraft)updateSetupSummary();
  }});
  const battleLabel=b=>b?.automaticSequence?sessionName(b.automaticSequence):b?.name||t('battleNoSession');
  const arenaAsset=()=>battleView.battle?.config?.agents?.[0]?.coin||state.asset;
  const arenaPeriod=()=>battleView.battle?.config?.period||state.period;
  function battleCards(){return (battleView.battle?.agents||[]).map(agent=>({id:agent.id,personaId:agent.policy.strategy,styleId:agent.policy.cardSnapshot?.styleId||'original',stats:[agent.policy.actionUrge,agent.policy.emotionSensitivity,agent.policy.decisionVariance],agent}));}
  function battlePreview(c){const a=c.agent,order=a.orders.filter(o=>o.status==='OPEN').at(-1)||a.orders.at(-1)||null;return {equity:a.equity,cash:a.cash,stake:a.reserved,order,call:order?.direction==='UP'?'up':order?.direction==='DOWN'?'down':'wait'};}
  function battleLedger(c){const agent=c.agent;return {simulation:battleView.battle,agent,initial:battleView.battle.config.initialBalance+(agent.addedCapital||0),wins:agent.wins,total:agent.wins+agent.losses};}
  const equityCopy={'资金变化':'battleChartTitle','模拟资金':'battleChartDemo','当前资金':'battleChartCurrent','已结算收益':'battleChartProfit','历史记录不完整，暂不绘制曲线。':'battleChartMissing','还没有结算，资金暂未变化。':'battleChartFlat','查看资金记录':'battleChartBrowse','初始资金':'battleChartInitial','订单结算':'battleChartSettlement','补资':'battleChartDeposit','当前':'battleChartNow','资金包含待结算的下注；追加资金不算收益。':'battleChartNote'};
  function mountBattleChart(c,selected){const {simulation,agent}=battleLedger(c),chart=window.WarriorEquity.mount(simulation,agent,{watch:false,showFlat:true,translate:text=>equityCopy[text]?t(equityCopy[text]):text});$('#battle-chart-slot').replaceWith(chart);if(selected!==null){const slider=chart.querySelector('input');if(slider){slider.value=selected;slider.dispatchEvent(new Event('input'));}}}
  const battleReason=c=>{const reason=c.agent.lastDecision?.reason||c.agent.reason;return esc(reason==='CARD_TRAIT_COOLDOWN'?t('traitPaused'):reason||t('battleNoDecision'));};
  const battleNumber=value=>Number.isFinite(value)?value.toLocaleString(locales[state.locale].lang,{maximumFractionDigits:4}):'—';
  function battleOrder(c,detail=false){const p=battlePreview(c),o=p.order,status=o?({OPEN:'battlePending',WON:'battleWon',LOST:'battleLost',SPLIT:'rankNeutralBets'}[o.status]||'betWaiting'):'betWaiting';return `<section class="battle-order"><div class="battle-order-head"><span>${t(o?.status==='OPEN'?'betThisRound':'battleLatestBet')}</span><small>${t(status)}</small></div><div class="battle-order-main"><b class="${p.call}">${t(o?p.call:'betNoOrder')} ${o&&detail?`<small>${arenaAsset()}</small>`:''}</b>${o?`<strong>${o.amount.toFixed(2)} <small>U</small></strong>`:''}</div>${o?`<div class="battle-order-reference"><span>${t('betReference')}</span><b>${battleNumber(o.referencePrice)}</b></div>`:`<p class="battle-order-empty">${t('betWaitHint')}</p>`}${detail&&o?`<div class="battle-order-reference"><span>${t('betOdds')}</span><b>${battleNumber(o.quote?.odds)}</b></div><div class="battle-order-reference"><span>${t('betReturn')}</span><b>${battleNumber(o.status==='OPEN'?o.quote?.shares:o.payout)} U</b></div>`:''}</section>`;}
  function battleCard(c,i){const p=battlePreview(c),ledger=battleLedger(c),profit=Math.round((p.equity-ledger.initial)*100)/100,performance=profit>0?'× '+Number((p.equity/ledger.initial).toFixed(2)):profit<0?'−'+Number((-profit/ledger.initial*100).toFixed(2))+'%':'0%',signed=(profit>0?'+':profit<0?'−':'')+Math.abs(profit).toFixed(2);return `<article class="battle-card" data-battle-id="${esc(c.id)}" data-bet-state="${p.stake?'open':'idle'}"><div class="battle-person">${imageTag(c)}<div><b>${esc(cardName(c))}</b></div><span class="battle-rank">${String(i+1).padStart(2,'0')}</span></div><div class="battle-equity-head"><div class="battle-money"><span>${t('battleBook')}</span><strong>${p.equity.toFixed(2)}<small>U</small></strong></div><div class="battle-profit ${profit>0?'positive':profit<0?'negative':''}"><span>${t('battleProfit')}</span><b>${performance}</b><small>${signed} U</small></div></div><div class="battle-ledger"><div class="battle-book"><span>${t('battleRecorded')}</span><b>${p.equity.toFixed(2)}</b></div><div class="battle-funds"><div><span>${t('betAvailable')}</span><b>${p.cash.toFixed(2)}</b></div><div><span>${t('betFrozen')}</span><b>${p.stake.toFixed(2)}</b></div></div></div>${battleOrder(c)}<div class="battle-summary-footer"><span>${t('betWinRate')} <b>${ledger.total?(ledger.wins/ledger.total*100).toFixed(0)+'%':'—'}</b><small>${ledger.wins}/${ledger.total}</small><small>${t('betDemo')}</small></span><span class="battle-detail-label" aria-hidden="true">${t('betDetails')} ↗</span></div><button type="button" class="battle-open" data-action="battle-detail" data-id="${esc(c.id)}" aria-label="${esc(cardName(c))} · ${t('betDetails')}"></button></article>`;}
  function battleCapital(c){const p=c.agent.policy,limits=p.capitalLimits;if(p.capitalVersion!=='SC-2')return '';return `<details class="battle-disclosure"><summary>${t('capitalLimitsTitle')}</summary><div class="battle-detail-effects"><div><span>${t('capitalPerBet')}</span><b>${p.maxStakePct}%</b></div><div><span>${t('capitalExposure')}</span><b>${limits.exposurePct}%</b></div><div><span>${t('capitalStopLoss')}</span><b>${limits.stopLossPct===null?t('capitalStopOff'):limits.stopLossPct+'%'}</b></div></div><p>${t('capitalBasisHint')}</p><p>${t('capitalAllowAllIn')} · ${t(p.allowAllIn?'capitalYes':'capitalNo')}</p></details>`;}
  function battleTraitStatus(c){const e=c.agent.traitEffects;if(!e)return '';return `<section class="battle-detail-decision battle-trait-status"><h3>${t('traitState')}</h3><p>${e.active.length?e.active.map(id=>`${t('trait_'+id)}${e.remaining[id]?' · '+t('traitRemaining').replace('{n}',e.remaining[id]):''}`).join(' / '):t('traitIdle')}</p>${Object.keys(e.cooling).length?`<p>${Object.entries(e.cooling).map(([id,n])=>t('trait_'+id)+' · '+t('traitCooling').replace('{n}',n)).join(' / ')}</p>`:''}${e.urgeBonus?`<p>${t('urge')} +${e.urgeBonus}</p>`:''}</section>`;}
  function openBattleDetail(id,refresh=false){const selected=refresh?$('#battle-detail-dialog .equity-chart-slider')?.value??null:null;const c=battleCards().find(x=>x.id===id);if(!c){$('#battle-detail-dialog').close();return;}battleDetailId=id;const p=battlePreview(c),model=c.agent.lastDecision?.engine?.model||c.agent.policy.aiModelLabel||t(c.agent.policy.aiConnectionId==='none'?'battleLocalRules':'battleDefaultModel');$('#battle-detail-dialog').innerHTML=`<div class="dialog-head"><div class="battle-detail-heading"><h2 id="battle-detail-title">${esc(cardName(c))}</h2><span class="battle-detail-model">${t('model')} · ${esc(model)}</span></div><button type="button" class="icon-button" data-action="close-battle-detail" aria-label="${t('close')}">${icon('close')}</button></div><div class="battle-detail-body"><p class="battle-preview-note">${t('betPreviewNote')}</p>${c.agent.capitalStopped?`<p role="status" class="small-note">${t('capitalStopped')}</p>`:''}${battleOrder(c,true)}<section class="battle-detail-decision"><h3>${t('showEvidence')}</h3><p>${battleReason(c)}</p></section><div id="battle-chart-slot"></div>${battleCapital(c)}${battleTraitStatus(c)}<details class="battle-disclosure"><summary>${t('betMarketReference')}</summary><div class="indicator-list">${indicatorTags(c)}</div><div class="battle-indicator-values">${Object.entries(c.agent.lastDecision?.indicators||{}).map(([key,value])=>`<div><span>${esc(key)}</span><b>${esc(typeof value==='object'?JSON.stringify(value):value)}</b></div>`).join('')||t('betNoMarket')}</div></details><details class="battle-disclosure"><summary>${t('betStrategyNotes')}</summary><div class="battle-detail-effects"><div><span>${t('urge')}</span><b>${effectiveUrge(c,{urge:battleView.battle?.config.actionUrgeLevel||0})}</b></div><div><span>${t('tilt')}</span><b>${Math.round((c.agent.personalEmotion?.tilt||0)+(100-(c.agent.personalEmotion?.tilt||0))*(battleView.battle?.config.emotionLevel||0)/100)}</b></div><div><span>${t('sensitivity')}</span><b>${c.stats[1]}</b></div><div><span>${t('variance')}</span><b>${Math.round(c.stats[2]+(100-c.stats[2])*(battleView.battle?.config.globalControls?.variance||0)/100)}</b></div></div><p>${t('core_'+c.personaId)}</p><div class="metric-chips">${cardTraitIds(c).map(key=>`<span>${t('trait_'+key)}</span>`).join('')}</div><p>${t(c.personaId==='liangXi'?'stake_liangXi':'stake_default')}</p></details><div class="battle-detail-funds"><span>${t('arenaEquity')} <b>${p.equity.toFixed(2)} U</b></span><span>${t('betAvailable')} <b>${p.cash.toFixed(2)} U</b></span><span>${t('betFrozen')} <b>${p.stake.toFixed(2)} U</b></span></div></div>`;mountBattleChart(c,selected);if(!refresh&&!$('#battle-detail-dialog').open){$('#battle-detail-dialog').showModal();$('#battle-detail-dialog').scrollTop=0;}}
  let arenaQuote=null,arenaQuoteStatus='connecting',arenaQuoteSymbol='',arenaQuoteActive=false;
  const arenaPriceStream=(window.Warrior?.createPriceStream||(()=>({start(){arenaQuoteStatus='unavailable';paintArenaPrice();},stop(){}})))({
    onUpdate:quote=>{if(quote.symbol===arenaQuoteSymbol){arenaQuote=quote;paintArenaPrice();}},
    onStatus:status=>{arenaQuoteStatus=status;if(status!=='live')arenaQuote=null;paintArenaPrice();}
  });
  function paintArenaPrice(){
    const panel=$('#arena-price');if(!panel)return;
    const fresh=arenaQuoteStatus==='live'&&arenaQuote?.symbol===arenaAsset()+'USDT'&&Date.now()-arenaQuote.tradeTime<=15000;
    panel.dataset.state=fresh?'live':'unavailable';
    $('#arena-price-value').textContent=fresh?new Intl.NumberFormat(locales[state.locale].lang,{minimumFractionDigits:2,maximumFractionDigits:2}).format(arenaQuote.price):'—';
    const key=fresh?'arenaPriceLive':({connecting:'arenaPriceConnecting',reconnecting:'arenaPriceRetry',paused:'arenaPricePaused'}[arenaQuoteStatus]||'arenaPriceUnavailable');
    $('#arena-price-status').textContent=t(key);
    const time=$('#arena-price-time');time.textContent=fresh?new Date(arenaQuote.tradeTime).toLocaleTimeString(locales[state.locale].lang,{hour12:false}):'';
    if(fresh)time.dateTime=new Date(arenaQuote.tradeTime).toISOString();else time.removeAttribute('datetime');
  }
  function syncArenaPrice(){
    if(page!=='arena'||document.hidden){if(arenaQuoteActive){arenaQuoteActive=false;arenaPriceStream.stop();}return;}
    const symbol=arenaAsset()+'USDT';
    if(!arenaQuoteActive||arenaQuoteSymbol!==symbol){arenaQuoteSymbol=symbol;arenaQuote=null;arenaQuoteActive=true;arenaPriceStream.start(symbol);}
    paintArenaPrice();
  }
  document.addEventListener('visibilitychange',syncArenaPrice);
  window.addEventListener('pagehide',()=>{arenaQuoteActive=false;arenaPriceStream.stop();});
  window.addEventListener('pageshow',syncArenaPrice);
  setInterval(paintArenaPrice,1000);
  function battleToolbar(){const live=battleView.battle;return `<div class="battle-toolbar">${battleView.battles.length?`<select id="battle-select" aria-label="${t('battleSelect')}">${battleView.battles.map(b=>`<option value="${esc(b.id)}" ${b.id===live?.id?'selected':''}>${esc(battleLabel(b))}</option>`).join('')}</select>`:''}${live&&!['ended','settling'].includes(live.status)?`${button(live.enabled?'battlePause':'battleResume',live.enabled?'pause-battle':'resume-battle','secondary',battleView.busy||battleView.status==='error'?'disabled':'')}${button('battleEnd','end-battle','secondary',battleView.busy||battleView.status==='error'?'disabled':'')}`:''}${battleView.status==='error'?`<span role="alert">${t('battleLoadFailed')}</span>${button('rankRetry','retry-battle','secondary')}`:!live?`<p role="status">${t(battleView.status==='empty'?'battleEmpty':'rankLoading')}</p>`:''}${battleView.error&&battleView.status!=='error'?`<p role="alert">${t('battleActionFailed')} ${esc(battleView.error)}</p>`:''}</div>`;}
  function renderArena(){const live=battleView.battle,cards=battleCards(),total=cards.reduce((sum,c)=>sum+c.agent.equity,0);return `<div class="arena-classic"><section class="battle-top"><div class="arena-session" id="arena-price" data-state="unavailable" title="${t('arenaPriceSource')}"><div class="arena-price-heading"><b>${arenaAsset()} / USDT</b><span>${t('arenaSpotPrice')}</span></div><div class="arena-price-line"><strong id="arena-price-value">—</strong><small>USDT</small></div><div class="arena-price-meta"><span id="arena-price-status" role="status">${t('arenaPriceConnecting')}</span><time id="arena-price-time" title="${t('arenaPriceUpdated')}"></time></div></div><div class="arena-overview"><div class="arena-total"><span>${t('arenaEquity')}</span><strong>${live?total.toFixed(2):'—'}<small>USDT</small></strong></div><div class="arena-round"><span>${t('arenaRound')}</span><strong>${live?String(live.roundCount).padStart(2,'0'):'—'}</strong></div><div class="arena-participants"><span>${t('rosterSize')}</span><strong>${cards.length}</strong></div></div><div class="arena-command-actions">${button('newBattle','open-setup','primary yellow','','plus')}</div></section><section class="arena-performance"><div class="arena-panel-head"><div class="arena-session-heading"><h2>${esc(battleLabel(live))}</h2><span>${arenaAsset()} · ${arenaPeriod()}</span></div><span class="arena-demo-label">${t('arenaDemoResults')}</span><button type="button" class="arena-settings" ${live&&battleView.status==='ready'&&!battleView.busy&&!['ended','settling'].includes(live.status)?'':'disabled'} data-action="controls" aria-label="${t('arenaSettings')}" title="${t('arenaSettings')}" aria-haspopup="dialog" aria-controls="controls-dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-.5 3-2 1.2L3.7 6.1l-3 5.2L3 13.2v2.3L.7 17.3l3 5.2 2.8-1.1 2 1.2.5 3h6l.5-3 2-1.2 2.8 1.1 3-5.2-2.3-1.8v-2.3l2.3-1.9-3-5.2-2.8 1.1-2-1.2L15 3Z" transform="translate(2 0) scale(.83)"/><circle cx="12" cy="12" r="3"/></svg></button></div>${battleToolbar()}<div class="arena-card-heading"><h2>${t('arenaPeople')}</h2><span>${live?t('battleStatus_'+live.status):''}</span></div><div class="battle-cards">${live?cards.map(battleCard).join(''):''}</div></section></div>`;}
  const walletUI=window.WarriorCardWallet.mount({dialog:$('#card-wallet-dialog'),shortcut:$('#wallet-shortcut'),request:window.WarriorCardRuntime.request,t,locale:()=>locales[state.locale].lang,openUrl:async url=>{if(window.Capacitor?.isNativePlatform?.()){const plugin=window.Capacitor.Plugins?.WalletLink||window.Capacitor.registerPlugin?.('WalletLink');if(!plugin?.open)throw Error('WALLET_LINK_UNAVAILABLE');await plugin.open({url});}else window.open(url,'_blank','noopener,noreferrer');}});

  // Connection form preview: secrets stay in this page's memory, never in persisted card state.
  let apiConfigs={},apiBusy=false,apiLoaded=false,apiMessage='';
  const apiProviders={openai:{name:'OpenAI',baseUrl:'https://api.openai.com/v1'},anthropic:{name:'Claude',baseUrl:'https://api.anthropic.com/v1'},deepseek:{name:'DeepSeek',baseUrl:'https://api.deepseek.com'},custom:{name:null,baseUrl:''}};
  const apiProviderName=key=>apiProviders[key].name||t('apiCustom');
  const apiStatus=connection=>connection?.lastError?'apiConnectionFailed':connection?.tested?'apiConnected':connection?'apiSavedStatus':'apiUnconnected';
  function acceptApiSettings(value){
    if(!Array.isArray(value?.connections))throw Object.assign(new Error('RUNTIME_UNAVAILABLE'),{code:'RUNTIME_UNAVAILABLE'});
    apiConfigs=Object.fromEntries(value.connections.map(c=>[c.provider,{provider:c.provider,baseUrl:c.baseUrl,model:c.model,tested:c.tested===true,lastError:c.lastError,revision:c.revision}]));
    apiLoaded=true;
    window.dispatchEvent(new CustomEvent('warrior-ai-connections',{detail:value}));
  }
  const apiError=error=>({key:error.code==='AI_KEY_REQUIRED'?'apiKeyRequired':error.code==='RUNTIME_UNAVAILABLE'||error.code==='MOBILE_SERVICE_UNAVAILABLE'?'apiUnavailable':'apiRequestFailed',code:/^(AI|MOBILE)_[A-Z_]+$/.test(error.code||'')?error.code:''});
  function resetApiDrafts(){apiDrafts=Object.fromEntries(Object.entries(apiProviders).map(([key,p])=>[key,{baseUrl:apiConfigs[key]?.baseUrl||p.baseUrl,apiKey:'',model:apiConfigs[key]?.model||''}]));}
  async function openApiPreview(){
    if(apiBusy)return;
    resetApiDrafts();apiBusy=true;apiLoaded=false;apiMessage='apiLoading';renderApiPreview();$('#api-preview-dialog').showModal();
    try{acceptApiSettings(await window.WarriorCardRuntime.request('/api/ai/settings'));if(apiDrafts)resetApiDrafts();apiMessage='';}
    catch(error){apiMessage=apiError(error);}
    finally{apiBusy=false;renderApiPreview();}
  }
  function renderApiPreview(){if(!apiDrafts)return;const draft=apiDrafts[apiProvider];$('#api-preview-dialog').innerHTML=`<div class="dialog-head"><h2 id="api-preview-title">${t('apiSettings')}</h2><button class="icon-button" data-action="close-api" aria-label="${t('close')}">${icon('close')}</button></div><div class="api-preview-workspace"><div class="api-preview-providers" role="group" aria-label="${t('apiProvider')}">${Object.keys(apiProviders).map(key=>`<button type="button" data-api-provider="${key}" aria-pressed="${key===apiProvider}"><span class="api-provider-initial">${key==='custom'?'+':apiProviderName(key)[0]}</span><b>${apiProviderName(key)}</b></button>`).join('')}</div><form id="api-preview-form" class="api-preview-form"><div class="api-preview-form-heading"><h3>${apiProviderName(apiProvider)}</h3><span id="api-preview-status">${t(apiStatus(apiConfigs[apiProvider]))}</span></div><label for="api-preview-key">API Key</label><div class="api-preview-secret"><input id="api-preview-key" type="password" data-api-field="apiKey" autocomplete="off" spellcheck="false" ${apiConfigs[apiProvider]?'':'required'} placeholder="${apiConfigs[apiProvider]?t('apiKeepKey'):''}" value="${esc(draft.apiKey)}"><button type="button" data-action="toggle-api-key" aria-pressed="false">${t('apiShowKey')}</button></div><label for="api-preview-url">Base URL</label><input id="api-preview-url" type="url" data-api-field="baseUrl" autocomplete="off" spellcheck="false" required value="${esc(draft.baseUrl)}" placeholder="https://"><label for="api-preview-model">${t('apiModelId')}</label><input id="api-preview-model" type="text" data-api-field="model" autocomplete="off" spellcheck="false" required value="${esc(draft.model)}" placeholder="${t('apiModelPlaceholder')}"><div class="api-preview-actions">${button('apiClear','clear-api','secondary')}<button type="submit" class="primary">${t('apiSaveSettings')}</button><button type="button" class="secondary" data-action="test-api">${t('apiTestConnection')}</button></div><p class="api-preview-note">${t('apiPreviewNote')}</p><p id="api-preview-result" role="status">${esc(apiMessage?(typeof apiMessage==='object'?t(apiMessage.key)+(apiMessage.code?' · '+apiMessage.code:''):t(apiMessage)):'')}</p></form></div>`;const form=$('#api-preview-form');for(const el of form.querySelectorAll('input,button'))el.disabled=apiBusy||!apiLoaded;for(const el of $('#api-preview-dialog').querySelectorAll('[data-api-provider]'))el.disabled=apiBusy;form.setAttribute('aria-busy',String(apiBusy));}
  async function saveApiPreview(test=false){
    if(apiBusy||!apiLoaded||!apiDrafts||!$('#api-preview-form').reportValidity())return;
    const provider=apiProvider,draft={...apiDrafts[provider]};
    apiBusy=true;apiMessage=test?'apiChecking':'apiSaving';renderApiPreview();
    try{
      acceptApiSettings(await window.WarriorCardRuntime.request(test?'/api/ai/connections/test':'/api/ai/connections',{provider,...draft}));
      if(apiDrafts)apiDrafts[provider]={baseUrl:apiConfigs[provider].baseUrl,model:apiConfigs[provider].model,apiKey:''};
      apiMessage=test?'apiConnected':'apiSavedNote';
    }catch(error){
      apiMessage=apiError(error);
      // A failed connection test may have saved an untested replacement. Read the authoritative state.
      try{acceptApiSettings(await window.WarriorCardRuntime.request('/api/ai/settings'));}catch{apiLoaded=false;}
      if(apiDrafts)apiDrafts[provider].apiKey='';
    }finally{draft.apiKey='';apiBusy=false;renderApiPreview();}
  }
  async function clearApiSettings(){
    if(apiBusy||!apiLoaded||!apiDrafts)return;
    const provider=apiProvider;apiBusy=true;apiMessage='apiSaving';renderApiPreview();
    try{acceptApiSettings(await window.WarriorCardRuntime.request('/api/ai/connections/remove',{provider}));if(apiDrafts)apiDrafts[provider]={apiKey:'',model:'',baseUrl:apiProviders[provider].baseUrl};apiMessage='apiRemoved';}
    catch(error){apiMessage=apiError(error);}
    finally{apiBusy=false;renderApiPreview();}
  }
  function sessionName(number){const digits=['零','一','二','三','四','五','六','七','八','九'];const zh=number<10?digits[number]:number<100?(number>=20?digits[Math.floor(number/10)]:'')+'十'+(number%10?digits[number%10]:''):String(number);return t('numberedBattle').replace('{n}',state.locale==='zh'?zh:number);}
  let setupMessage='';
  const connectionChoice=value=>value==='claude'?'anthropic':!value||value==='local'?'none':value;
  async function openSetup(){
    setupMessage='';setupDraft={collectionRevision:collectionView.data?.revision,roster:[...state.roster],asset:state.asset,period:state.period,budget:state.budget,roundLimit:state.roundLimit||20,realtimeEntry:!!state.realtimeEntry,capitalLimits:{...defaultCapitalLimits,...state.capitalLimits},models:Object.fromEntries(state.roster.map(id=>[id,connectionChoice(state.models[id])]))};
    if(battleView.pending){const c=battleView.pending.config;Object.assign(setupDraft,{roster:c.agents.map(a=>a.sourceAgentId),asset:c.agents[0].coin,period:c.period,budget:c.initialBalance,roundLimit:c.rounds,realtimeEntry:c.realtimeEntry,capitalLimits:{...defaultCapitalLimits,...c.capitalLimits,...c.agents[0]?.capitalLimits},models:Object.fromEntries(c.agents.map(a=>[a.sourceAgentId,a.aiConnectionId]))});}
    renderSetup();$('#setup-dialog').showModal();
    try{acceptApiSettings(await window.WarriorCardRuntime.request('/api/ai/settings'));if(setupDraft)renderSetup();}catch{if(setupDraft){setupMessage='apiUnavailable';updateSetupSummary();}}
  }
  function setupCapital(){const c=setupDraft.capitalLimits;return `<details class="setup-models setup-capital"><summary>${t('capitalLimitsTitle')}</summary><p class="small-note">${t('capitalLimitsHint')}</p><p class="small-note">${t('capitalBasisHint')}</p>${[['maxStakePct','capitalPerBet'],['exposurePct','capitalExposure']].map(([key,label])=>`<label><span>${t(label)}</span><input type="number" min="1" max="100" step="1" required data-capital-limit="${key}" value="${c[key]}" aria-label="${t(label)}"></label>`).join('')}<label><span>${t('capitalStopLoss')}</span><input type="number" min="1" max="99" step="1" data-capital-limit="stopLossPct" value="${c.stopLossPct??''}" placeholder="${t('capitalStopOff')}" aria-label="${t('capitalStopLoss')}"></label><label><span>${t('capitalAllowAllIn')}</span><input type="checkbox" data-capital-limit="allowAllIn" ${c.allowAllIn?'checked':''}></label></details>`;}
  function setupModels(){return `<details class="setup-models"><summary>${t('model')}</summary>${setupDraft.roster.map(id=>{const c=state.cards.find(c=>c.id===id);if(!c)return '';const selected=setupDraft.models[id]||'none';return `<label><span>${esc(cardName(c))}</span><select data-setup-model="${esc(id)}"><option value="none" ${selected==='none'?'selected':''}>${t('battleLocalRules')}</option>${Object.entries(apiProviders).map(([key,provider])=>`<option value="${key}" ${selected===key?'selected':''}>${esc(provider.name||t('apiCustom'))}${apiConfigs[key]?.tested?'':' · '+t('apiUnconnected')}</option>`).join('')}</select></label>`;}).join('')}</details>`;}
  function setupSegments(key,options){return `<div class="setup-segments" role="group" aria-label="${t(key==='roundLimit'?'setupRounds':key)}">${options.map(([value,label])=>`<button type="button" data-setup-key="${key}" data-value="${value}" aria-pressed="${String(setupDraft[key])===String(value)}">${label}</button>`).join('')}</div>`;}
  function renderSetup(){if(!setupDraft)return;$('#setup-dialog').innerHTML=`<div class="dialog-head"><h2 id="setup-title">${esc(battleView.pending?.name||sessionName(battleView.battles.length+1))}</h2><button type="button" class="icon-button" data-action="close-setup" aria-label="${t('close')}">${icon('close')}</button></div><form id="setup-form" class="setup-body"><section class="setup-cast">${collectionNotice()}<div class="setup-cast-heading"><h3>${t('setupChoose')}</h3><span id="setup-count"></span></div><div class="setup-characters">${(battleView.pending?battleView.pending.config.agents.map(a=>a.cardSnapshot):state.cards).map(c=>`<label class="setup-character"><input type="checkbox" data-setup-card="${esc(c.id)}" ${setupDraft.roster.includes(c.id)?'checked':''}>${imageTag(c)}<b>${esc(cardName(c))}</b></label>`).join('')||empty()}</div><div class="setup-cast-footer">${button('goDraw','go-draw','secondary setup-draw-button','','draw')}</div></section><section class="setup-options"><div class="setup-label">${t('asset')}</div>${setupSegments('asset',['BTC','ETH','BNB'].map(v=>[v,v]))}<div class="setup-label">${t('period')}</div>${setupSegments('period',[['5m',t('fiveMin')],['15m',t('fifteenMin')],['1h',t('oneHour')],['1d',t('oneDay')]])}<label class="setup-label" for="setup-budget">${t('budget')}</label><div class="setup-budget"><button type="button" data-action="setup-minus" aria-label="${t('decreaseBudget')}">−</button><label><input id="setup-budget" type="number" min="10" max="1000" step="1" required value="${Number.isFinite(setupDraft.budget)?setupDraft.budget:''}" aria-label="${t('budget')}"><span>U</span></label><button type="button" data-action="setup-plus" aria-label="${t('increaseBudget')}">+</button></div><div class="setup-budget-presets">${setupSegments('budget',[[10,'10 U'],[100,'100 U']])}</div><div class="setup-label">${t('setupRounds')}</div>${setupSegments('roundLimit',[[10,t('tenRounds')],[20,t('twentyRounds')],['until-loss',t('untilLoss')]])}<label class="setup-realtime" for="setup-realtime"><span>${t('realtimeEntry')}</span><input id="setup-realtime" type="checkbox" ${setupDraft.realtimeEntry?'checked':''}></label><p class="setup-note">${t('setupRealtimeHint')}</p>${setupModels()}${setupCapital()}</section><div class="setup-footer"><div class="setup-total"><span>${t('totalBudget')}</span><strong id="setup-total"></strong></div><div id="setup-errors" role="alert"></div><button type="submit" class="primary setup-submit">${t('startDemo')}</button><p class="setup-note setup-disclaimer">${t('setupDemoOnly')}</p></div></form>`;updateSetupSummary();updateDrawStatus();}
  function updateSetupSummary(){
    if(!setupDraft)return;const pending=battleView.pending,busy=battleView.busy;
    $('#setup-total').textContent=Number.isFinite(setupDraft.budget)?(setupDraft.budget*setupDraft.roster.length)+' USDT':'—';
    $('#setup-form').querySelectorAll('[data-setup-key=budget]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.value)===setupDraft.budget)));
    $('#setup-count').textContent=setupDraft.roster.length+' / 8';
    const errors=rosterErrors(setupDraft);if(!collectionReady()&&!pending)errors.push(collectionMessage());
    if(setupDraft.roster.some(id=>{const connection=setupDraft.models[id]||'none';return connection!=='none'&&!apiConfigs[connection]?.tested;}))errors.push('setupModelUnverified');
    $('#setup-errors').textContent=battleView.pendingInvalid?t('battlePendingDamaged'):pending?t('battlePendingCreation'):errors.map(t).join(' ')+(setupMessage?' '+t(setupMessage):'');
    for(const el of $('#setup-form').querySelectorAll('input,select,button'))el.disabled=busy||!!pending;
    const submit=$('#setup-form [type=submit]');submit.disabled=busy||battleView.pendingInvalid||(!pending&&(!!errors.length||!$('#setup-form').checkValidity()));submit.textContent=t(busy?'battleCreating':pending?'battleRetryCreation':'startDemo');
    if(!busy&&!pending){$('[data-action=setup-minus]').disabled=setupDraft.budget<=10;$('[data-action=setup-plus]').disabled=setupDraft.budget>=1000;$('#setup-form').querySelectorAll('[data-setup-card]').forEach(el=>el.disabled=!el.checked&&setupDraft.roster.length>=8);}
  }
  async function startSetup(){
    if(!setupDraft||battleView.busy||(!battleView.pending&&!$('#setup-form').reportValidity()))return;
    if(!battleView.pending){const revision=collectionView.data?.revision;if(!await collectionService.refresh())return;if(!setupDraft)return;if(collectionView.data?.revision!==revision){setupMessage='cardChanged';renderSetup();return;}}
    const draft=structuredClone(setupDraft);draft.roster=draft.roster.filter(id=>state.cards.some(c=>c.id===id));
    if(!battleView.pending&&rosterErrors(draft).length){renderSetup();return;}
    const config=battleView.pending?.config||{collectionRevision:collectionView.data.revision,automaticName:true,initialBalance:draft.budget,period:draft.period,rounds:draft.roundLimit,realtimeEntry:draft.realtimeEntry,actionUrgeLevel:state.controls.urge,emotionLevel:state.controls.tilt,globalControls:{...state.controls},capitalLimits:{...draft.capitalLimits},
      agents:draft.roster.map((id,index)=>{const c=state.cards.find(c=>c.id===id),connection=draft.models[id]||'none',saved=apiConfigs[connection];return {id:'card-'+(index+1),sourceAgentId:id,name:cardName(c),coin:draft.asset,strategy:c.personaId,cardSnapshot:structuredClone(c),aiConnectionId:connection,aiConnectionRevision:saved?.revision||null,aiModelLabel:saved?.model||''};})};
    try{
      const battle=await battleService.start(sessionName(battleView.battles.length+1),config);if(!battle)return;
      state.capitalLimits={...battle.config.agents[0]?.capitalLimits};
      Object.assign(state,{roster:battle.config.agents.map(a=>a.sourceAgentId).filter(id=>state.cards.some(c=>c.id===id)),asset:battle.config.agents[0].coin,period:battle.config.period,budget:battle.config.initialBalance,roundLimit:battle.config.rounds||'until-loss',realtimeEntry:battle.config.realtimeEntry,models:{...state.models,...Object.fromEntries(battle.config.agents.map(a=>[a.sourceAgentId,a.aiConnectionId]))},battleSequence:battle.automaticSequence||battleView.battles.length});autoBind();persist();
      $('#setup-dialog').close();go('arena');
    }catch{setupMessage='battleActionFailed';updateSetupSummary();}
  }
  let rankingHistory=[],rankingBattleIds=[],rankingState='idle',rankingRequest=0;
  function rankStats(battles){return battles.reduce((sum,b)=>{for(const key of Object.keys(sum))sum[key]+=b[key];return sum;},window.WarriorCardResults.empty());}
  async function refreshRanking(){
    const requestId=++rankingRequest;rankingState='loading';if(page==='ranking')render();
    try{
      const api=window.Warrior.simulationApi,list=await api.list();
      if(!Array.isArray(list?.battles))throw Error('RANKING_DATA_INVALID');
      const reports=[],battles=list.battles.filter(b=>!b.placeholder);
      for(let i=0;i<battles.length;i+=4)reports.push(...await Promise.all(battles.slice(i,i+4).map(b=>api.report(b.id))));
      const data=window.WarriorCardResults.history(reports);
      if(requestId!==rankingRequest)return;
      rankingHistory=data.entries.map(item=>{if(!D.personas[item.personaId])throw Error('RANKING_DATA_INVALID');return {...item,card:{...(item.cardSnapshot||{}),id:item.id,personaId:item.personaId}};});
      rankingBattleIds=data.battleIds;rankingState='ready';
    }catch{if(requestId!==rankingRequest)return;rankingHistory=[];rankingBattleIds=[];rankingState='error';}
    if(page==='ranking')render();
  }
  const rankPercent=(n,total)=>total?`${(n/total*100).toFixed(1)}%`:'—';
  const rankMoney=cents=>(cents/100).toFixed(2);
  const rankSigned=cents=>(cents>0?'+':cents<0?'−':'')+rankMoney(Math.abs(cents));
  const rankTone=cents=>cents>0?'gain':cents<0?'loss':'rank-neutral';
  const rankScopeKey=()=>rankingScope===1?'rankLatest':rankingScope===3?'rankThree':'rankAll';
  function rankRows(){if(rankingState!=='ready')return [];const ids=new Set(rankingScope===0?rankingBattleIds:rankingBattleIds.slice(-rankingScope));return rankingHistory.map(item=>{const battles=item.battles.filter(b=>ids.has(b.id)),net=rankStats(battles).net;return {...item,battles,net};}).filter(item=>item.battles.length).sort((a,b)=>b.net-a.net||a.id.localeCompare(b.id));}
  function renderRanking(){return `<div class="ranking-toolbar"><div class="ranking-tabs" role="group" aria-label="${t('rankRange')}">${[[1,'rankLatest'],[3,'rankThree'],[0,'rankAll']].map(([value,key])=>`<button type="button" data-ranking-scope="${value}" aria-pressed="${rankingScope===value}">${t(key)}</button>`).join('')}</div><span>${t('rankDemoNote')}</span></div><section class="ranking-board"><div class="ranking-columns" aria-hidden="true"><span>${t('rank')}</span><span>${t('character')}</span><span>${t('net')}</span><span>${t('rankBattles')}</span></div><div class="ranking-rows">${rankingState!=='ready'?`<div class="ranking-empty" role="status">${t(rankingState==='error'?'rankLoadFailed':'rankLoading')}${rankingState==='error'?button('rankRetry','retry-ranking','secondary'):''}</div>`:!rankRows().length?`<div class="ranking-empty" role="status">${t('rankEmpty')}</div>`:''}${rankRows().map((row,i)=>`<button type="button" class="ranking-row" data-action="ranking-detail" data-id="${esc(row.card.id)}" data-net="${row.net}"><span class="ranking-position">${String(i+1).padStart(2,'0')}</span><span class="ranking-person">${imageTag(row.card)}<b>${esc(cardName(row.card))}</b></span><strong class="${rankTone(row.net)}">${rankSigned(row.net)}<small> U</small></strong><span class="ranking-count">${row.battles.length}<span aria-hidden="true"> ↗</span></span></button>`).join('')}</div></section>`;}
  function openRankingDetail(id,refresh=false){
    const row=rankRows().find(r=>r.card.id===id);if(!row)return;rankingDetailId=id;
    const stats=rankStats(row.battles),all=rankStats(rankingHistory.find(r=>r.card.id===id).battles);
    const metric=(key,label,value,tone='')=>`<div class="ranking-stat" data-stat="${key}"><span>${t(label)}</span><strong class="${tone}">${value}</strong></div>`;
    const money=value=>`${rankMoney(value)}<small> U</small>`;
    $('#ranking-dialog').innerHTML=`<div class="dialog-head"><h2 id="ranking-detail-title">${esc(cardName(row.card))}</h2><button type="button" class="icon-button" data-action="close-ranking" aria-label="${t('close')}">${icon('close')}</button></div>
      <div class="ranking-detail-body">
        <div class="ranking-detail-caption"><b>${t(rankScopeKey())}</b><span>${t('rankHistoryDemo')}</span></div>
        <div class="ranking-summary-grid">
          ${metric('net','rankNetProfit',`${rankSigned(stats.net)}<small> U</small>`,rankTone(stats.net))}
          ${metric('bets','rankBetCount',stats.bets)}
          ${metric('winRate','rankScopeWinRate',rankPercent(stats.wins,stats.wins+stats.losses))}
          ${metric('overallRate','rankOverallWinRate',rankPercent(all.wins,all.wins+all.losses))}
        </div>
        <section class="ranking-distribution" aria-labelledby="ranking-distribution-title">
          <div class="ranking-section-heading"><h3 id="ranking-distribution-title">${t('rankOutcomeSplit')}</h3><span>${t('rankSettledOnly')}</span></div>
          <div class="ranking-outcome-bar" aria-hidden="true"><span style="width:${stats.wins+stats.losses?stats.wins/(stats.wins+stats.losses)*100:0}%"></span></div>
          <div class="ranking-outcome-labels"><span class="gain">${t('rankWinningBets')} <b data-stat="wins">${stats.wins}</b></span><span class="loss">${t('rankLosingBets')} <b data-stat="losses">${stats.losses}</b></span><span>${t('rankNeutralBets')} <b data-stat="neutral">${stats.neutral}</b></span></div>
        </section>
        <section class="ranking-funds" aria-labelledby="ranking-funds-title">
          <div class="ranking-section-heading"><h3 id="ranking-funds-title">${t('rankFundStats')}</h3></div>
          <div class="ranking-funds-grid">
            ${metric('stake','rankTotalStaked',money(stats.stake))}
            ${metric('payout','rankTotalPayout',money(stats.payout))}
            ${metric('roi','rankStakeRoi',rankPercent(stats.net,stats.stake),rankTone(stats.net))}
            ${metric('average','rankAverageStake',stats.bets?money(stats.stake/stats.bets):'—')}
            ${metric('profit','rankGrossProfit',money(stats.profit),'gain')}
            ${metric('loss','rankGrossLoss',money(stats.loss),'loss')}
          </div>
        </section>
        <p class="ranking-stat-note">${t('rankStatsDefinition')}<br>${t('rankOverallSample')} <b data-stat="allWins">${all.wins}</b> / <b data-stat="allBets">${all.bets}</b></p>
      </div>`;
    if(!refresh){if(!$('#ranking-dialog').open)$('#ranking-dialog').showModal();$('#ranking-dialog').scrollTop=0;}
  }


  function indicatorTags(c){return D.personas[c.personaId].required.map(key=>{const def=window.WarriorStrategyCatalog.indicators[key];return `<span>${esc(def?t('indicator_'+key):key)}</span>`;}).join('');}
  function comparisonTable(c,baseline=null){
    const p=D.personas[c.personaId],base=baseline?baseline.stats:p.base;
    const rows=['urge','sensitivity','variance'].map((key,i)=>{
      const delta=c.stats[i]-base[i],change=delta===0?'—':(delta>0?'+':'−')+Math.abs(delta);
      return `<tr><th scope="row">${t(key)}</th><td class="base-value">${base[i]}</td><td class="current-value"><span class="compare-number">${c.stats[i]}</span><span class="compare-delta ${delta===0?'is-zero':''}" aria-label="${t('statDelta')} ${delta>0?'+':''}${delta}">${change}</span></td></tr>`;
    }).join('');
    return `<div class="comparison-panel"><table class="compare-table"><colgroup><col class="attribute-col"><col class="base-col"><col class="current-col"></colgroup><thead><tr><th scope="col">${t('attributeLabel')}</th><th scope="col">${t(baseline?'ownedCard':'original')}</th><th scope="col">${t(baseline?'drawnCard':'currentCard')}</th></tr></thead><tbody>${rows}<tr><td colspan="3" class="core-description"><strong>${t('core')}</strong><p>${esc(t('core_'+c.personaId))}</p></td></tr></tbody></table></div>`;
  }
  function openCard(c,refresh=false){if(!c)return;dialogCard=c;const reference=isReference(c);$('#card-dialog').innerHTML=`<div class="dialog-head"><div><h2 id="dialog-title">${esc(cardName(c))}</h2></div><button class="icon-button" data-action="close-card" aria-label="${t('close')}">${icon('close')}</button></div><div class="dialog-body">${strategyCard(c)}<div class="detail-main">${reference?notice(ownsPersona(c.personaId)?'originalPreview':'unownedPreview'):''}${identityNoticeDismissed?'':`<div class="notice identity-notice">${icon('info')}<span>${t('lockText')}</span><button class="notice-dismiss" data-action="dismiss-identity-notice" aria-label="${t('dismissNotice')}">${icon('close')}</button></div>`}${comparisonTable(c)}<h3>${t('traitEffects')}</h3><div class="metric-chips">${cardTraitIds(c).map(key=>`<span>${t('trait_'+key)}</span>`).join('')}</div><h3>${t('indicators')}</h3><div class="indicator-list">${indicatorTags(c)}</div><h3>${t('model')}</h3><p>${t('modelHint')}</p><div class="detail-actions">${reference?button('goDraw','go-draw','primary','','draw'):state.pendingDraw?.id===c.id?button('replaceOwned','replace-owned','primary'):button(isSaved(c)?'saved':'save','save-detail','secondary',isSaved(c)?'disabled':'','save')+(isSaved(c)?button('refreshAttributes','reroll-attributes','primary',`data-id="${esc(c.id)}"`):'')}</div></div></div>`;if(!refresh&&!$('#card-dialog').open)$('#card-dialog').showModal();updateDrawStatus();syncArenaPrice();}
  function openControls(){
    const live=battleView.battle;if(!live||battleView.status!=='ready'||battleView.busy||['ended','settling'].includes(live.status))return;
    controlDraft={...defaultControls,...live.config.globalControls,urge:live.config.globalControls?.urge??live.config.actionUrgeLevel??0,tilt:live.config.globalControls?.tilt??live.config.emotionLevel??0};
    controlSession={id:live.id,revision:live.config.controlsRevision||0,cards:battleCards(),busy:false,error:null};
    renderControls();$('#controls-dialog').showModal();
  }
  async function applyControls(){
    const session=controlSession;if(!session||session.busy)return;
    session.busy=true;session.error=null;const controls={...controlDraft};renderControls();
    try{
      await battleService.applyControls(session.id,controls,session.revision);
      state.controls=controls;state.pending=null;persist();
      if(controlSession===session){$('#controls-dialog').close();toast('controlsApplied');}
    }catch(error){if(controlSession===session)session.error=error.code==='CONTROLS_CHANGED'?'controlsChanged':'controlsFailed';}
    finally{session.busy=false;if(controlSession===session&&$('#controls-dialog').open)renderControls();}
  }
  function controlImpact(){return (controlSession?.cards||[]).slice(0,4).map(c=>`<div><span>${esc(cardName(c))}</span><b>${c.stats[0]} → ${effectiveUrge(c,controlDraft)}</b></div>`).join('');}
  function renderControls(){$('#controls-dialog').innerHTML=`<div class="dialog-head"><h2 id="controls-title">${t('global')}</h2><button class="icon-button" data-action="close-controls" aria-label="${t('close')}">${icon('close')}</button></div><div class="controls-body"><fieldset class="controls-fields" ${controlSession?.busy?'disabled':''}><p class="small-note" style="margin:0 0 20px">${t('globalDesc')}</p><div class="preset-row">${['original','social','chaos'].map(key=>`<button data-preset="${key}">${t('preset_'+key)}</button>`).join('')}</div>${[['urge','globalUrge',100,'urgeHint'],['tilt','globalTilt',100,'tiltHint'],['gain','amplify',200,'gainHint'],['variance','globalVariance',100,'varianceHint']].map(([key,label,max,hint])=>`<div class="range-field"><label class="range-label" for="control-${key}">${t(label)}<output id="output-${key}">${controlDraft[key]}${key==='gain'?'%':''}</output></label><input id="control-${key}" data-control="${key}" type="range" min="0" max="${max}" step="5" value="${controlDraft[key]}"><p class="range-hint">${t(hint)}</p></div>`).join('')}<label class="field-caption" for="cooling">${t('coolSpeed')}</label><select class="field-select" id="cooling">${['slow','normal','fast'].map(key=>`<option value="${key}" ${controlDraft.cooling===key?'selected':''}>${t(key)}</option>`).join('')}</select><div class="impact-preview"><small>${t('impact')}</small><section id="control-impact">${controlImpact()}</section></div>${button(controlSession?.busy?'controlsSaving':'applyNext','apply-controls','primary full')}</fieldset>${controlSession?.error?`<p role="alert" class="small-note">${t(controlSession.error)}</p>`:''}</div>`;}
  function render(){document.documentElement.lang=locales[state.locale].lang;document.title=t('brand')+' · '+t('nav_'+(pages.includes(page)?page:'arena'));document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=t(el.dataset.copy));$('#language').value=state.locale;$('#language').setAttribute('aria-label',t('languageLabel'));$('#navigation').setAttribute('aria-label',t('mainNavigation'));$('#mobile-navigation').setAttribute('aria-label',t('mobileNavigation'));nav();$('#api-connect').setAttribute('aria-label',t('apiSettings'));$('#wallet-shortcut').setAttribute('aria-label',t('walletLabel'));main.innerHTML=({draw:renderDraw,collection:renderCollection,arena:renderArena,ranking:renderRanking}[page]||renderDraw)();updateDrawStatus();syncArenaPrice();}
  function refreshCollectionFilters(){const offset=$('.category-tabs')?.scrollLeft||0;render();const tabs=$('.category-tabs');if(tabs)tabs.scrollLeft=offset;}
  function go(next){next=({reports:'arena',overview:'arena',roster:'collection',ai:'arena'})[next]||next;if(!pages.includes(next))return;if(next!=='collection')selectingLineup=false;page=next;history.replaceState(null,'','#'+next);render();if(next==='ranking')refreshRanking();if(next==='arena')battleService.refresh();window.scrollTo({top:0,behavior:'instant'});}
  document.addEventListener('click',event=>{
    const el=event.target.closest('button, .strategy-card[role=button]');if(!el)return;
    if(el.dataset.rankingScope){const value=Number(el.dataset.rankingScope);if([1,3,0].includes(value)){rankingScope=value;render();$('[data-ranking-scope="'+value+'"]').focus();}return;}
    if(el.dataset.page){go(el.dataset.page);return;}
    if(el.dataset.category){category=el.dataset.category;refreshCollectionFilters();return;}
    if(el.dataset.filter){filter=el.dataset.filter;refreshCollectionFilters();return;}
    if(el.dataset.preset){controlDraft={...{original:{urge:0,tilt:0,gain:100,cooling:'normal',variance:0},social:{urge:40,tilt:30,gain:100,cooling:'normal',variance:20},chaos:{urge:100,tilt:80,gain:150,cooling:'slow',variance:50}}[el.dataset.preset]};renderControls();return;}
    if(el.dataset.apiProvider&&apiDrafts&&!apiBusy){apiProvider=el.dataset.apiProvider;apiMessage='';renderApiPreview();$(`[data-api-provider="${apiProvider}"]`).focus();return;}
    if(el.dataset.setupKey&&setupDraft){const key=el.dataset.setupKey;setupDraft[key]=(key==='budget'||key==='roundLimit')&&el.dataset.value!=='until-loss'?Number(el.dataset.value):el.dataset.value;renderSetup();$(`[data-setup-key="${key}"][data-value="${el.dataset.value}"]`).focus();return;}
    const action=el.dataset.action;if(!action)return;
    const getCard=()=>cardById(el.dataset.id)||(/^(original|catalog)-/.test(el.dataset.id||'')?D.makeCard(el.dataset.id.replace(/^(original|catalog)-/,''),'original',0,el.dataset.id):null);
    if(action==='toggle-lineup-selection'){selectingLineup=!selectingLineup;refreshCollectionFilters();$('[data-action=toggle-lineup-selection]').focus({preventScroll:true});}
    else if(action==='open-api')openApiPreview();
    else if(action==='close-api')$('#api-preview-dialog').close();
    else if(action==='toggle-api-key'){const input=$('#api-preview-key'),show=input.type==='password';input.type=show?'text':'password';el.textContent=t(show?'apiHideKey':'apiShowKey');el.setAttribute('aria-pressed',String(show));}
    else if(action==='clear-api')clearApiSettings();
    else if(action==='test-api')saveApiPreview(true);
    else if(action==='retry-ranking')refreshRanking();
    else if(action==='collection-use-service')void collectionService.useService().catch(()=>toast('storageError'));
    else if(action==='retry-collection')void collectionService.refresh({retry:true});
    else if(action==='draw')requestDraw();
    else if(action==='reroll-attributes')refreshAttributes(el.dataset.id);
    else if(action==='replace-owned')openReplacement();
    else if(action==='keep-owned')keepOwned();
    else if(action==='close-replacement')$('#replace-dialog').close();
    else if(action==='confirm-replacement')confirmReplacement();
    else if(action==='save'){saveCard(state.featured);render();}
    else if(action==='detail-featured')openCard(state.featured);
    else if(action==='detail')openCard(getCard());
    else if(action==='save-detail'){saveCard(dialogCard);openCard(dialogCard,true);render();}
    else if(action==='add')addCard(getCard());
    else if(action==='remove')removeCard(el.dataset.id);
    else if(action==='dismiss-identity-notice'){identityNoticeDismissed=true;el.closest('.identity-notice').remove();$('#card-dialog [data-action=close-card]').focus({preventScroll:true});}
    else if(action==='close-card')$('#card-dialog').close();
    else if(action==='controls')openControls();
    else if(action==='close-controls')$('#controls-dialog').close();
    else if(action==='apply-controls')void applyControls();
    else if(action==='open-setup')openSetup();
    else if(action==='retry-battle')battleService.refresh();
    else if(['pause-battle','resume-battle','end-battle'].includes(action))battleService.control(action.split('-')[0]).catch(()=>{});
    else if((action==='setup-minus'||action==='setup-plus')&&setupDraft){setupDraft.budget=Math.max(10,Math.min(1000,(Number.isFinite(setupDraft.budget)?setupDraft.budget:10)+(action==='setup-plus'?10:-10)));$('#setup-budget').value=setupDraft.budget;updateSetupSummary();}
    else if(action==='close-setup')$('#setup-dialog').close();
    else if(action==='ranking-detail')openRankingDetail(el.dataset.id);
    else if(action==='close-ranking')$('#ranking-dialog').close();
    else if(action==='battle-detail')openBattleDetail(el.dataset.id);
    else if(action==='close-battle-detail')$('#battle-detail-dialog').close();
    else if(action==='go-draw'){$('#card-dialog').close();$('#setup-dialog').close();go('draw');}
    else if(action==='view-owned'){const persona=el.dataset.persona;filter='owned';category='all';render();const card=[...main.querySelectorAll('.collection-item')].find(item=>cardById(item.dataset.cardId)?.personaId===persona);if(card){card.scrollIntoView({block:'center'});card.querySelector('[data-action=detail]').focus({preventScroll:true});}}
    else if(pages.includes(action))go(action);
  });
  document.addEventListener('keydown',event=>{if(event.target.matches('.strategy-card[role=button]')&&['Enter',' '].includes(event.key)){event.preventDefault();if(!event.repeat)event.target.click();}});
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.dataset.setupCard&&setupDraft){const id=el.dataset.setupCard;if(el.checked){if(setupDraft.roster.length<8&&!setupDraft.roster.includes(id))setupDraft.roster.push(id);else el.checked=false;}else setupDraft.roster=setupDraft.roster.filter(x=>x!==id);const models=$('.setup-models'),open=models.open;models.outerHTML=setupModels();$('.setup-models').open=open;updateSetupSummary();}
    else if(el.dataset.lineup){if(page!=='collection'||!selectingLineup)return;const id=el.dataset.lineup,offset=$('.category-tabs')?.scrollLeft||0;if(el.checked)addCard(cardById(id));else removeCard(id);const input=[...main.querySelectorAll('[data-lineup]')].find(item=>item.dataset.lineup===id);if(input){input.checked=state.roster.includes(id);input.focus({preventScroll:true});}if($('.category-tabs'))$('.category-tabs').scrollLeft=offset;}
    else if(el.id==='ownership-select'){if(['all','owned','unowned'].includes(el.value)){filter=el.value;refreshCollectionFilters();$('#ownership-select').focus({preventScroll:true});}}
    else if(el.id==='battle-select')battleService.refresh(el.value);
    else if(el.dataset.setupModel&&setupDraft){setupDraft.models[el.dataset.setupModel]=el.value;updateSetupSummary();}
    else if(el.id==='cooling')controlDraft.cooling=el.value;
  });
  document.addEventListener('submit',event=>{if(event.target.id==='setup-form'){event.preventDefault();startSetup();}else if(event.target.id==='api-preview-form'){event.preventDefault();saveApiPreview();}});
  document.addEventListener('input',event=>{const el=event.target;if(setupDraft&&el.dataset.capitalLimit){const key=el.dataset.capitalLimit;setupDraft.capitalLimits[key]=key==='allowAllIn'?el.checked:el.value===''?null:Number(el.value);updateSetupSummary();}if(el.dataset.apiField&&apiDrafts){apiDrafts[apiProvider][el.dataset.apiField]=el.value;$('#api-preview-result').textContent='';}if(setupDraft){if(el.id==='setup-budget')setupDraft.budget=el.value===''?NaN:Number(el.value);if(el.id==='setup-realtime')setupDraft.realtimeEntry=el.checked;if(el.id.startsWith('setup-'))updateSetupSummary();}if(el.dataset.control){const key=el.dataset.control;controlDraft[key]=Number(el.value);$('#output-'+key).textContent=el.value+(key==='gain'?'%':'');$('#control-impact').innerHTML=controlImpact();}});
  $('#language').onchange=()=>{const locale=$('#language').value;if(!Object.hasOwn(locales,locale))return;state.locale=locale;persist();render();if($('#ranking-dialog').open)openRankingDetail(rankingDetailId,true);if($('#battle-detail-dialog').open)openBattleDetail(battleDetailId,true);if($('#card-dialog').open)openCard(dialogCard,true);if($('#controls-dialog').open)renderControls();if($('#replace-dialog').open)openReplacement(true);if($('#setup-dialog').open)renderSetup();if($('#card-wallet-dialog').open)walletUI.render();if($('#api-preview-dialog').open)renderApiPreview();window.dispatchEvent(new CustomEvent('warrior-language-change',{detail:{locale}}));};
  $('#wallet-shortcut').onclick=()=>void walletUI.open();
  $('#api-preview-dialog').addEventListener('close',()=>{apiDrafts=null;$('#api-preview-dialog').innerHTML='';});
  $('#setup-dialog').addEventListener('close',()=>setupDraft=null);
  $('#card-dialog').addEventListener('close',()=>dialogCard=null);
  $('#battle-detail-dialog').addEventListener('close',()=>battleDetailId=null);
  $('#ranking-dialog').addEventListener('close',()=>rankingDetailId=null);
  window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
  const requested=location.hash.slice(1),hash=({reports:'arena',overview:'arena',roster:'collection',ai:'arena'})[requested]||requested;if(pages.includes(hash)){page=hash;if(hash!==requested)history.replaceState(null,'','#'+hash);}
  render();void collectionService.refresh({retry:true});battleService.refresh();if(page==='ranking')refreshRanking();
  setInterval(()=>{updateDrawStatus();const budget=readDrawBudget();if(collectionReady()&&budget.nextAt!==null&&collectionService.time()>=budget.nextAt)void collectionService.refresh();},1000);
  setInterval(()=>{if(page==='arena'&&!document.hidden&&!setupDraft)battleService.refresh();if(!document.hidden&&collectionReady()&&['draw','collection'].includes(page))void collectionService.refresh();},5000);
  window.addEventListener('focus',()=>{updateDrawStatus();if(collectionReady())void collectionService.refresh();});
  document.addEventListener('visibilitychange',()=>{updateDrawStatus();if(!document.hidden&&collectionReady())void collectionService.refresh();});
  window.CardLab={getSnapshot:()=>structuredClone({...state,drawBudget:readDrawBudget(),collection:collectionView}),getPage:()=>page};
  window.WarriorCardDevice.mount({t,words:()=>Object.fromEntries(Array.from({length:window.WarriorCardDevice.wordCount},(_,i)=>[copy['deviceWord'+i][0],t('deviceWord'+i)])),profile:p=>({name:pName(p.strategy),image:D.personas[p.strategy]?.image||''}),openStrategy:async(battleId,agentId)=>{go('arena');await battleService.refresh(battleId);if(battleView.status!=='ready'||battleView.battle?.id!==battleId||!battleCards().some(c=>c.id===agentId))throw Error('BATTLE_NOT_FOUND');openBattleDetail(agentId);}});

})();
/* Generated shared chart: public/agent-equity.js. Run scripts/sync-card-chart.cjs after editing the source. */
/* Book equity from the existing paper ledger. No price sampling or extra requests. */
((root) => {
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  const money=value=>Math.round(value*1e8)/1e8;
  function buildSeries(simulation,agent) {
    const initial=simulation?.config?.initialBalance;
    if(!finite(initial)||!agent||!Array.isArray(agent.orders))return null;
    const events=[];
    for(const order of agent.orders) {
      if(order.status==='OPEN')continue;
      const payout=finite(order.payout)?order.payout:order.quote?.source==='offline-simulated'?(order.status==='LOST'?0:order.status==='WON'&&finite(order.quote.odds)?money(order.amount*order.quote.odds):null):null;
      if(!['WON','LOST','SPLIT'].includes(order.status)||!finite(order.amount)||!finite(payout))return null;
      const at=order.settledAt??order.end;
      if(!finite(at))return null;
      events.push({at,delta:payout-order.amount,kind:'settlement'});
    }
    for(const topUp of agent.topUps||[]) {
      if(!finite(topUp.at)||!finite(topUp.amount))return null;
      events.push({at:topUp.at,delta:topUp.amount,kind:'capital'});
    }
    events.sort((a,b)=>a.at-b.at);
    const deposits=events.filter(e=>e.kind==='capital').reduce((sum,e)=>sum+e.delta,0);
    if(Math.abs(deposits-(agent.addedCapital||0))>1e-6)return null;
    const current=finite(agent.equity)?agent.equity:finite(agent.cash)&&finite(agent.reserved)?agent.cash+agent.reserved:null;
    const final=money(initial+events.reduce((sum,e)=>sum+e.delta,0));
    if(!finite(current)||Math.abs(final-current)>1e-6)return null;
    const firstOrder=agent.orders.reduce((first,o)=>finite(o.placedAt??o.start)?Math.min(first,o.placedAt??o.start):first,Infinity);
    const start=Math.min(...[simulation.createdAt,firstOrder,events[0]?.at,simulation.serverTime].filter(finite));
    if(!finite(start))return null;
    const points=[{at:start,value:initial,kind:'initial',delta:0}];
    for(const event of events)points.push({...event,value:money(points.at(-1).value+event.delta)});
    const end=Math.max(points.at(-1).at,simulation.endedAt??simulation.serverTime??points.at(-1).at);
    points.push({at:end,value:final,kind:'current',delta:0});
    return {points,current:final,profit:money(final-initial-deposits),deposits,hasChanges:events.length>0};
  }
  if(typeof module==='object'&&module.exports){module.exports={buildSeries};return;}
  const doc=root.document,NS='http://www.w3.org/2000/svg';
  const node=(tag,text,cls)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
  const svgNode=(tag,attrs)=>{const el=doc.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
  const numeric=(tag,text,cls)=>{const el=node(tag,text,cls);el.dataset.noTranslate='';return el;};
  const number=value=>value.toLocaleString(doc.documentElement.lang,{minimumFractionDigits:2,maximumFractionDigits:2});
  let active=null;
  function render(section,simulation,agent,selected=null,translate=value=>value,showFlat=false) {
    const node=(tag,text,cls)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=translate(text);if(cls)el.className=cls;return el;};
    const series=buildSeries(simulation,agent);
    section.replaceChildren();
    const heading=node('div',undefined,'equity-chart-heading');heading.append(node('strong','资金变化'),node('span','模拟资金'));
    section.append(heading);
    if(!series){section.append(node('p','历史记录不完整，暂不绘制曲线。','equity-chart-note'));return;}
    const stats=node('div',undefined,'equity-chart-stats');
    for(const [label,value,signed]of [['当前资金',series.current,false],['已结算收益',series.profit,true]]){
      const stat=node('div');stat.append(node('small',label),numeric('strong',`${value>0&&signed?'+':''}${number(value)} USDT`));stats.append(stat);
    }
    section.append(stats);
    if(!series.hasChanges){section.append(node('p','还没有结算，资金暂未变化。','equity-chart-note'));if(!showFlat)return;}
    const {points}=series,W=440,H=180,left=50,right=16,top=15,bottom=24;
    let min=points.reduce((v,p)=>Math.min(v,p.value),Infinity),max=points.reduce((v,p)=>Math.max(v,p.value),-Infinity);
    const pad=Math.max((max-min)*.15,Math.abs(max)*.02,.01);min-=pad;max+=pad;
    const duration=points.at(-1).at-points[0].at;
    const x=(p,i)=>left+(W-left-right)*(duration?(p.at-points[0].at)/duration:i/(points.length-1));
    const y=p=>top+(max-p.value)/(max-min)*(H-top-bottom);
    const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':translate('资金变化'),preserveAspectRatio:'xMidYMid meet'});
    for(const f of [0,.5,1]){
      const py=top+f*(H-top-bottom);
      svg.append(svgNode('line',{x1:left,x2:W-right,y1:py,y2:py,class:'equity-grid'}));
      const text=svgNode('text',{x:left-7,y:py+4,'text-anchor':'end',class:'equity-axis','data-no-translate':''});text.textContent=number(max-f*(max-min));svg.append(text);
    }
    // Steps preserve the actual settlement/deposit jumps instead of inventing intermediate values.
    let path=`M ${x(points[0],0)} ${y(points[0])}`;
    points.slice(1).forEach((p,i)=>{path+=` H ${x(p,i+1)} V ${y(p)}`;});
    svg.append(svgNode('path',{d:`${path} L ${x(points.at(-1),points.length-1)} ${H-bottom} H ${left} Z`,class:'equity-area'}));
    svg.append(svgNode('path',{d:path,class:'equity-line'}));
    points.forEach((p,i)=>{if(p.kind==='capital')svg.append(svgNode('circle',{cx:x(p,i),cy:y(p),r:5,class:'equity-deposit'}));});
    const guide=svgNode('line',{y1:top,y2:H-bottom,class:'equity-guide'}),dot=svgNode('circle',{r:5,class:'equity-point'});svg.append(guide,dot);
    section.append(svg);
    const readout=node('div',undefined,'equity-chart-readout');readout.setAttribute('aria-live','polite');
    const kind=node('span'),date=numeric('time',''),value=numeric('strong','');readout.append(kind,date,value);section.append(readout);
    const slider=node('input');slider.type='range';slider.min='0';slider.max=String(points.length-1);slider.step='1';slider.setAttribute('aria-label',translate('查看资金记录'));slider.className='equity-chart-slider';section.append(slider);
    function select(index){
      index=Math.max(0,Math.min(points.length-1,index));const p=points[index];slider.value=String(index);
      section.dataset.selectedIndex=String(index);
      guide.setAttribute('x1',x(p,index));guide.setAttribute('x2',x(p,index));dot.setAttribute('cx',x(p,index));dot.setAttribute('cy',y(p));
      kind.textContent=translate(({initial:'初始资金',settlement:'订单结算',capital:'补资',current:'当前'})[p.kind]);
      date.textContent=new Intl.DateTimeFormat(doc.documentElement.lang,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(p.at);
      date.dateTime=new Date(p.at).toISOString();value.textContent=`${number(p.value)} USDT${p.kind==='capital'?` (+${number(p.delta)})`:''}`;
      slider.setAttribute('aria-valuetext',`${date.textContent}, ${value.textContent}`);
    }
    slider.oninput=()=>select(Number(slider.value));
    const pick=event=>{const box=svg.getBoundingClientRect(),target=(event.clientX-box.left)/box.width*W;let closest=0;points.forEach((p,i)=>{if(Math.abs(x(p,i)-target)<Math.abs(x(points[closest],closest)-target))closest=i;});select(closest);};
    svg.onpointerdown=event=>{svg.setPointerCapture(event.pointerId);pick(event);};svg.onpointermove=event=>{if(event.buttons)pick(event);};
    select(selected===null?points.length-1:selected);
    section.append(node('p','资金包含待结算的下注；追加资金不算收益。','equity-chart-note'));
    if(series.deposits){const legend=node('p',undefined,'equity-chart-note equity-chart-legend');legend.append(node('i'),node('span','补资'),numeric('span',`+${number(series.deposits)} USDT`));section.append(legend);}
  }
  const signature=(simulation,agent)=>JSON.stringify([simulation.endedAt,simulation.config.initialBalance,agent.equity,agent.cash,agent.reserved,agent.addedCapital,agent.topUps,agent.orders.map(o=>[o.id,o.status,o.amount,o.payout,o.settledAt,o.end,o.quote?.odds])]);
  root.WarriorEquity={buildSeries,mount(simulation,agent,{watch=true,translate=value=>value,showFlat=false}={}){
    const section=node('section',undefined,'agent-equity-chart');section.dataset.agentId=agent.id;
    active=watch?{section,battleId:simulation.id,agentId:agent.id,signature:signature(simulation,agent),translate,showFlat}:null;render(section,simulation,agent,null,translate,showFlat);return section;
  }};
  function refresh(preserve=false){
    if(!active?.section.isConnected||!doc.querySelector('#detail-dialog')?.open)return;
    const simulation=root.Warrior.state.simulation,agent=simulation?.agents?.find(a=>a.id===active.agentId);
    if(!agent||simulation.id!==active.battleId){active.section.remove();active=null;return;}
    const next=signature(simulation,agent);
    if(!preserve&&next===active.signature)return;
    active.signature=next;
    render(active.section,simulation,agent,preserve?Number(active.section.dataset.selectedIndex):null,active.translate,active.showFlat);
  }
  root.Warrior?.on?.('simulation:update',()=>refresh());
  root.addEventListener('warrior-language-change',()=>refresh(true));
})(typeof window==='object'?window:globalThis);
