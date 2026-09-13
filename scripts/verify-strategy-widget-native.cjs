// Select a disposable emulator. Exercises the real APK + Android launcher;
// only creates test paper battles, with no API keys or wallet actions.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { _android } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const serial = process.env.ANDROID_TEST_SERIAL;
if (!/^emulator-\d+$/.test(serial || '')) throw Error('Select a disposable emulator');
const root = path.resolve(__dirname,'..'), pkg = 'com.tenuwarrior.app';
const output = path.join(root,'test-results/strategy-widget-native'); fs.mkdirSync(output,{recursive:true});
const adb = (...args) => execFileSync(path.join(root,'.android-sdk/platform-tools/adb.exe'),['-s',serial,...args],{windowsHide:true,timeout:30000});
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const dump = () => {
  for(let attempt=0;attempt<3;attempt++) {
    const output=adb('shell','uiautomator','dump','--compressed','/sdcard/widget-verification.xml').toString();
    if(output.includes('dumped'))return adb('shell','cat','/sdcard/widget-verification.xml').toString();
  }
  throw Error('Could not capture a fresh native UI hierarchy');
};
const nodes = xml => [...xml.matchAll(/<node\s+([^>]+)>/g)].map(m => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));
const control = (xml,id) => nodes(xml).find(n=>n['resource-id']===pkg+':id/'+id);
async function until(fn, timeout=10000) { const end=Date.now()+timeout; while(Date.now()<end) { if(await fn())return; await sleep(300); } throw Error('Condition timed out'); }
function tap(node) { assert.ok(node,'Native control is visible'); const [x1,y1,x2,y2]=node.bounds.match(/\d+/g).map(Number); adb('shell','input','tap',String(Math.round((x1+x2)/2)),String(Math.round((y1+y2)/2))); }
function screenshot(name) { fs.writeFileSync(path.join(output,name+'.png'),adb('exec-out','screencap','-p')); }
function saved() {
  const xml=adb('exec-out','run-as',pkg,'cat','shared_prefs/strategy-widget-v1.xml').toString();
  const str=xml.match(/<string name="snapshot">([\s\S]*?)<\/string>/)?.[1];
  return str ? JSON.parse(str.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')) : null;
}
let device, page, battleId;
async function attach() {
  if (!device) device=(await _android.devices({omitDriverInstall:true})).find(d=>d.serial()===serial);
  assert.ok(device);
  page=await (await device.webView({pkg})).page();
  await page.waitForFunction(()=>window.Warrior?.simulationApi?.mode==='native' && window.Warrior.openStrategy && window.Capacitor.Plugins.StrategyWidget);
  page.setDefaultTimeout(20000);
  await page.evaluate(()=>{ localStorage.setItem('warrior-background-reminder-v1',String(Date.now()+86400000)); document.querySelector('#android-background-prompt[open]')?.close(); });
  return page;
}
(async()=>{
  adb('shell','am','start','-n',pkg+'/.MainActivity'); await attach();
  if (process.argv.includes('--smoke')) {
    assert.equal(await page.evaluate(()=>{const s=document.querySelector('.language-toggle');s.value='en';s.dispatchEvent(new Event('change'));return window.Warrior.i18n.t('看空')}),'Down');
    await until(()=>saved()?.labels.title==='Strategy status');
    assert.ok((await page.locator('.strategy-widget-settings button').count())===1);
    await page.evaluate(()=>{const s=document.querySelector('.language-toggle');s.value='zh';s.dispatchEvent(new Event('change'))});
    await until(()=>saved()?.labels.title==='策略战况');
    console.log(JSON.stringify({passed:true,serial,checks:['final APK native startup','final English down direction','widget bridge and add entry','Chinese widget update']}));
    return;
  }
  await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close()});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const setup=await page.evaluate(async()=>{
    const api=window.Warrior.simulationApi;
    // Clean only previous runs of this exact verifier on this disposable device.
    for(const b of (await api.list()).battles)if(b.name==='Widget QA 自定义')await api.remove(b.id);
    const b=await api.create('Widget QA 自定义',{initialBalance:10,rounds:1,agents:[
      {id:'widget-a',strategy:'smart',coin:'BTC',maxStakePct:10},
      {id:'widget-b',strategy:'conservative',coin:'BTC',maxStakePct:10},
      {id:'widget-c',strategy:'aggressive',coin:'BTC',maxStakePct:10},
    ]},'widget-qa-'+Date.now());
    await api.setEnabled(b.id,false);
    const select=document.querySelector('.language-toggle'); select.value='zh'; select.dispatchEvent(new Event('change'));
    return {id:b.id};
  });
  battleId=setup.id;
  await sleep(1200);
  const data=saved(); assert.equal(data.rows.filter(r=>r.battleId===battleId).length,3);
  assert.ok(data.rows.filter(r=>r.battleId===battleId).every(r=>r.battleName==='Widget QA 自定义'));
  fs.writeFileSync(path.join(output,'setup.json'),JSON.stringify({battleId,rows:data.rows.length},null,2));
  // Reuse an existing instance on reruns; do not leave duplicate widgets.
  const widgets=adb('shell','dumpsys','appwidget').toString().split('Widgets:')[1]?.split('Hosts:')[0] || '';
  if (!widgets.includes(pkg)) {
    await page.evaluate(()=>window.Capacitor.Plugins.StrategyWidget.pin()); await sleep(800);
    const xml=dump(); fs.writeFileSync(path.join(output,'pin.xml'),xml); screenshot('pin');
    tap(nodes(xml).find(n=>/Add to home screen|Add automatically|添加到主屏幕|添加/.test(n.text)));
  }
  adb('shell','input','keyevent','KEYCODE_HOME'); await sleep(600);
  let xml=dump(); assert.ok(control(xml,'widget_stack')); screenshot('zh');
  // The launcher preserves scroll position across updates and verifier reruns.
  for(let i=0;i<12 && !nodes(xml).some(n=>n['resource-id']===pkg+':id/widget_coin' && / · 1\//.test(n.text));i++) {
    const [left,top,right,bottom]=control(xml,'widget_stack').bounds.match(/\d+/g).map(Number), center=Math.round((left+right)/2);
    adb('shell','input','swipe',String(center),String(top+40),String(center),String(bottom-30),'450'); await sleep(300); xml=dump();
  }
  const seen = new Set();
  async function findTestCard() {
    for(let i=0;i<20;i++) {
      xml=dump();
      const ns=nodes(xml); for(const n of ns.filter(n=>n['resource-id']===pkg+':id/widget_coin'))seen.add(n.text);
      const marker=ns.find(n=>n['resource-id']===pkg+':id/widget_battle' && n.text==='Widget QA 自定义');
      if(marker) {
        const bounds=marker.bounds.match(/\d+/g).map(Number), list=control(xml,'widget_stack').bounds.match(/\d+/g).map(Number);
        if(bounds[1]>list[1]+130 && bounds[3]<list[3]-150)return marker;
      }
      const [x1,y1,x2,y2]=control(xml,'widget_stack').bounds.match(/\d+/g).map(Number), x=Math.round((x1+x2)/2);
      adb('shell','input','swipe',String(x),String(y2-25),String(x),String(y1+60),'450'); await sleep(400);
    }
    throw Error('Could not scroll to the test strategy');
  }
  const target=await findTestCard(); assert.ok(seen.size>=3,'Vertical scrolling reaches different strategies'); screenshot('zh-scrolled');
  tap(target);
  await page.waitForFunction(id=>window.Warrior.state.simulation?.id===id && document.querySelector('#detail-dialog').open,battleId);
  const agentId=await page.evaluate(()=>window.Warrior.state.simulation.agents.find(a=>document.querySelector('#detail-content')?.textContent.includes(window.Warrior.agentLabel(a.policy)))?.id);
  assert.ok(agentId); await page.screenshot({path:path.join(output,'detail.png')});
  assert.equal((await page.evaluate(id=>window.Warrior.simulationApi.snapshot(id),battleId)).enabled,false,'Widget click never resumes a battle');
  await page.evaluate(async id=>{ await window.Warrior.simulationApi.topUp(id,'widget-a',5,'widget-topup-'+Date.now()); },battleId);
  await until(()=>saved().rows.find(r=>r.battleId===battleId&&r.agentId==='widget-a')?.funds.includes('15.00'));
  assert.ok(saved().rows.find(r=>r.battleId===battleId&&r.agentId==='widget-a').profit.includes('0.00'),'Deposit is not profit');
  await page.locator('#detail-dialog .close-dialog').click();
  await page.locator('.language-toggle').selectOption('en');
  await until(()=>saved().labels.title==='Strategy status');
  assert.ok(saved().rows.filter(r=>r.battleId===battleId).every(r=>r.battleName==='Widget QA 自定义'&&['Paused','Market connection lost'].includes(r.status)));
  assert.ok(saved().rows.filter(r=>r.battleId===battleId).every(r=>r.action==='Wait'));
  console.log('Verified native projection, scroll, warm detail, funding and bilingual updates');
  adb('shell','input','keyevent','KEYCODE_HOME'); await sleep(700); xml=dump();
  assert.equal(control(xml,'widget_title').text,'Strategy status'); screenshot('en');
  // Swipe backwards as well as forwards.
  let [x1,y1,x2,y2]=control(xml,'widget_stack').bounds.match(/\d+/g).map(Number), x=Math.round((x1+x2)/2);
  adb('shell','input','swipe',String(x),String(y1+50),String(x),String(y2-30),'450'); await sleep(500);
  screenshot('en-backwards');
  // Simulate process death with am kill (not force-stop, which disables widgets).
  await device.close(); device=null;
  adb('shell','am','kill',pkg);
  const staleStart=Date.now();
  console.log('Waiting for the actual Android snapshot-expiry alarm after process stop');
  await until(()=>{xml=dump();return control(xml,'widget_freshness')?.text==='Updates stopped. Tap to open app.';},240000);
  screenshot('stale');
  tap(await findTestCard()); await attach();
  await page.waitForFunction(id=>window.Warrior.state.simulation?.id===id && document.querySelector('#detail-dialog').open,battleId);
  await until(()=>saved().rows.filter(r=>r.battleId===battleId).length===3);
  assert.equal((await page.evaluate(id=>window.Warrior.simulationApi.snapshot(id),battleId)).enabled,false);
  await page.evaluate(id=>window.Warrior.simulationApi.remove(id),battleId);
  await until(()=>!saved().rows.some(r=>r.battleId===battleId));
  assert.deepEqual(errors,[]);
  const result={passed:true,serial,checks:['native ledger projection for all agents','Chinese home widget','vertical scroll forward/backward','tap opens correct paused battle detail','deposit updates without profit inflation','English home widget preserves custom battle name','stale snapshot after process stop','restart keeps battle paused','deleted battle disappears'],staleWaitMs:Date.now()-staleStart};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(device)await device.close();process.exit(process.exitCode||0)});
