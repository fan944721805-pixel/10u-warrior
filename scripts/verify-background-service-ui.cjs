const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../test-results/background-service-ui');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.join(root,pathname==='/'?'index.html':pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:360,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/android-background.js*',route=>route.fulfill({body:'',contentType:'text/javascript'}));
    await page.addInitScript(()=>{
      window.__notify=0;window.__settings=[];
      window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'android',Plugins:{
        NativeRuntime:{requestNotifications:async()=>{window.__notify++;return{granted:true};}},
        BackgroundSettings:{getStatus:async()=>({ignoringBatteryOptimizations:true,backgroundRestricted:false}),openSettings:async({page})=>window.__settings.push(page)}
      }};
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?offline=1`);
    await page.evaluate(()=>{
      Warrior.simulationApi.serviceOwned=true;
      Warrior.simulationApi.serviceStatus=async()=>({foreground:true,notificationsEnabled:false});
    });
    await page.addScriptTag({content:fs.readFileSync(path.join(root,'android-background.js'),'utf8')});
    await page.evaluate(()=>openDialog('#battle-settings-dialog'));
    const panel=page.locator('.android-background');
    await panel.getByRole('button',{name:'显示运行通知',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.__notify),1);assert.deepEqual(await page.evaluate(()=>window.__settings),[]);
    await panel.locator('[data-setting=app]').click();assert.deepEqual(await page.evaluate(()=>window.__settings),['app']);
    for(const lang of ['zh','en']){
      await page.locator('.language-toggle').selectOption(lang,{force:true});
      for(const width of [360,768,1440]){
        await page.setViewportSize({width,height:900});
        assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
        for(const b of await panel.locator('button').all())assert.ok(await b.evaluate(e=>e.getBoundingClientRect().height>=48));
        if(lang==='en')assert.ok(!/[\u3400-\u9fff]/u.test(await panel.innerText()));
        await page.screenshot({path:path.join(out,`${lang}-${width}.png`)});
      }
    }
    assert.deepEqual(errors,[]);console.log('PASS: notification action, settings, Chinese/English, 360/768/1440px. Mock UI only.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
