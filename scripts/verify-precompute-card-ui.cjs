const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {createWarriorServer}=require('../server');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../test-results/ui-regression');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=createWarriorServer({paperFile:null,aiDecisionMode:'off',liveTradingEnabled:false,marketFetch:async()=>{throw Error('ISOLATED')},walletCli:async()=>{throw Error('NO_WALLET')}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:360,height:790}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await require('./price-socket-fixture.cjs')(page);
  let state='failed';
  await page.route('**/api/simulation?*',async route=>{const response=await route.fetch(),data=await response.json();if(data.agents)for(const a of data.agents)a.preparation={status:state};await route.fulfill({response,json:data});});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.Warrior?.simulationApi && window.agentSetup);
  await page.evaluate(async()=>{const api=Warrior.simulationApi;const agents=agentSetup.getAgents().slice(0,3).map(a=>({...a,aiConnectionId:'none'}));const battle=await api.create('UI regression',{initialBalance:100,maxRounds:20,agents});sessionStorage.setItem('ui-regression-id',battle.id);});
  await page.reload();await page.locator('.agent-preparation:not([hidden])').first().waitFor();
  const results=[];
  for(const lang of ['zh','en','ja','ko']){
   await page.locator('.language-toggle').selectOption(lang);
   for(const width of [360,768,1440]){
    await page.setViewportSize({width,height:790});
    const card=page.locator('.agent-summary').first();await card.scrollIntoViewIfNeeded();
    const measures=await card.evaluate(el=>{const head=el.querySelector('.agent-round-top'),prep=el.querySelector('.agent-preparation');return{cardWidth:el.clientWidth,scrollWidth:el.scrollWidth,headerHeight:head.getBoundingClientRect().height,preparationInHeader:head.contains(prep),preparationBelowHeader:prep.getBoundingClientRect().top>=head.getBoundingClientRect().bottom,preparation:prep.textContent};});
    assert.equal(measures.preparationInHeader,false);assert.equal(measures.preparationBelowHeader,true);assert.ok(measures.scrollWidth<=measures.cardWidth+1);
    results.push({lang,width,...measures});await card.screenshot({path:path.join(out,'preparation-'+lang+'-'+width+'.png')});
   }
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'preparation-layout.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
