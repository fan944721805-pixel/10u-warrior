const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(saved = new Map()) {
  const elements = [], listeners = {};
  class Element {
    constructor(tag) { this.tag=tag; this.children=[]; this.handlers={}; this.open=false; this.dataset={}; elements.push(this); }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children=nodes; }
    after() {}
    replaceWith() {}
    setAttribute(key,value) { this[key]=value; }
    addEventListener(key,fn) { this.handlers[key]=fn; }
    focus() {}
    showModal() { this.open=true; }
    close() { if (!this.open) return; this.open=false; this.handlers.close?.(); }
    getBoundingClientRect() { return {left:20,right:400,top:20,bottom:400}; }
  }
  const body=new Element('body'),badge=new Element('span'),bar=new Element('section');
  let reads=0;
  const app={state:{},agentLabel:policy=>policy.strategy,emit(){},setState(partial){Object.assign(this.state,partial);},on(type,fn){listeners[type]=fn;},
    simulationApi:{mode:'online',executions(){reads++;return Promise.resolve({executions:[],tradingEnabled:false});}}};
  const document={body,createElement:tag=>new Element(tag),querySelector(selector){
    if(selector==='.topbar .demo-label')return badge;
    if(selector==='#simulation-commandbar')return bar;
    if(selector==='dialog[open]')return elements.find(el=>el.tag==='dialog'&&el.open);
  },querySelectorAll(selector){return selector==='dialog[open]'?elements.filter(el=>el.tag==='dialog'&&el.open):[];}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/betting-mode.js'),'utf8'),{window:{Warrior:app,page(){},addEventListener(){}},document,
    localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)}});
  const dialog=elements.find(el=>el.id==='live-risk-dialog'),toggle=elements.find(el=>el.id==='betting-mode-toggle');
  const [cancel,confirm]=dialog.children[2].children,close=dialog.children[0].children[1];
  const selection=elements.find(el=>el.id==='live-agent-dialog'),selectionDone=elements.find(el=>el.id==='confirm-live-agents');
  return {app,dialog,toggle,cancel,confirm,close,selection,selectionDone,elements,listeners,get reads(){return reads;}};
}

test('live mode and capability reads require explicit confirmation on every entry',()=>{
  const f=fixture();
  assert.equal(f.app.state.bettingMode,'paper');
  f.confirm.onclick(); assert.equal(f.reads,0);
  f.toggle.onclick();
  assert.equal(f.dialog.open,true); assert.equal(f.app.state.bettingMode,'paper'); assert.equal(f.reads,0);
  f.toggle.onclick(); assert.equal(f.dialog.open,true);
  f.confirm.textContent='Translated label'; f.confirm.onclick();
  assert.equal(f.app.state.bettingMode,'paper'); assert.equal(f.selection.open,true); assert.equal(f.dialog.open,false); assert.equal(f.reads,0);
  f.selectionDone.onclick();
  assert.equal(f.app.state.bettingMode,'live'); assert.equal(f.dialog.open,false); assert.equal(f.reads,1);
  f.confirm.onclick(); assert.equal(f.reads,1);
  f.toggle.onclick(); assert.equal(f.app.state.bettingMode,'paper');
  f.toggle.onclick(); assert.equal(f.dialog.open,true); assert.equal(f.app.state.bettingMode,'paper');
});

test('cancel, close, Escape, backdrop and external dismissal all fail closed',()=>{
  const actions=[f=>f.cancel.onclick(),f=>f.close.onclick(),f=>f.dialog.handlers.cancel({preventDefault(){}}),
    f=>f.dialog.handlers.click({target:f.dialog,clientX:0,clientY:0}),f=>f.dialog.close()];
  for(const action of actions){const f=fixture();f.toggle.onclick();action(f);
    assert.equal(f.app.state.bettingMode,'paper');assert.equal(f.dialog.open,false);assert.equal(f.reads,0);
    f.confirm.onclick();assert.equal(f.app.state.bettingMode,'paper');assert.equal(f.reads,0);
  }
});

test('clicking inside the risk panel does not dismiss or confirm',()=>{
  const f=fixture();f.toggle.onclick();f.dialog.handlers.click({target:f.dialog,clientX:50,clientY:50});
  assert.equal(f.dialog.open,true);assert.equal(f.app.state.bettingMode,'paper');assert.equal(f.reads,0);
});

test('live roster preserves policies and paper state; exclusions survive re-entry and reload and are battle-scoped',()=>{
  const saved=new Map(),f=fixture(saved);
  const battle={id:'battle-1',agents:[{id:'A',policy:{strategy:'smart',provider:'claude',skinId:'custom',indicators:['rsi'],maxStakePct:20},cash:88,orders:[]},{id:'B',policy:{strategy:'aggressive'}}]};
  f.app.state.simulation=battle; const original=JSON.stringify(battle);
  f.toggle.onclick();f.confirm.onclick();
  const input=f.elements.find(el=>el.tag==='input'&&el.dataset.agentId==='A');
  assert.equal(input.checked,true);
  input.checked=false;input.onchange();
  assert.equal(f.app.liveParticipation.isIncluded('battle-1','A'),false);
  assert.equal(f.app.liveParticipation.isIncluded('battle-1','B'),true);
  assert.equal(f.app.liveParticipation.isIncluded('battle-2','A'),true);
  assert.equal(JSON.stringify(battle),original);
  f.selectionDone.onclick();
  f.listeners['simulation:update']();
  f.toggle.onclick();f.toggle.onclick();f.confirm.onclick();f.selectionDone.onclick();
  assert.equal(f.app.liveParticipation.isIncluded('battle-1','A'),false);
  const next=fixture(saved);assert.equal(next.app.liveParticipation.isIncluded('battle-1','A'),false);
  const other=f.elements.find(el=>el.tag==='input'&&el.dataset.agentId==='B');
  other.checked=false;other.onchange();
  assert.equal(f.app.liveParticipation.isIncluded('battle-1','B'),false);
  input.checked=true;input.onchange();assert.equal(f.app.liveParticipation.isIncluded('battle-1','A'),true);
});

test('closing participant selection before completion stays in paper mode',()=>{
  const f=fixture();f.toggle.onclick();f.confirm.onclick();
  f.selection.handlers.cancel({preventDefault(){}});
  assert.equal(f.app.state.bettingMode,'paper');assert.equal(f.selection.open,false);assert.equal(f.reads,0);
  f.selectionDone.onclick();assert.equal(f.app.state.bettingMode,'paper');
});

test('live presentation reuses the existing workspace rather than hiding it',()=>{
  const css=fs.readFileSync(require.resolve('../public/betting-mode.css'),'utf8');
  assert.doesNotMatch(css, /#overview\s*>\s*\.workspace/);
  assert.doesNotMatch(css, /#simulation-commandbar\s+\.sim-battles\s*\{\s*display:\s*none/);
});
