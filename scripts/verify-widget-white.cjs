// Read-only verification of the installed widget on a disposable emulator.
const {connect}=require('./android-cdp.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const serial=process.env.ANDROID_TEST_SERIAL;
if(!/^emulator-\d+$/.test(serial||''))throw Error('Disposable emulator required');
const deadline=setTimeout(()=>{console.error('Widget UI verification timed out');process.exit(1)},45000);
const nodes=xml=>[...xml.matchAll(/<node\s+([^>]+)>/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));
(async()=>{const c=await connect(serial,19339),ui=await c.attach(p=>p.url==='https://localhost/');
const dump=()=>{assert.ok(c.adb('shell','uiautomator','dump','--compressed','/sdcard/widget-white-check.xml').includes('dumped'));return nodes(c.adb('shell','cat','/sdcard/widget-white-check.xml'))};
const find=(ns,id)=>ns.find(n=>n['resource-id']==='com.tenuwarrior.app:id/'+id);
try{
 c.adb('shell','input','keyevent','KEYCODE_WAKEUP');c.adb('shell','wm','dismiss-keyguard');
 c.adb('shell','input','keyevent','KEYCODE_HOME');let ns=dump();
 for(let i=0;i<4&&!find(ns,'widget_stack');i++){c.adb('shell','input','swipe','960','1100','130','1100','350');ns=dump();}
 assert.ok(find(ns,'widget_stack'),'Widget is present on the launcher');
 assert.ok(!find(ns,'widget_title')&&!find(ns,'widget_hint')&&!find(ns,'widget_age'));
 const first=find(ns,'widget_name').text;
 const [l,t,r,b]=find(ns,'widget_stack').bounds.match(/\d+/g).map(Number),x=Math.round((l+r)/2);
 c.adb('shell','input','swipe',String(x),String(b-35),String(x),String(t+55),'700');ns=dump();
 const target=ns.find(n=>n['resource-id']==='com.tenuwarrior.app:id/widget_name'&&n.text!==first);assert.ok(target,'Upward swipe switches strategy');
 const [a,d,e,f]=target.bounds.match(/\d+/g).map(Number);c.adb('shell','input','tap',String(Math.round((a+e)/2)),String(Math.round((d+f)/2)));
 let detail;for(let i=0;i<20;i++){detail=await ui.evaluate(`({open:document.querySelector('#detail-dialog')?.open,text:document.querySelector('#detail-content')?.innerText})`);if(detail?.open&&detail.text.includes(target.text))break;await new Promise(r=>setTimeout(r,300));}
 assert.ok(detail.open&&detail.text.includes(target.text));
 c.adb('shell','input','keyevent','KEYCODE_HOME');ns=dump();
 for(let i=0;i<4&&!find(ns,'widget_stack');i++){c.adb('shell','input','swipe','960','1100','130','1100','350');ns=dump();}
 assert.ok(find(ns,'widget_stack'));
 for(let i=0;i<3;i++){c.adb('shell','input','swipe',String(x),String(t+55),String(x),String(b-35),'700');ns=dump();if(ns.some(n=>n.text===first))break;}
 assert.ok(ns.some(n=>n.text===first),'Downward swipe returns to prior strategy');
 const result={passed:true,serial,version:'0.1.9',checks:['card only','swipe up','matching strategy detail','swipe down'],selected:target.text};
 const out=path.resolve(__dirname,'../test-results/widget-pin/white-interaction.json');fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(result);
}finally{ui.close();c.cleanup()}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>clearTimeout(deadline));
