/* Service-backed battle state for the card UI. Never synthesize cash or orders. */
((root) => {
  function create({api,storage,onChange=()=>{},uuid=()=>crypto.randomUUID()}) {
    const selectionKey='warrior-card-active-battle',pendingKey='warrior-card-pending-creation';
    let view={status:'idle',battles:[],battle:null,error:null,busy:false,pending:null,pendingInvalid:false},generation=0;
    try{
      const raw=storage.getItem(pendingKey),pending=raw?JSON.parse(raw):null;
      if(pending&&(!/^[a-zA-Z0-9-]{8,80}$/.test(pending.requestId)||typeof pending.name!=='string'||!Array.isArray(pending.config?.agents)||!pending.config.agents.length))throw Error('BATTLE_PENDING_INVALID');
      view.pending=pending;
    }catch{view.pendingInvalid=true;view.error='BATTLE_PENDING_INVALID';}
    const snapshot=()=>structuredClone(view);
    const emit=()=>onChange(snapshot());
    const valid=b=>b&&typeof b.id==='string'&&Array.isArray(b.agents)&&b.config&&b.agents.every(a=>Number.isFinite(a.cash)&&Number.isFinite(a.equity)&&Array.isArray(a.orders));
    function accept(battle){if(!valid(battle))throw Object.assign(Error('BATTLE_DATA_INVALID'),{code:'BATTLE_DATA_INVALID'});view.battle=battle;view.status='ready';view.error=null;}
    async function refresh(id){
      if(view.busy)return;
      const version=++generation;
      if(!view.battle){view.status='loading';emit();}
      try{
        const list=await api.list();if(!Array.isArray(list?.battles))throw Error('BATTLE_DATA_INVALID');
        const battles=list.battles.filter(b=>!b.placeholder).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
        let selected=id;try{selected ||=storage.getItem(selectionKey);}catch{}
        if(!battles.some(b=>b.id===selected))selected=battles.at(-1)?.id;
        const battle=selected?await api.report(selected):null;
        if(version!==generation)return;
        view.battles=battles;
        if(battle){accept(battle);try{storage.setItem(selectionKey,battle.id);}catch{}}
        else{view.battle=null;view.status='empty';view.error=null;}
      }catch(error){if(version!==generation)return;view.status='error';view.error=error.code||'BATTLE_SERVICE_UNAVAILABLE';}
      emit();
    }
    async function start(name,config){
      if(view.busy)return null;
      if(view.pendingInvalid)throw Object.assign(Error('BATTLE_PENDING_INVALID'),{code:'BATTLE_PENDING_INVALID'});
      view.busy=true;generation++;
      try{
        if(!view.pending){
          const pending={name,config:structuredClone(config),requestId:uuid()};
          // Persist before sending. A timeout or reload must retry the same request.
          storage.setItem(pendingKey,JSON.stringify(pending));view.pending=pending;
        }
        emit();const p=view.pending,battle=await api.create(p.name,p.config,p.requestId);accept(battle);
        // Retain the request if local cleanup fails; the server replay remains idempotent.
        storage.setItem(selectionKey,battle.id);storage.removeItem(pendingKey);view.pending=null;
        view.battles=[...view.battles.filter(b=>b.id!==battle.id),battle];
        return battle;
      }catch(error){
        view.error=error.code||'BATTLE_CREATE_UNCERTAIN';
        if([400,401,403,404,422].includes(error.status||error.statusCode)||['AI_CONNECTION_NOT_TESTED','AI_CONFIGURATION_CHANGED'].includes(error.code)){
          try{storage.removeItem(pendingKey);view.pending=null;}catch{}
        }
        throw error;
      }finally{view.busy=false;emit();}
    }
    async function control(action){
      if(view.busy||view.status!=='ready'||!view.battle)return;
      const id=view.battle.id;view.busy=true;generation++;emit();
      try{accept(await(action==='end'?api.end(id):api.setEnabled(id,action==='resume')));}
      catch(error){view.error=error.code||'BATTLE_CONTROL_FAILED';throw error;}
      finally{view.busy=false;emit();}
    }
    async function applyControls(id,controls,revision){
      if(view.busy||view.status!=='ready'||view.battle?.id!==id)throw Object.assign(Error('BATTLE_CONTROL_FAILED'),{code:'BATTLE_CONTROL_FAILED'});
      view.busy=true;generation++;emit();
      try{const battle=await api.setGlobalControls(id,controls,revision);accept(battle);return battle;}
      catch(error){
        if(error.code==='CONTROLS_CHANGED'){
          try{accept(await api.report(id));}catch{view.status='error';}
        }
        view.error=error.code||'BATTLE_CONTROL_FAILED';throw error;
      }
      finally{view.busy=false;emit();}
    }
    return {snapshot,refresh,start,control,applyControls};
  }
  const api={create};if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WarriorCardBattles=api;
})(typeof window==='undefined'?null:window);
