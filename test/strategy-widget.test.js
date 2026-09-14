const test = require('node:test');
const assert = require('node:assert/strict');
const { project } = require('../public/strategy-widget');
const fs = require('node:fs'), vm = require('node:vm');
const messages = vm.runInNewContext('(' + fs.readFileSync(require.resolve('../public/i18n.js'),'utf8').match(/const messages = (\{[\s\S]*?\});/)[1] + ')');
const fixture = () => ({ id:'battle-1', name:'自定义 Alpha', status:'running', config:{ initialBalance:10 }, agents:[
  { id:'gpt', policy:{ strategy:'smart', coin:'BTC', apiKey:'DO_NOT_EXPORT' }, equity:18, cash:13, addedCapital:5,
    orders:[{status:'WON',start:0,end:100,direction:'DOWN'}, {status:'OPEN',start:100,end:200,direction:'UP'}] },
] });
test('widget reports each battle/agent independently and excludes deposits from profit', () => {
  const second = {...fixture(), id:'battle-2', name:'Second'};
  const {rows} = project([fixture(),second,{...fixture(),placeholder:true}],{now:150});
  assert.equal(rows.length,2); assert.notEqual(rows[0].key,rows[1].key);
  assert.equal(rows[0].funds,'模拟资金  18.00 U'); assert.equal(rows[0].profit,'已结算收益  +3.00 U');
  assert.equal(rows[0].fundsValue,'18.00 U'); assert.equal(rows[0].profitValue,'+3.00 U');
  assert.equal(rows[0].fundsLabel,'模拟资金'); assert.equal(rows[0].roundLabel,'本轮下注');
  assert.equal(rows[0].action,'看涨'); assert.equal(rows[0].battleName,'自定义 Alpha');
  assert.ok(!JSON.stringify(rows).includes('DO_NOT_EXPORT'));
});
test('settlement-pending and old decisions are never advertised as a new current bet', () => {
  const b=fixture(); assert.equal(project([b],{now:201}).rows[0].action,'等待结算');
  b.agents[0].orders[1].status='LOST'; b.agents[0].lastDecision={action:'BET',direction:'UP'};
  assert.equal(project([b],{now:201}).rows[0].action,'观望');
});
test('expanded card uses ledger fields and separates current bets from older pending settlement', () => {
  const b=fixture(), a=b.agents[0];
  Object.assign(a,{reserved:5,wins:3,losses:1,winRate:.75});
  a.orders=[{status:'OPEN',start:100,end:200,direction:'UP',amount:3,referencePrice:12345.67},
    {status:'OPEN',start:0,end:100,direction:'DOWN',amount:2,referencePrice:999}];
  const row=project([b],{now:150}).rows[0];
  assert.equal(row.cashValue,'13.00 U');assert.equal(row.reservedValue,'5.00 U');
  assert.equal(row.betValue,'3.00 U');assert.equal(row.previousValue,'2.00 U');
  assert.equal(row.referenceValue,'12345.67 USDT');assert.equal(row.winValue,'75.00%');assert.equal(row.winRecord,'3/4');
  const expired=project([b],{now:250}).rows[0];
  assert.equal(expired.betValue,'—');assert.equal(expired.previousValue,'5.00 U');assert.equal(expired.referenceValue,'');
  assert.equal(expired.action,'等待结算');
});
test('expanded card keeps unavailable numbers unknown and translates every added label', () => {
  const b=fixture();delete b.agents[0].cash;
  const row=project([b],{now:150,t:v=>messages[v]||v}).rows[0];
  assert.equal(row.cashValue,'— U');assert.equal(row.reservedValue,'— U');assert.equal(row.winValue,'—');assert.equal(row.winRecord,'—');
  for(const key of ['cashLabel','reservedLabel','previousLabel','referenceLabel','winLabel','detailLabel','roundLabel'])assert.ok(!/[\u3400-\u9fff]/u.test(row[key]),key);
});
test('paused, ended, unavailable and language changes do not change identity or financial state', () => {
  const b=fixture(); b.status='paused';
  const zh=project([b],{now:150});
  const en=project([b],{now:150,t:v=>({'已暂停':'Paused','模拟资金':'Paper funds','看涨':'Up'})[v]||v});
  assert.equal(en.rows[0].status,'Paused'); assert.equal(en.rows[0].action,'Up');
  assert.equal(en.rows[0].key,zh.rows[0].key); assert.equal(en.rows[0].battleName,zh.rows[0].battleName);
  assert.equal(project([b],{network:'error'}).rows[0].status,'行情连接中断');
  b.status='ended'; assert.equal(project([b]).rows[0].status,'已结束');
  b.error='STORAGE_ERROR'; assert.equal(project([b]).rows[0].status,'等待恢复');
  assert.deepEqual(project([]).rows,[]);
});
test('actual English dictionary covers both bet directions and every widget state', () => {
  const b=fixture(), t=value=>messages[value]||value;
  for(const direction of ['UP','DOWN'])for(const status of ['running','paused','ended','settling','reconnecting','retry-paused','awaiting-settlement']) {
    b.status=status; b.agents[0].orders[1].direction=direction;
    const row=project([b],{now:150,t}).rows[0];
    assert.equal(row.action,direction==='UP'?'Up':'Down');
    assert.ok(!/[\u3400-\u9fff]/u.test([row.funds,row.profit,row.action,row.status].join(' ')));
  }
});
