// Real Android + live public prices; only a disposable emulator creates test battles.
const {connect}=require('./android-cdp.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const serial=process.env.ANDROID_TEST_SERIAL;
if(!/^emulator-\d+$/.test(serial||''))throw Error('Select a disposable emulator');
const out=path.resolve(__dirname,'../test-results/background-service');fs.mkdirSync(out,{recursive:true});
const stage=process.argv[2]||'start';
(async()=>{
  const c=await connect(serial),ui=await c.attach(p=>p.url==='https://localhost/'),engine=await c.attach(p=>p.url.includes('/runtime-host.html'));
  try {
    for(let attempt=0;attempt<30;attempt++){
      if(await ui.evaluate('!!window.Warrior?.simulationApi?.serviceStatus'))break;
      await new Promise(r=>setTimeout(r,300));
    }
    if(stage==='start'){
      const battle=await ui.evaluate(`Warrior.simulationApi.create('Background service verification',{initialBalance:100,rounds:5,period:'5m',realtimeEntry:true,agents:[{id:'A',strategy:'czBrother',coin:'BTC',maxStakePct:20},{id:'B',strategy:'aggressive',coin:'BTC',maxStakePct:20},{id:'C',strategy:'smart',coin:'BTC',maxStakePct:20}]},'background-service-'+Date.now())`);
      const before=await engine.evaluate('WarriorServiceHost.diagnostics()');
      assert.equal(await ui.evaluate('!!window.WarriorStorageNative'),false);
      assert.equal((await ui.evaluate('Warrior.simulationApi.serviceStatus()')).foreground,true);
      const state={id:battle.id,before,homeAt:Date.now(),nextSlot:battle.nextSlot};
      c.adb('shell','input','keyevent','KEYCODE_HOME');c.adb('shell','input','keyevent','KEYCODE_SLEEP');
      fs.writeFileSync(path.join(out,'state.json'),JSON.stringify(state,null,2));console.log(JSON.stringify(state));
    }else{
      const state=JSON.parse(fs.readFileSync(path.join(out,'state.json')));
      const beforeRead=Date.now();
      const diag=await engine.evaluate('WarriorServiceHost.diagnostics()');
      const service=await ui.evaluate('Warrior.simulationApi.serviceStatus()');
      const battle=await ui.evaluate(`Warrior.simulationApi.report(${JSON.stringify(state.id)})`);
      const orders=battle.agents.flatMap(a=>a.orders).map(o=>({id:o.id,placedAt:o.placedAt,status:o.status}));
      const result={beforeRead,diag,service,hidden:await ui.evaluate('document.hidden'),roundCount:battle.roundCount,orders,errors:battle.agents.map(a=>({status:a.lastStatus,reason:a.reason})),network:await ui.evaluate('Warrior.simulationApi.networkStatus()')};
      fs.writeFileSync(path.join(out,stage+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
      assert.equal(result.hidden,true);assert.equal(diag.instanceId,state.before.instanceId);assert.equal(service.foreground,true);
      assert.ok(diag.streams.some(s=>s.received>0&&s.lastReceived>state.homeAt&&s.lastReceived<beforeRead));
      assert.ok(orders.some(o=>o.placedAt>state.homeAt&&o.placedAt<beforeRead-2000),'Needs an order placed naturally while detached/backgrounded');
    }
  }finally{ui.close();engine.close();c.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
