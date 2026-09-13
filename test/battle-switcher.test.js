const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('battle tabs share one detail view, retain focus nodes, and label new games by lifecycle',()=>{
  const source=fs.readFileSync(require.resolve('../public/paper.js'),'utf8');
  const script=source.slice(source.indexOf('  function renderBattleSwitcher()'),source.indexOf('  function showEmotionLevel('));
  const root={children:[],append(el){this.children.push(el);}};
  const node=(tag,text)=>({tag,textContent:text,children:[],dataset:{},append(...children){this.children.push(...children);},setAttribute(key,val){this[key]=val;},remove(){root.children=root.children.filter(el=>el!==this);}});
  const controls={pause:{disabled:false},end:{disabled:false}};
  const ctx={battleSwitcher:root,battleButtons:new Map(),launchLabel:{textContent:'开一局'},launchLabelSource:'开一局',selected:'b',current:{id:'b'},initialSelection:true,resetting:false,emotionSaving:false,actionUrgeSaving:false,realtimeEntrySaving:false,
    battles:[{id:'a',status:'running',config:{asset:'BTCUSDT'}},{id:'b',status:'paused',config:{asset:'ETHUSDT'}}],
    statusLabels:{running:'进行中',paused:'已暂停',settling:'等待最后结算',ended:'已结束'},node,sequenceLabel:n=>`第${n}局`,
    $(selector){return controls[selector.slice(1)];},choose(id){ctx.selected=id;},render(data){ctx.rendered=data;ctx.renderBattleSwitcher();},refresh(options){ctx.refreshOptions=options;}};
  ctx.numberedBattles=()=>ctx.battles.filter(b=>!b.placeholder);
  vm.createContext(ctx);vm.runInContext(script,ctx);ctx.renderBattleSwitcher();
  assert.equal(root.hidden,false);assert.equal(root.children.length,2);assert.equal(ctx.launchLabel.textContent,'再开一局');
  const first=root.children[0];first.onclick();assert.equal(ctx.selected,'a');assert.equal(ctx.current,null);assert.equal(ctx.refreshOptions.force,true);assert.equal(controls.pause.disabled,true);assert.equal(first['aria-pressed'],'true');assert.equal(root.children[1]['aria-pressed'],'false');
  ctx.renderBattleSwitcher();assert.equal(root.children[0],first);
  ctx.battles.forEach(b=>b.status='ended');ctx.renderBattleSwitcher();assert.equal(ctx.launchLabel.textContent,'开一局');
  ctx.battles[1].status='settling';ctx.renderBattleSwitcher();assert.equal(ctx.launchLabel.textContent,'再开一局');
  ctx.battles=[{id:'placeholder',placeholder:true,status:'paused'}];ctx.renderBattleSwitcher();assert.equal(root.hidden,true);assert.equal(root.children.length,0);assert.equal(ctx.launchLabel.textContent,'开一局');
});
