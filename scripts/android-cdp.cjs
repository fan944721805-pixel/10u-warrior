const {execFileSync}=require('node:child_process');
const path=require('node:path');
async function connect(serial,port=19337) {
  const adb=(...args)=>execFileSync(path.resolve(__dirname,'../.android-sdk/platform-tools/adb.exe'),['-s',serial,...args],{windowsHide:true,timeout:30000}).toString();
  const pid=adb('shell','pidof','com.tenuwarrior.app').trim();
  if(!/^\d+$/.test(pid))throw Error('App is not running');
  adb('forward',`tcp:${port}`,`localabstract:webview_devtools_remote_${pid}`);
  let pages;
  for(let attempt=0;attempt<15;attempt++){
    try{pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(pages.some(p=>p.url==='https://localhost/')&&pages.some(p=>p.url.includes('/runtime-host.html')))break;}catch{}
    await new Promise(r=>setTimeout(r,500));
  }
  if(!pages?.length)throw Error('Debug WebView not ready');
  async function attach(match) {
    const page=pages.find(match);if(!page)throw Error('WebView not found');
    const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    const pending=new Map();let sequence=0;
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout'));},30000);
      pending.set(id,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);});ws.send(JSON.stringify({id,method,params}));
    });
    return {send,close:()=>ws.close(),async evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}};
  }
  return {adb,attach,cleanup:()=>adb('forward','--remove',`tcp:${port}`)};
}
module.exports={connect};
