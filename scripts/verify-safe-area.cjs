// Browser layout proof with native CSS and WebView env() insets simulated.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../public');
const output = path.resolve(__dirname, '../test-results/safe-area');
const server = http.createServer((req,res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const file = path.join(root, name === '/' ? 'index.html' : name);
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', {'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    await page.goto(base+'/?offline=1');
    await page.locator('#battle-settings-open').waitFor();
    const session=await page.context().newCDPSession(page);
    const metrics=()=>page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      return {brand:rect('.brand'),header:rect('.topbar'),controls:rect('.top-right'),padding:parseFloat(getComputedStyle(document.querySelector('.topbar')).paddingTop),overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    for(const lang of ['zh','en']) {
      await page.locator('.language-toggle').selectOption(lang);
      for(const width of [360,390,768,1440]) {
        await page.setViewportSize({width,height:844});
        for(const [envTop,nativeTop] of [[0,0],[0,28],[28,28],[44,28]]) {
          await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:envTop,left:0,right:0,bottom:0}});
          await page.evaluate(top=>document.documentElement.style.setProperty('--safe-area-inset-top',`${top}px`),nativeTop);
          const m=await metrics(), safe=Math.max(envTop,nativeTop);
          assert.equal(m.padding,safe+(width<=760?10:0),'insets are applied once');
          assert.ok(m.brand.top>=safe+(width<=760?10:0)-1,'brand clears status bar');
          assert.ok(m.controls.top>=safe,'controls clear status bar');
          assert.equal(m.overflow,false,`${lang} ${width} horizontal overflow`);
        }
        if(width<=390) {
          // Scroll keeps the header's reserved status-bar area intact.
          await page.evaluate(()=>window.scrollTo(0,300));
          assert.ok((await metrics()).brand.top>=54);
          await page.evaluate(()=>window.scrollTo(0,0));
          await page.screenshot({path:path.join(output,`${lang}-${width}.png`)});
        }
      }
    }
    // Landscape cutout and a later rotation/inset update do not overlap content.
    await page.setViewportSize({width:844,height:390});
    await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:44,right:0,bottom:0}});
    await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-inset-top','0px');document.documentElement.style.setProperty('--safe-area-inset-left','44px');});
    assert.ok((await metrics()).brand.left>=58);
    await session.send('Emulation.setSafeAreaInsetsOverride',{insets:{}});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-inset-left','0px');document.documentElement.style.setProperty('--safe-area-inset-top','0px');});
    assert.equal((await metrics()).padding,10);
    await page.locator('#battle-settings-open').click();
    assert.equal(await page.locator('#battle-settings-dialog').evaluate(el=>el.open),true);
    await page.locator('#battle-settings-dialog .battle-settings-header button').click();
    await page.locator('.nav[data-page=reports]').last().click();
    assert.equal(await page.locator('#reports').evaluate(el=>el.hidden),false);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,output,checks:'zh/en; 360/390/768/1440; env and native insets; no double spacing; scroll; landscape; settings; navigation'}));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
