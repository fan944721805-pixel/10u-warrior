const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {allowed}=require('../client-assets.cjs');
const {createWarriorServer}=require('../server');
const {createSimulationBattles}=require('../simulation-battles');
test('new installation has no example battle, no background decisions, and first explicit battle is number one',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-empty-')),file=path.join(dir,'ledger.json');let calls=0;
 const options={file,leaseEnabled:false,source:{marketFor:async()=>{calls++;throw Error('not expected');}}};
 try{let manager=createSimulationBattles(options);assert.equal(manager.snapshot().placeholder,true);assert.equal(manager.snapshot().enabled,false);assert.deepEqual(manager.leaderboard(),[]);await manager.tick();assert.equal(calls,0);assert.equal(fs.existsSync(file),false);assert.throws(()=>manager.setEnabled(true),/CREATE_BATTLE_FIRST/);
  manager=createSimulationBattles(options);assert.equal(manager.snapshot().placeholder,true);const first=manager.create('第一局',{automaticName:true,agents:[{id:'one',strategy:'smart',coin:'BTC'}]});assert.equal(first.automaticSequence,1);manager.setEnabled(false,first.id);manager=createSimulationBattles(options);assert.equal(manager.snapshot().placeholder,true);assert.equal(manager.snapshot(first.id).automaticSequence,1);assert.equal(manager.list().filter(b=>!b.placeholder).length,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Web and Android share the new document and exclude retired UI assets',async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');assert.match(html,/data-card-lab="true"/);assert.match(html,/card-wallet.js/);assert.match(html,/card-device.js/);assert.doesNotMatch(html,/src="(?:app|paper|wallet|offline-simulation)\.js/);
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g))assert.ok(allowed(match[1]),match[1]);
 const mobile=path.join(__dirname,'../artifacts/mobile-web');assert.equal(fs.readFileSync(path.join(mobile,'index.html'),'utf8'),html);assert.ok(fs.existsSync(path.join(mobile,'runtime-host.html')));
 for(const entry of fs.readdirSync(mobile,{recursive:true})){if(fs.statSync(path.join(mobile,entry)).isFile())assert.ok(allowed(entry.replaceAll('\\','/'),{native:true}),entry);}
 for(const old of ['app.js','wallet.js','paper.js','offline-simulation.js','ui-v2.css','style.css']){assert.equal(allowed(old),false);assert.equal(fs.existsSync(path.join(mobile,old)),false);}
 const server=createWarriorServer({paperFile:null,walletCli:async()=>{throw Error('NO_WALLET');},marketFetch:async()=>{throw Error('NO_MARKET');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{assert.equal(await(await fetch(base+'/')).text(),html);for(const old of ['app.js','wallet.js','paper.js','style.css','runtime-host.html'])assert.equal((await fetch(base+'/'+old)).status,404);assert.equal((await fetch(base+'/card-entry.js')).status,200);}finally{await new Promise(r=>server.close(r));}
});
