const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('strategy list shows one row, expands, responds to screen size, and preserves selections', () => {
  const cards = Array.from({length:9}, () => ({checked:true,classList:{toggle(key,value){this[key]=value;}}}));
  const media = {matches:false,addEventListener(name,callback){this.change=callback;}};
  const toggle = {setAttribute(key,value){this[key]=value;}};
  const dialog = {addEventListener(name,callback){this[name]=callback;}};
  const list = {id:'',querySelectorAll(){return cards;},after(){}};
  let changed;
  const source = fs.readFileSync(require.resolve('../public/agent-setup.js'),'utf8');
  const block = source.slice(source.indexOf('  const compactStrategies='),source.indexOf("  const storageKey="));
  vm.runInNewContext(block, {list,matchMedia:()=>media,
    document:{createElement:()=>toggle,querySelector:()=>dialog},
    MutationObserver:class {constructor(callback){changed=callback;}observe(){}}
  });
  const visible = () => cards.filter(card=>!card.classList['strategy-folded']).length;
  assert.equal(visible(),3); assert.equal(toggle['aria-expanded'],'false');
  toggle.onclick(); assert.equal(visible(),9); assert.equal(toggle['aria-expanded'],'true');
  dialog.close(); assert.equal(visible(),3);
  media.matches=true; media.change(); assert.equal(visible(),1);
  toggle.onclick(); assert.equal(visible(),9);
  toggle.onclick(); assert.equal(visible(),1);
  assert.ok(cards.every(card=>card.checked));
  cards.splice(1); changed(); assert.equal(toggle.hidden,true);
});
