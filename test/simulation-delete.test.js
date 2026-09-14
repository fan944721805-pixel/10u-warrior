const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createSimulationBattles}=require('../simulation-battles');
const {createOfflineSimulation}=require('../public/offline-simulation');
test('delete archives one battle, preserves other battles, survives restart and handles default/last battle',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'battle-delete-'));
  try {
    const options={source:{},file:path.join(dir,'ledger.json'),leaseEnabled:true};
    // Explicit pre-migration ledger: fresh installations no longer create an A/B/C battle.
    require('../prediction-sim').createPredictionSimulation({source:{},file:options.file}).setEnabled(false);
    const sim=createSimulationBattles(options),one=sim.create('one'),two=sim.create('two');
    const before=sim.snapshot(two.id),policies=sim.getStrategies();
    await sim.remove(one.id);
    assert.deepEqual(sim.snapshot(two.id).agents,before.agents);
    assert.equal(sim.snapshot(two.id).enabled,true);
    assert.throws(()=>sim.snapshot(one.id),/not found/);
    const archives=fs.readdirSync(path.join(dir,'simulation-archives'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'simulation-archives',archives[0],'deleted-battle.json'))).battle.id,one.id);
    assert.equal(createSimulationBattles(options).list().length,2);
    await sim.remove('default'); await sim.remove(two.id);
    assert.equal(sim.list().length,1);assert.equal(sim.snapshot().placeholder,true);assert.equal(sim.snapshot().enabled,false);
    assert.deepEqual(sim.getStrategies(),policies);assert.deepEqual(sim.leaderboard(),[]);
    assert.equal(createSimulationBattles(options).snapshot().placeholder,true);
    await assert.rejects(sim.remove('../invalid'),/BATTLE_NOT_FOUND/);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
test('offline delete backs up and preserves other battles; storage failure is non-destructive',()=>{
  const values=new Map();let fail=false;
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>{if(fail&&key.includes('archive'))throw Error('full');values.set(key,value);}};
  const sim=createOfflineSimulation({storage}),one=sim.create('one'),two=sim.create('two');
  fail=true;assert.throws(()=>sim.remove(one.id),/full/);assert.equal(sim.list().length,3);
  fail=false;sim.remove(one.id);assert.equal(sim.list().length,2);assert.equal(sim.snapshot(two.id).enabled,true);
  sim.remove('default');sim.remove(two.id);assert.equal(sim.snapshot().placeholder,true);
  assert.equal(createOfflineSimulation({storage}).list().length,1);
});
