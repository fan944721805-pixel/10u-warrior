const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('bundled skins resolve to existing assets and retain saved skin IDs across reloads', () => {
  const storage = new Map();
  const load = () => {
    const window = {dispatchEvent(){}};
    vm.runInNewContext(fs.readFileSync(require.resolve('../public/skin-registry'),'utf8'), {
      window, location:{href:'http://localhost/'}, URL, CustomEvent:class {},
      localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}
    });
    return window.Warrior.skins;
  };
  const registry = load(), bundled = registry.list().filter(skin=>skin.bundled);
  assert.equal(bundled.length,18);
  for(const skin of bundled) {
    assert.ok(fs.existsSync(path.join(__dirname,'../public',skin.imageUrl)));
    assert.equal(load().normalizeId(skin.id),skin.id);
    const styles = new Map();
    const element = {dataset:{},style:{removeProperty:key=>styles.delete(key),setProperty:(key,value)=>styles.set(key,value)}};
    registry.applyElement(element,{skinId:skin.id});
    assert.equal(element.dataset.skinId,skin.id);
    assert.ok(styles.get('--agent-skin-image').includes(skin.imageUrl));
    assert.equal(registry.removeGenerated(skin.id),false);
  }
  registry.registerGenerated({id:'generated-custom-test',name:'Custom',imageUrl:'custom.png'});
  assert.equal(load().get('generated-custom-test').kind,'generated');
  assert.equal(JSON.parse(storage.get('warrior-generated-skins-v1')).length,1);
  assert.equal(registry.get('anime-female').id,'anime-female'); // Legacy battles stay readable.
});

test('all avatar surfaces resolve legacy defaults by strategy and preserve explicit selections', () => {
  const window={dispatchEvent(){}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/skin-registry'),'utf8'),{
    window,location:{href:'http://localhost/'},URL,CustomEvent:class {},CSS:{escape:value=>value},
    localStorage:{getItem:()=>null,setItem(){}}
  });
  const registry=window.Warrior.skins;
  const strategies={aggressive:'rider',smart:'super-ai',conservative:'miser',trendFollowing:'trend-chaser',meanReversion:'bottom-top-hunter',priceAction:'candlestick-bro',breakout:'rocket-bro',orderFlow:'whale-detective',volatilityGuard:'steady-dog',consensus:'six-vote-warrior'};
  const element=()=>({dataset:{},style:{removeProperty(){},setProperty(){}}});
  Object.assign(strategies,{fengShui:'feng-shui-master',diviner:'diviner'});
  for(const [strategy,borrowed] of Object.entries({fengShui:'buffett',diviner:'six-vote-warrior'})){
    assert.equal(registry.resolveId({strategy,skinId:`generated-bundled-${borrowed}`}),`generated-bundled-${strategies[strategy]}`);
    assert.equal(registry.resolveId({strategy,skinId:`chosen:generated-bundled-${borrowed}`}),`chosen:generated-bundled-${borrowed}`);
  }
  for(const [strategy,image] of Object.entries(strategies)) {
    for(const skinId of [undefined,'anime-female','warrior-male','missing-skin']) {
      const policy={strategy,provider:'gpt',skinId},saved=JSON.stringify(policy);
      const surfaces=Array.from({length:5},element);
      surfaces.forEach(avatar=>registry.applyElement(avatar,policy));
      registry.applyAgent('A',policy,{querySelectorAll:()=>surfaces});
      surfaces.forEach(avatar=>assert.equal(avatar.dataset.skinId,`generated-bundled-${image}`));
      assert.equal(JSON.stringify(policy),saved,'historical policy must not be changed');
    }
  }
  for(const skinId of ['generated-bundled-miser','chosen:warrior-male','chosen:generated-bundled-rider']) {
    const avatar=element();
    registry.applyElement(avatar,{skinId,strategy:'breakout'});
    assert.equal(avatar.dataset.skinId,skinId.replace(/^chosen:/,''));
    assert.equal(registry.normalizeId(skinId),skinId);
  }
  const {normalizePolicy}=require('../ai-decision');
  assert.equal(normalizePolicy({skinId:'chosen:warrior-male',strategy:'smart'},'A').skinId,'chosen:warrior-male');
  assert.doesNotMatch(fs.readFileSync(require.resolve('../public/create-dialog.css'),'utf8'),/data-strategy=.*background-image/);
});
