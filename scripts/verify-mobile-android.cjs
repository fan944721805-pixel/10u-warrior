// Run only against an explicitly selected disposable Android emulator.
// No API keys or real wallets are used. Public HTTPS is read-only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { _android: android } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const serial = process.env.ANDROID_TEST_SERIAL;
if (!/^emulator-\d+$/.test(serial || '')) throw Error('Set ANDROID_TEST_SERIAL to a disposable emulator');
const root = path.resolve(__dirname,'..');
const adbPath = path.join(root,'.android-sdk/platform-tools/adb.exe');
const adb = (...args) => execFileSync(adbPath,['-s',serial,...args],{windowsHide:true,timeout:120000});
const output = path.join(root,'test-results/mobile-android'); fs.mkdirSync(output,{recursive:true});
let device;
async function attach() {
  if (!device) device = (await android.devices({omitDriverInstall:true})).find(item=>item.serial()===serial);
  assert.ok(device,'Selected Android test device');
  const webview = await device.webView({pkg:'com.tenuwarrior.app',timeout:30000});
  const page = await webview.page();
  await page.waitForFunction(()=>window.Warrior?.simulationApi?.mode==='native',{},{timeout:30000});
  assert.equal(await page.evaluate(()=>window.Warrior.mobileStartupError || null),null);
  assert.equal(await page.locator('.mobile-runtime-badge,.mobile-runtime-panel').count(),0);
  assert.ok(!/手机联网|手机独立运行|本地运行/.test(await page.locator('body').innerText()));
  return page;
}
(async()=>{
  let page = await attach();
  const price = await page.evaluate(()=>window.Warrior.simulationApi.checkNetwork());
  assert.ok(price.prices[0].price>0); assert.ok(Math.abs(Date.now()-price.prices[0].tradeTime)<30000);
  const indicators = await page.evaluate(()=>window.Warrior.simulationApi.indicators('BTCUSDT'));
  assert.ok(indicators.completedCandles>=199); assert.equal(indicators.simulated,undefined);
  assert.ok(indicators.raw.klines.length>=200);
  const aiEndpoint = await page.evaluate(()=>window.Capacitor.Plugins.CapacitorHttp.request({url:'https://api.deepseek.com/models',method:'GET',headers:{authorization:'Bearer MOBILE_TEST_NOT_A_REAL_KEY'},disableRedirects:true,connectTimeout:8000,readTimeout:15000,responseType:'json'}));
  assert.ok([401,403].includes(aiEndpoint.status),'AI provider reached without credentials');
  const log=adb('logcat','-d','--pid='+adb('shell','pidof','com.tenuwarrior.app').toString().trim()).toString();
  assert.equal(log.includes('MOBILE_TEST_NOT_A_REAL_KEY'),false,'Native HTTP debug logs must not retain auth headers');
  const saved = await page.evaluate(async()=>{
    const api=window.Warrior.simulationApi;
    const battle=await api.create('Android device verification',{initialBalance:10,rounds:1,agents:[{id:'A',name:'Android check',strategy:'czBrother',coin:'BNB',maxStakePct:10}]},'android-native-verification-'+Date.now());
    if (!(await api.report(battle.id)).enabled) throw Error('New native battle must start enabled');
    const response=await window.Warrior.request('/api/ai/connections',{method:'POST',body:JSON.stringify({provider:'custom',baseUrl:'https://example.test/v1',model:'storage-check',apiKey:'STORAGE_PROBE_NOT_A_REAL_KEY'})});
    if(!response.ok)throw Error('Could not save native AI vault');
    return {id:battle.id,cash:(await api.report(battle.id)).agents[0].cash};
  });
  const bytes=adb('exec-out','run-as','com.tenuwarrior.app','cat','files/mobile-runtime/data/ai-connections.json');
  assert.equal(bytes[0],1); assert.ok(bytes.length>29);
  assert.equal(bytes.includes(Buffer.from('STORAGE_PROBE_NOT_A_REAL_KEY')),false);
  assert.equal(bytes.includes(Buffer.from('storage-check')),false);
  const vaultMeta=await page.evaluate(async()=>({databases:await indexedDB.databases(),localKeys:Object.keys(localStorage)}));
  assert.ok(!vaultMeta.databases.some(db=>db.name==='warrior-ai-api-vault'));
  await page.screenshot({path:path.join(output,'native-online.png')});
  // Kill and restart the actual Android process, rather than reusing JS memory.
  await device.close(); device=null;
  adb('shell','am','force-stop','com.tenuwarrior.app');
  adb('shell','am','start','-n','com.tenuwarrior.app/.MainActivity');
  await new Promise(resolve=>setTimeout(resolve,2500));
  page=await attach();
  const restored=await page.evaluate(async id=>({battle:await window.Warrior.simulationApi.report(id),ai:await(await window.Warrior.request('/api/ai/settings')).json()}),saved.id);
  assert.equal(restored.battle.enabled,false); assert.equal(restored.battle.agents[0].cash,saved.cash);
  assert.equal(restored.ai.connections.find(c=>c.id==='custom').model,'storage-check');
  await page.evaluate(()=>window.Warrior.request('/api/ai/connections/remove',{method:'POST',body:JSON.stringify({provider:'custom'})}));
  const result={passed:true,serial,checks:['real Android APK','real public HTTPS prices and indicators','direct AI HTTPS without credentials','Keystore ciphertext at rest','no duplicate browser key vault','process restart preserves paused ledger and AI config'],
    price:{symbol:price.prices[0].symbol,price:price.prices[0].price,tradeTime:price.prices[0].tradeTime},indicatorSource:indicators.source,aiHttpStatus:aiEndpoint.status,encryptedBytes:bytes.length};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(device)await device.close();});
