const fs = require('./fs.cjs');
const { secp256k1 } = require('@noble/curves/secp256k1');
const QR = require('qrcode/lib/core/qrcode');
const { createPredictionSource } = require('../prediction-sim');
const { responseCookie } = require('./http.cjs');
const BASE = 'https://www.binance.com/bapi/defi/v1/public/wallet-direct';
const AUTH = '/agent-wallet/login';
const fail = code => Object.assign(Error(code), { code });
const hex = bytes => Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
function trustedUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && /(^|\.)binance\.com$/i.test(u.hostname); } catch { return false; }
}
function qrImage(url) {
  const { modules } = QR.create(url, { errorCorrectionLevel: 'M' }), paths = [];
  for (let y=0; y<modules.size; y++) for (let x=0; x<modules.size; x++)
    if (modules.get(y,x)) paths.push(`M${x+4} ${y+4}h1v1h-1z`);
  const size = modules.size+8;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path fill="white" d="M0 0h${size}v${size}H0z"/><path fill="black" d="${paths.join('')}"/></svg>`);
}
// Direct Android HTTPS adapter for the protocol used by the official
// @binance/agentic-wallet 1.10.0 client. No remote CLI or developer server.
// Pending and committed cookies persist only in the Keystore-backed file store.
function createMobileWallet({fetchImpl, now=Date.now, autoStart=true, file='/mobile/data/agentic-wallet.json'}) {
  let state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) : {clientId:crypto.randomUUID(),auth:{status:'idle'}};
  let epoch=0, timer, polling, signing, disposed=false, checkedAt=0;
  const save = () => fs.writeFileSync(file,JSON.stringify(state));
  const changed = () => globalThis.dispatchEvent?.(new CustomEvent('warrior-mobile-wallet'));
  const pending = () => state.auth.status === 'awaiting_scan';
  function clear(status,error) {
    clearTimeout(timer); state.cookie=''; state.auth={status,...(error && {error})}; checkedAt=0; save(); changed();
  }
  function expire() { if(pending() && now()>=Date.parse(state.auth.expireAt)){epoch++;clear('expired','BINANCE_AUTH_EXPIRED');} }
  const publicAuth = () => { expire(); const {qrCodeId,phase,...auth}=state.auth; return {...auth,...(auth.urlForWeb && {qrImage:qrImage(auth.urlForWeb)})}; };
  async function request(path,method='GET',body,generation=epoch) {
    const headers = {'content-type':'application/json',agentClientId:state.clientId,'bnc-uuid':state.clientId,
      agentClientSystem:'Android',agentClientMac:state.clientId,device_name:'10U Warrior Android',system_version:'Android',
      system_lang:Intl.DateTimeFormat().resolvedOptions().locale,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
      'x-trace-id':hex(crypto.getRandomValues(new Uint8Array(16))),agentClientType:'AGENT_CLI',
      version_code:'1.10.0',clientVersion:'1.10.0',agentClientVersion:'1.10.0'};
    if(state.cookie)headers.cookie='agentSessionId='+state.cookie;
    let response;
    try{response=await fetchImpl(BASE+path,{method,headers,...(body!==undefined && {body:JSON.stringify(body)}),signal:AbortSignal.timeout(18000)});}
    catch{throw fail('BINANCE_NETWORK_UNAVAILABLE');}
    if(generation!==epoch || disposed)throw fail('BINANCE_AUTH_CANCELED');
    if(!response.ok){
      if([401,403].includes(response.status) && state.cookie){epoch++;clear('expired','BINANCE_SESSION_EXPIRED');}
      throw fail('BINANCE_HTTP_'+response.status);
    }
    let value;try{value=await response.json();}catch{throw fail('BINANCE_RESPONSE_INVALID');}
    if(generation!==epoch || disposed)throw fail('BINANCE_AUTH_CANCELED');
    if(value.code!=='000000'){
      if(String(value.code)==='100001005'){epoch++;clear('expired','BINANCE_SESSION_EXPIRED');}
      if(String(value.code)==='351701'){epoch++;clear('expired','BINANCE_AUTH_REJECTED');}
      throw fail(/^\d+$/.test(String(value.code))?'BINANCE_API_'+value.code:'BINANCE_RESPONSE_INVALID');
    }
    const cookie=responseCookie(response)?.match(/(?:^|[,;]\s*)agentSessionId=([^;,\s]+)/)?.[1];
    if(cookie){state.cookie=cookie;save();}
    return value.data;
  }
  function schedule(){clearTimeout(timer);if(autoStart && pending() && !disposed){timer=setTimeout(()=>void poll().catch(()=>{}),2000);timer?.unref?.();}}
  async function poll(){
    expire();if(!pending())return publicAuth();if(polling)return polling;
    const generation=epoch;
    polling=(async()=>{
      try{
        if(state.auth.phase!=='creating' || !state.cookie){
          const result=await request(AUTH+'/confirm','POST',{qrCodeId:state.auth.qrCodeId},generation);
          if(result?.connectionStatus!=='CONNECTED')return publicAuth();
          state.auth.phase='creating';save();
        }
        const result=await request(AUTH+'/query','GET',undefined,generation);
        expire();if(generation!==epoch)return publicAuth();
        if(result?.connectionStatus==='CONNECTED' && result.walletCreateStatus==='CREATED'){
          if(!state.cookie)throw fail('BINANCE_SESSION_MISSING');
          state.auth={status:'connected'};checkedAt=now();save();changed();
        }else if(result?.connectionStatus==='UNCONNECTED')clear('expired','BINANCE_SESSION_EXPIRED');
        return publicAuth();
      }finally{polling=null;schedule();}
    })();return polling;
  }
  async function status(){
    expire();if(state.auth.status!=='connected' || !state.cookie)return 'UNCONNECTED';
    if(now()-checkedAt<5000)return 'CONNECTED';
    const result=await request(AUTH+'/query');
    if(result?.connectionStatus!=='CONNECTED' || result.walletCreateStatus!=='CREATED'){clear('expired','BINANCE_SESSION_EXPIRED');return 'UNCONNECTED';}
    checkedAt=now();return 'CONNECTED';
  }
  async function signin(){
    expire();if(pending()){schedule();return publicAuth();}if(signing)return signing;
    const generation=++epoch;
    signing=(async()=>{
      if(await status()==='CONNECTED')return publicAuth();
      if(generation!==epoch || disposed)throw fail('BINANCE_AUTH_CANCELED');
      clear('idle');
      const key=crypto.getRandomValues(new Uint8Array(32));
      const publicKeyHex=hex(secp256k1.getPublicKey(key,true).slice(1));key.fill(0);
      const result=await request(AUTH,'POST',{isFirstLogin:true,os:'Android',publicKeyHex},generation);
      const info=result?.qrInfo,expiry=Number(info?.expireAt);
      if(!info?.qrCodeId || !trustedUrl(info.qrCodeUrl) || !Number.isFinite(expiry) || expiry<=now())throw fail('BINANCE_AUTH_INVALID_RESPONSE');
      state.auth={status:'awaiting_scan',phase:'confirm',qrCodeId:info.qrCodeId,urlForWeb:info.qrCodeUrl,
        pairingCode:publicKeyHex.slice(0,3)+publicKeyHex.slice(-3),expireAt:new Date(Math.min(expiry,now()+300000)).toISOString()};
      save();schedule();changed();return publicAuth();
    })();try{return await signing;}finally{signing=null;}
  }
  async function run(args){
    if(args.join(' ')==='wallet status')return {data:{status:await status()}};
    const commands={'prediction market search':['market/search',['query','limit']],
      'prediction market detail':['market/detail',['marketTopicId']],'prediction market order-book':['order-book',['marketId','tokenId']]};
    const command=commands[args.slice(0,3).join(' ')];
    if(!command || (args.length-3)%2)throw fail('WALLET_READ_FORBIDDEN');
    const body={};
    for(let i=3;i<args.length;i+=2){const flag=args[i].slice(2);
      if(!args[i].startsWith('--') || !command[1].includes(flag) || body[flag]!==undefined || !args[i+1])throw fail('WALLET_READ_INVALID');
      body[flag]=args[i+1];}
    if(await status()!=='CONNECTED')throw fail('BINANCE_NOT_CONNECTED');
    if(body.limit!==undefined){body.topK=Number(body.limit);delete body.limit;}
    for(const key of ['marketId','marketTopicId'])if(body[key]!==undefined){const id=Number(body[key]);if(!Number.isSafeInteger(id)||id<=0)throw fail('WALLET_READ_INVALID');body[key]=id;}
    return {data:await request('/prediction/agent/'+command[0],'POST',body)};
  }
  async function snapshot(){
    if(await status()!=='CONNECTED')return {wallet:{provider:'binance',status:'unconnected'},auth:publicAuth(),balances:[],accountValue:null};
    const generation=epoch;
    const [wallets,tokens,settings,limits,session]=await Promise.all([
      request('/agent-wallet/mpc-wallet/list','POST'),request('/agent-wallet/mpc-wallet/token/list','POST'),
      request('/agent-wallet/settings/query'),request('/agent-wallet/trading-limit/query'),request(AUTH+'/query')]);
    if(generation!==epoch || session?.connectionStatus!=='CONNECTED' || session?.walletCreateStatus!=='CREATED')throw fail('BINANCE_SESSION_EXPIRED');
    const addresses=(wallets||[]).flatMap(w=>w.subWalletList||[]).flatMap(w=>w.addresses||[]);
    const primaryAddress=addresses.find(a=>String(a.binanceChainId)==='56')||addresses[0];
    const balances=(tokens?.tokenList||[]).map(t=>({symbol:t.symbol,balance:t.balance,value:t.value==null?null:Number(t.value)}));
    return {wallet:{provider:'binance',status:'connected',primaryAddress},auth:publicAuth(),balances,
      accountValue:balances.every(t=>Number.isFinite(t.value))?balances.reduce((sum,t)=>sum+t.value,0):null,
      settings:{predictionEnabled:settings?.predictionEnabled,abnormalTxnHandling:settings?.riskyTxnHandling,
        predictionQuotaLeft:settings?.predictionDailyLimit==null||limits?.predictionQuotaUsed==null?null:Number(settings.predictionDailyLimit)-Number(limits.predictionQuotaUsed),
        sessionExpireTime:session?.sessionExpireTime},txLock:null};
  }
  async function call(action){
    if(action==='signin')return {auth:await signin()};
    if(action==='auth'){await poll();return {auth:publicAuth()};}
    if(action==='snapshot')return snapshot();
    if(action==='network'){const start=now();await request('/mgmt/agent/networks/active');return {serviceAvailable:true,latencyMs:now()-start};}
    if(action==='signout'){++epoch;clearTimeout(timer);try{if(state.cookie)await request(AUTH+'/logout','POST');}finally{clear('idle');}return {auth:publicAuth()};}
    throw fail('WALLET_READ_FORBIDDEN');
  }
  save();expire();schedule();
  return {call,run,status,source:createPredictionSource(run),activity:()=>{expire();return pending()||Boolean(signing);},
    dispose(){disposed=true;epoch++;clearTimeout(timer);}};
}
module.exports={createMobileWallet,qrImage};
