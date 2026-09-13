// Native storage/network bridges are mocked here. Android tests separately
// exercise the real Keystore, HTTPS stack, APK and process restart.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { fixture } = require('../test/fixtures/mobile-runtime.cjs');
const root = path.resolve(__dirname, '../public');
const output = path.resolve(__dirname, '../test-results/mobile-runtime');
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((request,response) => {
  const url = new URL(request.url,'http://localhost');
  const file = path.resolve(root, '.'+(url.pathname==='/'?'/index.html':url.pathname));
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) return response.writeHead(404).end();
  response.setHeader('content-type', {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'}[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});
(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:900}}), errors=[], apiRequests=[];
    const f=fixture();
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{
      const url=route.request().url();
      if(url.includes('/api/'))apiRequests.push(url);
      return url.startsWith(base)&&!url.includes('/api/')?route.continue():route.abort();
    });
    await page.exposeFunction('__nativeRequest',async options=>{
      f.setTime(Date.now());
      const response=await f.fetchImpl(options.url,{method:options.method,headers:options.headers,body:options.data==null?undefined:JSON.stringify(options.data)});
      return {status:response.status,data:await response.json()};
    });
    await page.addInitScript({content:fs.readFileSync(path.join(root,'mobile-runtime.js'),'utf8')});
    await page.addInitScript(()=>{
      let service;
      const getService=()=>service||(service=window.WarriorMobileRuntime.create());
      const key='test-native-files';
      window.WarriorStorageNative={call(raw){
        const input=JSON.parse(raw),files=JSON.parse(localStorage.getItem(key)||'{}');let value=null;
        try{
          if(input.op==='exists')value=Object.hasOwn(files,input.path);
          else if(input.op==='read'){if(!Object.hasOwn(files,input.path))throw Error('MISSING');value=files[input.path];}
          else if(input.op==='write')files[input.path]=input.data;
          else if(input.op==='copy'||input.op==='rename'){files[input.destination]=files[input.path];if(input.op==='rename')delete files[input.path];}
          else if(input.op==='delete')delete files[input.path];
          localStorage.setItem(key,JSON.stringify(files));return JSON.stringify({ok:true,value});
        }catch{return JSON.stringify({ok:false,code:'MOBILE_STORAGE_FAILED'});}
      }};
      window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'android',Plugins:{
        NativeRuntime:{
          addListener:async(name,fn)=>{const unsubscribe=name==='simulation'?getService().api.subscribe(fn):()=>{};return{remove:unsubscribe};},
          status:async()=>({ready:true,foreground:true,notificationsEnabled:true}),
          invoke:async({method,args})=>{
            try{
              const runtime=getService();let value;
              if(method==='request'){const response=await runtime.request(...args);value={status:response.status,data:await response.json()};}
              else if(method==='watchPrice')value={symbol:args[0],status:'unavailable'};
              else if(method==='configureWidget'){
                const config=args[0],{battles}=await runtime.api.list();
                const snapshots=await Promise.all(battles.map(b=>runtime.api.snapshot(b.id)));
                const projection=window.WarriorWidgetProject(snapshots,{t:v=>config.words[v]||v,network:runtime.api.networkStatus().status});
                projection.labels=config.labels;
                for(const row of projection.rows){const name=config.names.find(n=>n.key===row.key);if(name){row.name=name.name;row.icon=name.icon;}}
                window.__widgetSnapshot=projection;value={updated:true};
              }else value=await runtime.api[method](...args);
              return{ok:true,value,network:runtime.api.networkStatus()};
            }catch(error){return{ok:false,code:error.code||'MOBILE_SERVICE_FAILED',network:getService().api.networkStatus()};}
          },
        },
        StrategyWidget:{update:async({snapshot})=>{window.__widgetSnapshot=snapshot},unavailable:async()=>{window.__widgetUnavailable=true},pin:async()=>({supported:false}),consumeOpen:async()=>({}),addListener:async()=>({remove(){}})},
        CapacitorHttp:{request:options=>window.__nativeRequest(options)},
        BackgroundSettings:{getStatus:async()=>({ignoringBatteryOptimizations:false}),openSettings:async()=>({})},
      }};
    });
    await page.goto(base);
    await page.waitForFunction(()=>window.Warrior?.simulationApi?.mode==='native');
    await page.locator('#android-background-prompt').waitFor({state:'visible'});
    await page.locator('#android-background-prompt .android-background-dismiss').click();
    assert.equal(await page.locator('.mobile-runtime-badge,.mobile-runtime-panel').count(),0);
    assert.ok(!/手机联网|手机独立运行|本地运行/.test(await page.locator('body').innerText()));
    assert.equal(await page.evaluate(()=>window.Warrior?.simulationApi?.mode),'native');
    await page.waitForFunction(()=>window.__widgetSnapshot?.rows.length>0);
    await page.evaluate(()=>window.Warrior.simulationApi.checkNetwork());
    for(const language of ['zh','en','ja','ko']){
      await page.locator('.language-toggle').selectOption(language);
      await page.locator('#battle-settings-open').click();
      await page.locator('.strategy-widget-settings button').click();
      await page.waitForFunction(()=>document.querySelector('.strategy-widget-settings [role=status]').textContent.length>0);
      for(const width of [360,768,1440]){
        await page.setViewportSize({width,height:1000});
        assert.ok(await page.locator('#battle-settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),language+' '+width);
        assert.ok(await page.locator('.strategy-widget-settings button').evaluate(el=>el.getBoundingClientRect().height>=48));
        await page.screenshot({path:path.join(output,`${language}-${width}.png`)});
      }
      await page.locator('#battle-settings-dialog .battle-settings-header button').click();
    }
    await page.locator('.language-toggle').selectOption('en');
    await page.waitForFunction(()=>window.__widgetSnapshot?.labels.title==='Strategy status');
    assert.ok((await page.evaluate(()=>window.__widgetSnapshot.rows)).every(r=>!/[\u3400-\u9fff]/u.test([r.status,r.action,r.funds,r.profit].join(' '))));
    f.offline(true);
    await page.evaluate(()=>window.Warrior.simulationApi.checkNetwork().catch(()=>null));
    assert.equal(await page.evaluate(()=>window.Warrior.simulationApi.networkStatus().status),'error');
    await page.waitForFunction(()=>window.__widgetSnapshot?.rows.every(r=>r.status==='Market connection lost'));
    assert.equal(await page.evaluate(()=>window.Warrior?.simulationApi?.mode),'native');
    f.offline(false);
    await page.evaluate(()=>window.Warrior.simulationApi.checkNetwork());
    assert.equal(await page.evaluate(()=>window.Warrior.simulationApi.networkStatus().status),'online');
    await page.locator('#api-connect').click();
    await page.locator('[data-api-provider="custom"]').click();
    await page.locator('#api-base-url').fill('https://ai.example.test/v1');
    await page.locator('#api-model').fill('fixture-model');
    await page.locator('#api-key').fill('ui-fixture-secret');
    await page.locator('#api-test').click();
    await page.waitForFunction(()=>window.Warrior?.aiConnections?.snapshot()?.connections[0]?.tested===true);
    assert.ok(!await page.evaluate(async()=> (await indexedDB.databases()).some(db=>db.name==='warrior-ai-api-vault')),'Native UI must not create a second credential vault in IndexedDB');
    await page.reload();
    await page.waitForFunction(()=>window.Warrior?.aiConnections?.snapshot()?.connections[0]?.tested===true);
    await page.goto(base+'/?offline=1');
    await page.waitForFunction(()=>window.Warrior?.simulationApi?.mode==='offline');
    await page.goto(base);
    await page.waitForFunction(()=>window.Warrior?.simulationApi?.mode==='native');
    await page.waitForFunction(()=>window.Warrior?.aiConnections?.snapshot()?.connections[0]?.tested===true);
    assert.deepEqual(apiRequests,[],'APK UI must not contact any Node API');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,output,checks:['native mode with original UI','direct network','failure and recovery','AI test/reload','no IndexedDB credential duplicate','legacy URL roundtrip','four locales at 360/768/1440','no Node API requests']}));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
