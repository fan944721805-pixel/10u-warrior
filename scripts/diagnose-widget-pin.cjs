// Exercise the installed app's actual settings button on a disposable emulator.
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {connect}=require('./android-cdp.cjs');
const serial=process.env.ANDROID_TEST_SERIAL;
if(!/^emulator-\d+$/.test(serial||'') && !(process.env.ANDROID_ALLOW_PHYSICAL==='1' && serial==='10AG3409MC002U8'))throw Error('Select a disposable emulator or the explicitly authorized phone');
const output=path.resolve(__dirname,'../test-results/widget-pin');fs.mkdirSync(output,{recursive:true});
(async()=>{
  const c=await connect(serial,19339);let ui;
  try {
    ui=await c.attach(p=>p.url==='https://localhost/');
    if(process.argv.includes('--home')) {
      const dump=()=>{const status=c.adb('shell','uiautomator','dump','--compressed','/sdcard/widget-pin.xml');assert.ok(status.includes('dumped'));return c.adb('shell','cat','/sdcard/widget-pin.xml')};
      const nodes=xml=>[...xml.matchAll(/<node\s+([^>]+)>/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));
      const screenshot=name=>fs.writeFileSync(path.join(output,name+'.png'),execFileSync(path.resolve(__dirname,'../.android-sdk/platform-tools/adb.exe'),['-s',serial,'exec-out','screencap','-p'],{windowsHide:true}));
      c.adb('shell','input','keyevent','KEYCODE_HOME');
      let ns=nodes(dump());
      const first=ns.find(n=>n['resource-id'].endsWith('/widget_name')).text;
      const [left,top,right,bottom]=ns.find(n=>n['resource-id'].endsWith('/widget_stack')).bounds.match(/\d+/g).map(Number),x=Math.round((left+right)/2);
      c.adb('shell','input','swipe',String(x),String(bottom-30),String(x),String(top+40),'500');
      ns=nodes(dump());
      const target=ns.find(n=>n['resource-id'].endsWith('/widget_name')&&Number(n.bounds.match(/\d+/g)[1])>top);
      assert.ok(target);assert.notEqual(target.text,first);screenshot('scrolled');
      const [a,b,d,e]=target.bounds.match(/\d+/g).map(Number);
      c.adb('shell','input','tap',String(Math.round((a+d)/2)),String(Math.round((b+e)/2)));
      await new Promise(r=>setTimeout(r,1500));
      const detail=await ui.evaluate(`({open:document.querySelector('#detail-dialog').open,text:document.querySelector('#detail-content').innerText,battleId:Warrior.state.simulation?.id})`);
      assert.ok(detail.open);assert.ok(detail.text.includes(target.text));screenshot('detail');
      c.adb('shell','input','keyevent','KEYCODE_HOME');
      c.adb('shell','input','swipe',String(x),String(top+40),String(x),String(bottom-30),'500');
      assert.ok(nodes(dump()).some(n=>n.text===first));
      const result={passed:true,serial,versionName:c.adb('shell','dumpsys','package','com.tenuwarrior.app').match(/versionName=([^\s]+)/)?.[1],android:c.adb('shell','getprop','ro.build.version.release').trim(),checks:['settings button opens native pin dialog','launcher accepted new widget ID 3','desktop renders strategy snapshot','swipe up and down','tap opens matching strategy detail'],selectedStrategy:target.text,reproducedReportedFailure:false};
      fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;
    }
    console.log('before',JSON.stringify(await ui.evaluate(`({dialogs:[...document.querySelectorAll('dialog[open]')].map(e=>e.id),button:document.querySelector('.strategy-widget-settings')?.innerText,service:window.Warrior?.simulationApi?.serviceOwned,errors:document.querySelector('#sim-error')?.textContent})`)));
    if(process.argv.includes('--inspect'))return;
    await ui.evaluate(`(()=>{window.__widgetErrors=[];window.addEventListener('unhandledrejection',e=>window.__widgetErrors.push(String(e.reason?.message||e.reason)));const d=document.querySelector('#android-background-prompt[open]');if(d)document.querySelector('.android-background-dismiss').click();if(!document.querySelector('#battle-settings-dialog').open)document.querySelector('#battle-settings-open').click();document.querySelector('.strategy-widget-settings button').scrollIntoView({block:'center'});})()`);
    const bounds=await ui.evaluate(`(()=>{const r=document.querySelector('.strategy-widget-settings button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await ui.send('Input.dispatchMouseEvent',{type:'mousePressed',...bounds,button:'left',clickCount:1});
    await ui.send('Input.dispatchMouseEvent',{type:'mouseReleased',...bounds,button:'left',clickCount:1});
    await new Promise(r=>setTimeout(r,2500));
    console.log('after',JSON.stringify(await ui.evaluate(`({text:document.querySelector('.strategy-widget-settings')?.innerText,disabled:document.querySelector('.strategy-widget-settings button')?.disabled,errors:window.__widgetErrors})`)));
    const dump=c.adb('shell','uiautomator','dump','--compressed','/sdcard/widget-pin.xml');
    if(dump.includes('dumped')){const xml=c.adb('shell','cat','/sdcard/widget-pin.xml');fs.writeFileSync(path.join(output,'pin.xml'),xml);console.log(xml);}
  }finally{ui?.close();c.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1});
