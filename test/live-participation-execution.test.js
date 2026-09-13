const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('excluded Agents cannot quote or submit, including exclusion after a quote',async()=>{
  const elements=[];let selected=false,quotes=0,submits=0;
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};elements.push(this);}
    append(...nodes){this.children.push(...nodes);}
    prepend(...nodes){this.children.unshift(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    insertBefore(node){this.children.push(node);}
    setAttribute(){}
    addEventListener(){}
    showModal(){this.open=true;}
    querySelectorAll(){return elements.filter(el=>el.tag==='button');}
  }
  const preview={battleId:'b',agentId:'a',quotesEnabled:true,tradingEnabled:true,intent:{id:'i',marketTopicId:'m',direction:'UP',amount:10}};
  const api={mode:'online',intent:async()=>preview,quoteIntent:async()=>{quotes++;return {...preview,id:'q',status:'QUOTED'};},submitExecution:async()=>{submits++;return {...preview,status:'SUBMITTED'};}};
  const app={simulationApi:api,state:{bettingMode:'live'},liveParticipation:{isIncluded:()=>selected}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/execution-panel.js'),'utf8'),{window:{Warrior:app},document:{createElement:tag=>new Element(tag),body:new Element('body')}});
  await app.executionPanel.intent('b','i');
  let quote=elements.findLast(el=>el.id==='quote-intent');assert.equal(quote.disabled,true);
  await quote.onclick();assert.equal(quotes,0);
  selected=true;await app.executionPanel.intent('b','i');
  quote=elements.findLast(el=>el.id==='quote-intent');await quote.onclick();assert.equal(quotes,1);
  const consent=elements.findLast(el=>el.id==='execution-consent'),submit=elements.findLast(el=>el.id==='submit-execution');
  consent.checked=true;consent.onchange();assert.equal(submit.disabled,false);
  selected=false;await submit.onclick();assert.equal(submits,0);
  selected=true;app.state.bettingMode='paper';await submit.onclick();assert.equal(submits,0);
});
