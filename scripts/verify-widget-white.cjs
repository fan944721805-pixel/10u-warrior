// Read-only verification of every standalone native strategy row.
const {connect}=require('./android-cdp.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const serial=process.env.ANDROID_TEST_SERIAL;
if(!/^emulator-\d+$/.test(serial||''))throw Error('Disposable emulator required');
const deadline=setTimeout(()=>{console.error('Widget UI verification timed out');process.exit(1)},240000);
const nodes=xml=>[...xml.matchAll(/<node\s+([^>]+)>/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));
(async()=>{const c=await connect(serial,19339),ui=await c.attach(p=>p.url==='https://localhost/');
const dump=()=>{assert.ok(c.adb('shell','uiautomator','dump','--compressed','/sdcard/widget-white-check.xml').includes('dumped'));return nodes(c.adb('shell','cat','/sdcard/widget-white-check.xml'))};
const find=(ns,id)=>ns.find(n=>n['resource-id']==='com.tenuwarrior.app:id/'+id);
try{
 c.adb('shell','am','start','-n','com.tenuwarrior.app/.MainActivity');
 const projection=await ui.evaluate("(async()=>{const snapshots=await Promise.all((await Warrior.simulationApi.list()).battles.filter(b=>!b.placeholder).map(b=>Warrior.simulationApi.snapshot(b.id)));return snapshots.flatMap(b=>b.agents.map(a=>({battleId:b.id,agentId:a.id})))})()");
 c.adb('shell','input','keyevent','KEYCODE_WAKEUP');c.adb('shell','wm','dismiss-keyguard');
 c.adb('shell','input','keyevent','KEYCODE_HOME');let ns=dump();
 for(let i=0;i<4&&!find(ns,'widget_stack');i++){c.adb('shell','input','swipe','960','1100','130','1100','350');ns=dump();}
 const list=find(ns,'widget_stack');assert.equal(list?.class,'android.widget.ListView');
 const [l,t,r,b]=list.bounds.match(/\d+/g).map(Number),x=Math.round((l+r)/2);
 const swipe=down=>c.adb('shell','input','swipe',String(x),String(down?t+55:b-35),String(x),String(down?b-35:t+55),'550');
 const markers=ns=>ns.filter(n=>n['resource-id']==='com.tenuwarrior.app:id/widget_coin');
 for(let i=0;i<45&&!markers(ns).some(n=>/^.+ · 1\//.test(n.text));i++){swipe(true);ns=dump();}
 const seen=new Set(),fields=new Set();let total=0,target;
 for(let i=0;i<60;i++){
   for(const node of ns){const id=node['resource-id'];if(id?.startsWith('com.tenuwarrior.app:id/'))fields.add(id.split('/').at(-1));}
   for(const marker of markers(ns)){
     const match=marker.text.match(/ · (\d+)\/(\d+)/);if(!match)continue;
     const before=seen.size;seen.add(Number(match[1]));total=Number(match[2]);
     if(seen.size!==before)console.log('Visible strategy '+match[1]+'/'+total);
     const bounds=marker.bounds.match(/\d+/g).map(Number);
     if(bounds[1]>t+8&&bounds[3]<b-8)target=marker;
   }
   if(total&&seen.size===total&&target)break;
   swipe(false);ns=dump();target=null;
 }
 assert.ok(total>1);assert.equal(seen.size,total,'Every strategy is reachable by scrolling');
 for(const id of ['widget_funds','widget_profit','widget_cash','widget_reserved','widget_action','widget_win','widget_updated'])assert.ok(fields.has(id),id);
 const position=Number(target.text.match(/ · (\d+)\//)[1]);
 const expected=projection[position-1];
 const [a,d,e,f]=target.bounds.match(/\d+/g).map(Number);
 c.adb('shell','input','tap',String(Math.round((a+e)/2)),String(Math.round((d+f)/2)));
 let detail;for(let i=0;i<20;i++){
   detail=await ui.evaluate("({open:document.querySelector('#detail-dialog')?.open,battleId:Warrior.state.simulation?.id,text:document.querySelector('#detail-content')?.innerText})");
   if(detail?.open)break;await new Promise(r=>setTimeout(r,300));
 }
 assert.ok(detail.open);assert.equal(detail.battleId,expected.battleId);
 const result={passed:true,serial,strategiesSeen:seen.size,checks:['ListView collection','every strategy reachable','all financial fields','snapshot timestamp','matching battle detail opens']};
 const out=path.resolve(__dirname,'../test-results/widget-pin/list-interaction.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(result);
}finally{ui.close();c.cleanup()}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>clearTimeout(deadline));
