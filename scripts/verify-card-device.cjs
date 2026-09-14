const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
const collection=require('../test/fixtures/card-collection.cjs');
(async()=>{
 const server=createWarriorServer({paperFile:null,walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});try{
  const context=await browser.newContext(),page=await context.newPage(),base='http://127.0.0.1:'+server.address().port;await collection.install(page);await page.goto(base+'/card-lab.html#arena');await collection.ready(page);
  await page.locator('[data-action=open-setup]').click();await page.locator('.setup-submit:enabled').click();await page.locator('#setup-dialog').waitFor({state:'hidden'});const id=await page.locator('#battle-select').inputValue();
  const battle=await(await fetch(base+'/api/simulation?battleId='+id)).json();await page.close();
  await context.addInitScript(()=>{
   window.__native={calls:[],labels:null,opening:null,listener:null,pins:0,battery:false,notifications:false};
   const listener=async()=>({remove(){}});
   window.Capacitor={isNativePlatform:()=>true,Plugins:{
    NativeRuntime:{addListener:listener,status:async()=>({foreground:true,notificationsEnabled:__native.notifications}),requestNotifications:async()=>{__native.notifications=true;},invoke:async({method,args})=>{
     __native.calls.push(method);let value;
     if(method==='request'){const r=await fetch(args[0],args[1]);value={status:r.status,data:await r.json()};}
     else if(method==='list')value=await(await fetch('/api/simulation/battles')).json();
     else if(['snapshot','report'].includes(method))value=await(await fetch('/api/simulation?battleId='+args[0])).json();
     else if(method==='configureWidget'){__native.labels=args[0];value={updated:true};}
     else if(method==='watchPrice')value={symbol:args[0],status:'unavailable'};
     else throw Error('Unexpected native request '+method);
     return {ok:true,value,network:{status:'online'}};
    }},
    BackgroundSettings:{getStatus:async()=>({ignoringBatteryOptimizations:__native.battery,backgroundRestricted:false}),openSettings:async({page})=>{__native.calls.push(page);__native.battery=true;}},
    StrategyWidget:{unavailable:async()=>{},addListener:async(_,fn)=>{__native.listener=fn;return{remove(){}};},consumeOpen:async()=>{const target=__native.opening||{};__native.opening=null;return target;},pin:async()=>({supported:true,countBefore:__native.pins}),pinStatus:async()=>({count:__native.pins})}
   }};
  });
  const native=await context.newPage(),errors=[];native.on('pageerror',e=>errors.push(e.message));await native.goto(base+'/card-lab.html#arena');await collection.ready(native);await native.locator('#device-dialog[open]').waitFor();
  await native.locator('[data-device-action=battery]').click();await native.locator('[data-device-action=refresh]:enabled').click();assert.match(await native.locator('#device-dialog').innerText(),/已豁免/);
  await native.locator('[data-device-action=notifications]').click();await native.locator('[data-device-action=notifications]').waitFor({state:'hidden'});
  await native.waitForFunction(()=>__native.labels?.names.length>0);assert.ok(await native.evaluate(()=>__native.labels.names.every(n=>n.name&&n.icon)));assert.equal(await native.evaluate(()=>!!window.WarriorMobileRuntime),false,'UI never boots another runtime');
  await native.locator('[data-device-action=pin]').click();await native.locator('[data-device-action=pin]:enabled').waitFor();assert.match(await native.locator('#device-dialog').innerText(),/请确认系统/);assert.doesNotMatch(await native.locator('#device-dialog').innerText(),/小组件已添加到桌面/);
  await native.evaluate(()=>{__native.pins++;window.dispatchEvent(new Event('warrior-android-resume'));});await native.waitForFunction(()=>document.querySelector('#device-dialog').textContent.includes('小组件已添加到桌面'));
  await native.keyboard.press('Escape');await native.evaluate(({id,agent})=>{__native.opening={battleId:id,agentId:agent};__native.listener();},{id,agent:battle.agents[0].id});await native.locator('#battle-detail-dialog[open]').waitFor();await native.keyboard.press('Escape');
  let layouts=0;for(const width of [360,768,1301])for(const lang of ['zh','en','ja','ko']){await native.setViewportSize({width,height:1000});await native.selectOption('#language',lang);await native.locator('.device-entry').click();const size=await native.locator('#device-dialog').evaluate(el=>({w:el.clientWidth,s:el.scrollWidth}));assert.ok(size.s<=size.w+1);assert.ok(await native.locator('[data-device-action]').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=48)));await native.keyboard.press('Escape');layouts++;}
  await native.waitForFunction(()=>__native.labels?.words['模拟资金']==='모의 자금');assert.deepEqual(errors,[]);assert.ok(await native.evaluate(()=>!__native.calls.some(m=>['create','setEnabled','topUp','end'].includes(m))));
  console.log(JSON.stringify({passed:true,layouts,checks:['native client only','background settings','notification permission','pin confirmation by count','widget opens exact agent','localized widget config','no betting mutations']}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
