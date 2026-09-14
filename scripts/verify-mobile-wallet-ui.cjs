const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/mobile-wallet');fs.mkdirSync(out,{recursive:true});
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/wallet.css"></head><body>
<div class="top-right"><button id="profile">Wallet</button></div><dialog id="wallet-dialog" style="width:min(520px,calc(100vw - 24px));box-sizing:border-box;padding:18px"><div id="wallet-content"></div></dialog>
<script>
const $=s=>document.querySelector(s);const toast=()=>{};const openDialog=s=>$(s).showModal();
let connected=false;window.openedUrl=null;
window.Capacitor={Plugins:{WalletLink:{open:async({url})=>{window.openedUrl=url}}}};
window.Warrior={simulationApi:{mode:'native'},request:async(url,options={})=>{
if(url==='/api/config')return Response.json({chainId:'56',tradingEnabled:false});
if(url==='/api/network')return Response.json({serviceAvailable:true});
if(url==='/api/wallet')return Response.json({wallet:{status:connected?'connected':'unconnected'},auth:{status:connected?'connected':'idle'},balances:[]});
if(url==='/api/wallet/signin')return Response.json({auth:{status:'awaiting_scan',pairingCode:'012345',urlForWeb:'https://web3.binance.com/en/agent-login?fixture=1',qrImage:${JSON.stringify(require('../mobile/wallet.cjs').qrImage('https://app.binance.com/uni-qr/test?x=%2B&n=001'))},expireAt:Date.now()+60000}});
if(url==='/api/wallet/auth'){connected=true;return Response.json({auth:{status:'connected'}})}
throw Error('Unexpected fixture request '+url);
}};
</script><script src="/i18n.js"></script><script src="/wallet.js"></script></body></html>`;
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('content-type','text/html');return res.end(html)}
const name=req.url.slice(1);if(!['style.css','wallet.css','i18n.js','wallet.js'].includes(name)){res.statusCode=404;return res.end()}
res.setHeader('content-type',name.endsWith('.js')?'application/javascript':'text/css');res.end(fs.readFileSync(path.join(root,'public',name)));
});
(async()=>{
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [360,768,1440])for(const locale of ['zh','en']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('.language-toggle').selectOption(locale);
  await page.evaluate(async()=>{await renderWallet();openDialog('#wallet-dialog')});
  assert.equal(await page.locator('.wallet-bridge').count(),0);
  await page.locator('#start-wallet-signin:not([disabled])').waitFor();
  assert.equal(await page.evaluate(()=>document.querySelector('#wallet-dialog').scrollWidth<=document.querySelector('#wallet-dialog').clientWidth),true);
  await page.screenshot({path:path.join(out,locale+'-'+width+'.png')});
  await page.locator('#start-wallet-signin').click();
  const open=page.locator('.wallet-signin > button.primary');await page.locator('.wallet-qr img').evaluate(img=>img.decode());await page.screenshot({path:path.join(out,locale+'-'+width+'-signin.png')});await open.click();
  assert.equal(await page.evaluate(()=>window.openedUrl),'https://web3.binance.com/en/agent-login?fixture=1');
  assert.ok((await page.locator('.wallet-pairing').innerText()).includes('012345'));
  assert.ok((await open.boundingBox()).height>=48);
  await page.evaluate(()=>window.dispatchEvent(new Event('warrior-android-resume')));
  await page.locator('#disconnect-wallet').waitFor();
  assert.equal(await page.evaluate(()=>document.querySelector('#wallet-dialog').scrollWidth<=document.querySelector('#wallet-dialog').clientWidth),true);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log(JSON.stringify({passed:true,isolated:true,widths:[360,768,1440],locales:['zh','en'],checks:['native request routing','no server configuration required','official URL preserved','pairing code','return refresh','48px button','no horizontal overflow']}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
