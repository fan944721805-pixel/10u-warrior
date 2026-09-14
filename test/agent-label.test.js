// Historical UI contracts. Current acceptance is scripts/verify-card-lab.cjs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = require('../public/strategy-catalog');

test('display identity uses strategy, never a saved personal name; historical policy is not mutated', () => {
  const window = {WarriorStrategyCatalog:catalog};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/app-core'),'utf8'), {window,EventTarget});
  for(const [strategy,profile] of Object.entries(catalog.profiles)) {
    const policy = {strategy,name:'Old custom name'};
    assert.equal(window.Warrior.agentLabel(policy),profile.label);
    assert.equal(policy.name,'Old custom name');
  }
  assert.equal(window.Warrior.agentLabel({provider:'claude',name:'Old name'}),catalog.profiles.aggressive.label);
  assert.equal(window.Warrior.agentLabel({strategy:'unknown',name:'Old name'}),'AI');
});

test('Agent name input and its validation handlers are removed', () => {
  for(const file of ['index.html','agent-setup.js','ai-settings.js']) {
    const source = fs.readFileSync(require.resolve(file==='index.html'?'./fixtures/legacy-ui/index.html':'../public/'+file),'utf8');
    assert.doesNotMatch(source, /id="agent-name"|querySelector\('#agent-name'\)/);
  }
});

test('streak emotion has one clear control and follows the Agent configuration path', () => {
  const index = fs.readFileSync(require.resolve('./fixtures/legacy-ui/index.html'),'utf8');
  const setup = fs.readFileSync(require.resolve('../public/agent-setup.js'),'utf8');
  const settings = fs.readFileSync(require.resolve('../public/ai-settings.js'),'utf8');
  const app = fs.readFileSync(require.resolve('../public/app.js'),'utf8');
  assert.equal((index.match(/id="emotion-sensitivity"/g)||[]).length,1);
  assert.match(index,/冷静<\/small><small>容易上头/);
  assert.match(setup,/emotionSensitivity:decision\.emotionSensitivity/);
  assert.match(settings,/'#emotion-sensitivity'/);
  assert.match(app,/手痒只放宽有效信号；情绪影响门槛和金额。没数据、没优势或方向打架时仍然不下注。/);
  assert.equal((index.match(/id="action-urge"/g)||[]).length,1);
  assert.match(index,/能忍就忍<\/small><small>有点就上/);
  assert.match(setup,/actionUrge:decision\.actionUrge/);
  assert.match(settings,/'#action-urge'/);
});

test('battle settings have one arena tilt and one arena action-urge slider wired to the selected battle', () => {
  const index=fs.readFileSync(require.resolve('./fixtures/legacy-ui/index.html'),'utf8');
  const paper=fs.readFileSync(require.resolve('../public/paper.js'),'utf8');
  const api=fs.readFileSync(require.resolve('../public/simulation-api.js'),'utf8');
  assert.equal((index.match(/id="battle-emotion"/g)||[]).length,1);
  assert.match(index,/全场上头值/);
  assert.match(index,/首轮即可提高下注档位，胜负会放大影响；仍受仓位上限约束/);
  assert.match(paper,/api\.setEmotion\(target,emotionLevel\)/);
  assert.match(api,/\/api\/simulation\/emotion/);
  assert.equal((index.match(/id="battle-action-urge"/g)||[]).length,1);
  assert.match(index,/全场手痒值/);
  assert.match(index,/0 保留各自性格，100 全员最手痒；仍可观望，装逼的人须等 CZ 下注/);
  assert.match(paper,/api\.setActionUrge\(target,actionUrgeLevel\)/);
  assert.match(api,/\/api\/simulation\/action-urge/);
});
