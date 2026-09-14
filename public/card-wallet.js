/* Wallet presentation for the current UI. Credentials stay in the existing service. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WarriorCardWallet=api;})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  function trustedUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&/(^|\.)binance\.com$/i.test(u.hostname)?u.href:null;}catch{return null;}}
  function create({request,onChange=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
    let view={status:'idle',busy:false,data:null,error:null,uncertain:false},visible=false,timer=null,flight=null;
    const snapshot=()=>structuredClone(view);
    const emit=()=>onChange(snapshot());
    const stop=()=>{clearTimer(timer);timer=null;};
    function schedule(){stop();if(visible&&view.status==='awaiting_scan'&&!view.busy)timer=setTimer(()=>void poll(),2000);}
    function accept(data){if(!data?.wallet||typeof data.wallet.status!=='string')throw Object.assign(new Error('WALLET_INVALID_RESPONSE'),{code:'WALLET_INVALID_RESPONSE'});view.data=data;view.status=data.wallet.status==='connected'?'connected':data.auth?.status==='awaiting_scan'?'awaiting_scan':'unconnected';view.error=['error','expired'].includes(data.auth?.status)?data.auth.error||'BINANCE_SESSION_EXPIRED':null;view.uncertain=false;}
    async function read(){accept(await request('/api/wallet'));}
    function run(work){if(flight)return flight;stop();view.busy=true;emit();flight=(async()=>{try{await work();}catch(e){view.error=e.code||'WALLET_UNAVAILABLE';view.status='unavailable';view.data=null;}finally{view.busy=false;flight=null;emit();schedule();}})();return flight;}
    function refresh(){return run(read);}
    function poll(){return run(async()=>{const result=await request('/api/wallet/auth');if(!result?.auth?.status)throw Error('Invalid auth');if(result.auth.status==='connected'){await read();return;}view.data={wallet:{status:'unconnected'},auth:result.auth};view.status=result.auth.status==='awaiting_scan'?'awaiting_scan':'unconnected';view.error=['expired','error'].includes(result.auth.status)?result.auth.error||'BINANCE_SESSION_EXPIRED':null;view.uncertain=false;});}
    function mutate(action){if(view.uncertain)return refresh();if(action==='signin'&&view.status!=='unconnected')return Promise.resolve();return run(async()=>{try{const result=await request('/api/wallet/'+action,{});if(action==='signin'&&result.auth?.status==='awaiting_scan'){view.data={wallet:{status:'unconnected'},auth:result.auth};view.status='awaiting_scan';view.error=null;}else await read();view.uncertain=false;}catch(e){view.uncertain=true;throw e;}});}
    return {snapshot,refresh,poll,signin:()=>mutate('signin'),signout:()=>mutate('signout'),open(){visible=true;return refresh();},close(){visible=false;stop();},resume(){if(!visible)return Promise.resolve();return view.status==='awaiting_scan'?poll():refresh();}};
  }
  function mount({dialog,shortcut,request,t,locale=()=>document.documentElement.lang||'en',openUrl}){
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const number=v=>v==null||v===''||!Number.isFinite(Number(v))?'—':new Intl.NumberFormat(locale(),{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v));
    const date=v=>!v||!Number.isFinite(new Date(v).getTime())?'—':new Intl.DateTimeFormat(locale(),{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
    let openError=false;
    const service=create({request,onChange:render});
    function render(){const v=service.snapshot(),d=v.data||{},auth=d.auth||{},connected=v.status==='connected',pending=v.status==='awaiting_scan';
      shortcut.classList.toggle('wallet-connected',connected);shortcut.dataset.walletState=v.status;
      if(!dialog.open)return;
      const button=(label,action,primary=false)=>`<button type="button" class="${primary?'primary':'secondary'} full" data-wallet-action="${action}" ${v.busy?'disabled':''}>${esc(t(label))}</button>`;
      const row=(label,value)=>`<div><dt>${esc(t(label))}</dt><dd>${esc(value)}</dd></div>`;
      let body='';
      if(v.busy&&!d.wallet)body=`<p class="card-wallet-loading" role="status">${esc(t('walletLoading'))}</p>`;
      else if(v.status==='unavailable'||v.status==='idle')body=button('walletRefresh','refresh',true);
      else if(connected){const a=d.wallet.primaryAddress,balances=Array.isArray(d.balances)?d.balances.filter(b=>Number(b.balance)>0).sort((a,b)=>Number(b.value||0)-Number(a.value||0)):[],settings=d.settings;
        body=`<section class="card-wallet-account"><span class="card-wallet-state">${esc(t('walletConnected'))}</span><h3>Binance Agentic Wallet</h3><div class="card-wallet-value"><span>${esc(t('walletValue'))}</span><strong>${number(d.accountValue)} <small>USD</small></strong></div><h4>${esc(t('walletBalances'))}</h4>${d.balancesAvailable===false?`<p>${esc(t('walletBalancesUnavailable'))}</p>`:balances.length?`<div class="card-wallet-assets">${balances.map(b=>`<div><b>${esc(b.symbol)}</b><span>${esc(b.balance)}</span><small>≈ $${number(b.value)}</small></div>`).join('')}</div>`:`<p>${esc(t('walletNoBalance'))}</p>`}<dl class="card-wallet-details">${row('walletAddress',a?.address||'—')}${row('walletChain',a?.chainName||a?.binanceChainId||'—')}${row('walletPrediction',settings?.predictionEnabled===true?t('walletEnabled'):settings?.predictionEnabled===false?t('walletDisabled'):'—')}${row('walletQuota',settings?.predictionQuotaLeft==null?'—':number(settings.predictionQuotaLeft)+' USDT')}${row('walletPolicy',settings?.abnormalTxnHandling==='NeedConfirmation'?t('walletConfirmRisk'):settings?.abnormalTxnHandling==='AutoReject'?t('walletRejectRisk'):t('walletAppSettings'))}${row('walletExpiry',date(settings?.sessionExpireTime))}</dl>${d.txLock?.status==='LOCKED'?`<p class="card-wallet-notice">${esc(t('walletLocked'))}</p>`:''}<div class="card-wallet-actions">${button('walletRefresh','refresh',true)}${button('walletDisconnect','signout')}</div></section>`;
      }else if(pending){const url=trustedUrl(auth.urlForWeb),qr=typeof auth.qrImage==='string'&&/^(?:data:image\/png;base64,[A-Za-z0-9+/=]+|data:image\/svg\+xml;charset=utf-8,%3Csvg[^\s]+)$/i.test(auth.qrImage)?auth.qrImage:null;
        body=`<h3>${esc(t('walletScanTitle'))}</h3><p>${esc(t('walletScanNote'))}</p>${url&&qr?`<img class="card-wallet-qr" src="${esc(qr)}" width="240" height="240" alt="${esc(t('walletQrAlt'))}">`:''}<div class="card-wallet-pair"><span>${esc(t('walletPair'))}</span><strong>${esc(auth.pairingCode||'—')}</strong></div><p role="status">${esc(t('walletWaiting'))} · ${esc(t('walletExpiry'))} ${date(auth.expireAt)}</p>${url?`${button('walletOpen','open',true)}<a class="card-wallet-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(t('walletOfficial'))} ↗</a>`:`<p class="card-wallet-notice">${esc(t('walletInvalidLink'))}</p>`}<div class="card-wallet-actions">${button('walletConfirmed','poll')}${button('walletCancel','signout')}</div>`;
      }else body=`<span class="card-wallet-state">${esc(t('walletUnconnected'))}</span><h3>Binance Agentic Wallet</h3><p>${esc(t('walletConnectNote'))}</p>${button('walletConnect','signin',true)}`;
      const error=v.error?(v.uncertain?'walletUnconfirmed':String(v.error).includes('EXPIRED')||String(v.error).includes('REJECTED')?'walletExpired':'walletUnavailable'):null;
      dialog.innerHTML=`<div class="dialog-head"><h2 id="card-wallet-title">${esc(t('walletLabel'))}</h2><button type="button" class="icon-button" data-wallet-action="close" aria-label="${esc(t('close'))}">×</button></div><div class="card-wallet-body">${error?`<p class="card-wallet-notice" role="alert">${esc(t(error))}</p>`:''}${openError?`<p role="alert">${esc(t('walletOpenFailed'))}</p>`:''}${body}<p class="card-wallet-foot">${esc(t('walletReadOnly'))}</p></div>`;
    }
    dialog.addEventListener('click',async e=>{const action=e.target.closest('[data-wallet-action]')?.dataset.walletAction;if(!action)return;if(action==='close'){dialog.close();return;}if(action==='open'){const url=trustedUrl(service.snapshot().data?.auth?.urlForWeb);if(url)try{await openUrl(url);}catch{openError=true;render();}return;}if(['refresh','poll','signin','signout'].includes(action)){openError=false;await service[action]();}});
    dialog.addEventListener('close',()=>service.close());
    const resume=()=>{if(!document.hidden)void service.resume();else service.close();};
    const visibility=()=>{if(document.hidden)service.close();else if(dialog.open)void service.open();};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('warrior-android-resume',resume);window.addEventListener('pageshow',resume);
    return {service,render,open(){openError=false;if(!dialog.open)dialog.showModal();render();return service.open();}};
  }
  return {create,mount,trustedUrl};
});
