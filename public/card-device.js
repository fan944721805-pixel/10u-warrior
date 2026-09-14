/* Native device controls use the existing service and plugins; no UI-owned engine. */
((root)=>{
 'use strict';
 function mount({t,words,profile,openStrategy}){
  if(!root.Capacitor?.isNativePlatform?.())return null;
  const api=root.Warrior?.simulationApi,plugins=root.Capacitor.Plugins||{},background=plugins.BackgroundSettings,widget=plugins.StrategyWidget;
  const dialog=document.createElement('dialog');dialog.id='device-dialog';dialog.setAttribute('aria-labelledby','device-title');document.body.append(dialog);
  const entry=document.createElement('button');entry.type='button';entry.className='text-button device-entry';document.querySelector('.page-foot').append(entry);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let battery=null,service=null,status='',busy=false,pinAttempt=null,pinTimer=null,disposed=false,syncing=false,syncAgain=false,syncTimer=null,opening=false,openAgain=false;
  let deferred=0;try{deferred=Number(localStorage.getItem('warrior-background-reminder-v1'))||0;}catch{}
  function render(){entry.textContent=t('deviceSettings');const button=(key,action)=>`<button type="button" class="secondary full" data-device-action="${action}" ${busy?'disabled':''}>${esc(t(key))}</button>`;
   dialog.innerHTML=`<div class="dialog-head"><h2 id="device-title">${esc(t('deviceSettings'))}</h2><button type="button" class="icon-button" data-device-action="close" aria-label="${esc(t('close'))}">×</button></div><div class="device-body"><h3>${esc(t('deviceBackground'))}</h3><p>${esc(t('deviceBackgroundNote'))}</p><p role="status">${esc(t(service?.error?'deviceServiceError':service?.foreground?'deviceServiceRunning':service?'deviceServiceIdle':'deviceServiceUnknown'))}</p><p>${esc(t(battery?.backgroundRestricted?'deviceRestricted':battery?.ignoringBatteryOptimizations?'deviceBatteryAllowed':battery?'deviceBatteryNeeded':'deviceBatteryUnknown'))}</p><div class="device-actions">${button('deviceBattery','battery')}${button('deviceApp','app')}${service?.notificationsEnabled===true?'':button('deviceNotifications','notifications')}</div><h3>${esc(t('deviceWidget'))}</h3><p>${esc(t('deviceWidgetNote'))}</p>${button('devicePin','pin')}<p>${esc(t('devicePinManual'))}</p>${status?`<p role="status">${esc(t(status))}</p>`:''}<div class="device-actions">${button('walletRefresh','refresh')}${button('deviceLater','close')}</div></div>`;
  }
  function needsPermission(){return !battery||battery.ignoringBatteryOptimizations!==true||battery.backgroundRestricted===true;}
  function maybePrompt(){if(disposed||Date.now()<deferred||document.hidden||!needsPermission()||document.querySelector('dialog[open]'))return;dialog.showModal();}
  async function refresh(prompt=false){const [a,b]=await Promise.allSettled([background?.getStatus(),api?.serviceStatus()]);battery=a.status==='fulfilled'?a.value:null;service=b.status==='fulfilled'?b.value:null;render();if(prompt)maybePrompt();}
  function defer(){deferred=Date.now()+86400000;try{localStorage.setItem('warrior-background-reminder-v1',String(deferred));}catch{}}
  dialog.addEventListener('close',()=>{defer();entry.focus({preventScroll:true});});dialog.addEventListener('cancel',defer);
  entry.onclick=()=>{dialog.showModal();void refresh();};
  async function checkPin(){const attempt=pinAttempt;if(!attempt)return;try{const result=await widget.pinStatus();if(pinAttempt!==attempt)return;if(result.count>attempt.countBefore){pinAttempt=null;clearTimeout(pinTimer);status='devicePinDone';render();return;}}catch{}if(pinAttempt===attempt){status='devicePinUnknown';render();}}
  async function sync(){if(disposed)return;if(syncing){syncAgain=true;return;}syncing=true;try{
   const {battles}=await api.list(),snapshots=await Promise.all(battles.filter(b=>!b.placeholder).map(b=>api.snapshot(b.id)));
   const dictionary=words(),payload=root.WarriorWidgetProject(snapshots,{t:v=>dictionary[v]||v,network:api.networkStatus?.().status,label:p=>profile(p).name,icon:p=>profile(p).image});
   await api.configureWidget({labels:payload.labels,words:dictionary,names:payload.rows.map(row=>({key:row.key,name:row.name,icon:row.icon}))});
  }catch{await widget?.unavailable?.().catch(()=>{});}finally{syncing=false;if(syncAgain){syncAgain=false;schedule();}}}
  function schedule(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>void sync(),250);}
  async function openPending(){if(opening){openAgain=true;return;}opening=true;try{const target=await widget?.consumeOpen();if(target?.battleId&&target.agentId)await openStrategy(target.battleId,target.agentId);}catch{status='deviceTargetMissing';render();if(!document.querySelector('dialog[open]'))dialog.showModal();}finally{opening=false;if(openAgain){openAgain=false;void openPending();}}}
  dialog.addEventListener('click',async event=>{const action=event.target.closest('[data-device-action]')?.dataset.deviceAction;if(!action)return;if(action==='close'){dialog.close();return;}if(busy)return;busy=true;status='';render();try{
   if(action==='battery'||action==='app'){if(!background?.openSettings)throw Error();await background.openSettings({page:action});}
   else if(action==='notifications'){await plugins.NativeRuntime.requestNotifications();await refresh();}
   else if(action==='refresh')await refresh();
   else if(action==='pin'){clearTimeout(pinTimer);pinAttempt=null;await sync();const result=await widget.pin();status=result.supported?'devicePinConfirm':'devicePinUnknown';if(result.supported){pinAttempt={countBefore:result.countBefore};pinTimer=setTimeout(()=>void checkPin(),6000);}}
  }catch{status=action==='pin'?'devicePinUnknown':'deviceSettingsFailed';}finally{busy=false;render();}});
  const registrations=[];if(widget?.addListener)registrations.push(Promise.resolve(widget.addListener('openStrategy',()=>void openPending())));const unsubscribe=api?.subscribe?.(schedule);
  function resume(){if(document.hidden)return;schedule();void openPending();void checkPin();void refresh(true);}
  function language(){render();schedule();}
  root.addEventListener('warrior-android-resume',resume);root.addEventListener('pageshow',resume);root.addEventListener('warrior-language-change',language);root.addEventListener('warrior-mobile-network',schedule);document.addEventListener('visibilitychange',resume);
  const afterClose=()=>queueMicrotask(maybePrompt);document.addEventListener('close',afterClose,true);
  const heartbeat=setInterval(schedule,30000);render();schedule();void refresh(true);void openPending();
  return {refresh,render,dispose(){disposed=true;clearInterval(heartbeat);clearTimeout(pinTimer);clearTimeout(syncTimer);unsubscribe?.();for(const r of registrations)r.then(x=>x.remove()).catch(()=>{});root.removeEventListener('warrior-android-resume',resume);root.removeEventListener('pageshow',resume);root.removeEventListener('warrior-language-change',language);root.removeEventListener('warrior-mobile-network',schedule);document.removeEventListener('visibilitychange',resume);document.removeEventListener('close',afterClose);dialog.remove();entry.remove();}};
 }
 root.WarriorCardDevice={mount,wordCount:35};
})(window);
