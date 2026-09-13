const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const catalog=require('../public/strategy-catalog');
const script=fs.readFileSync(path.join(__dirname,'../public/i18n.js'),'utf8');
const source=script.slice(script.indexOf('const messages = ')+17,script.indexOf('\n  const locales='));
const english=vm.runInNewContext('('+source.trim().replace(/;$/,'')+')');
const context={window:{WarriorStrategyCatalog:catalog}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/i18n-east-asian.js'),'utf8'),context);
const {translate}=context.window.WarriorEastAsian;
test('Japanese and Korean cover every existing Chinese source key and strategy catalog',()=>{
  const keys=[...Object.keys(english),...Object.values(catalog.indicators).map(item=>item.zh),...Object.values(catalog.profiles).flatMap(item=>[item.label,item.description,item.emotionLabel])];
  for(const lang of ['ja','ko'])for(const key of keys){
    if(/[\u3400-\u9fff]/u.test(key))assert.ok(translate(key,lang),`${lang}: ${key}`);
  }
});
test('dynamic translations keep numeric values, names and market symbols intact',()=>{
  assert.equal(translate('第 27 轮','ja'),'第 27 ラウンド');
  assert.equal(translate('第27局','ko'),'제 27 대전');
  assert.equal(translate('BTC 看涨 · 12.75U','ja'),'BTC 上昇 · 12.75U');
  assert.equal(translate('小明の전략 Agent 设置已保存','ko'),'小明の전략 Agent 설정 저장 완료');
  assert.equal(translate('战场 Agent 设置已保存','ja'),'战场 Agent 設定を保存しました');
  assert.equal(translate('10U战神 Agent 设置已保存','ja'),`${translate('10U战神','ja')} Agent 設定を保存しました`);
  assert.equal(translate('起步 8%','ja'),'開始 8%');
  assert.equal(translate('最多 15%','ko'),'최대 15%');
  assert.equal(translate('3 个已配置','ja'),'3 件設定済み');
  assert.equal(translate('UNTRUSTED_PROVIDER_RESPONSE','ja'),null);
});
test('the canonical prompt preserves policy values and JSON output schema for every strategy',()=>{
  for(const profile of Object.values(catalog.profiles)){
    const prompt=catalog.buildDecisionPrompt({strategy:profile.key,asset:'BTCUSDT',decisionVariance:profile.variance,emotionSensitivity:profile.emotionSensitivity,emotionState:'loss',emotionStreak:2,maxStakePct:profile.maxStakePct,allowAllIn:profile.allowAllIn,indicatorFields:profile.recommended});
    assert.ok(prompt.includes('BTC')&&prompt.includes(`max_stake_pct=${profile.maxStakePct}`));
    assert.ok(prompt.includes('paper betting only'));
    assert.ok(prompt.includes('state=loss; streak=2;'));
    assert.ok(!prompt.includes('undefined'));
    const output=JSON.parse(prompt.split('\n').at(-1));
    assert.equal(output.action,'BET|SKIP');assert.equal(output.direction,'UP|DOWN|null');
    assert.equal(output.stake_usdt,0);assert.equal(output.round_id,'');
  }
});
