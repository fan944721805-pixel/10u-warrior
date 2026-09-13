const test = require('node:test');
const assert = require('node:assert/strict');
const { ROUND_MS, STORAGE_KEY, simulatedIndicatorSnapshot, createOfflineSimulation } = require('../public/offline-simulation');
const { evaluateCoreStrategy, profiles } = require('../public/strategy-catalog');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('offline simulation creates persisted paper battles without a server', () => {
  let timestamp = Date.UTC(2026, 8, 12, 4, 1, 0);
  const storage = memoryStorage();
  const runtime = createOfflineSimulation({ storage, now: () => timestamp, randomUUID: () => 'battle-test' });

  const initial = runtime.snapshot();
  assert.equal(initial.decisionEngine.mode, 'offline');
  assert.equal(initial.agents.length, 3);
  assert.equal(initial.activeMarket.source, 'offline-simulated');
  assert.ok(initial.agents.every(agent => agent.equity === 100));
  assert.ok(storage.getItem(STORAGE_KEY));

  const created = runtime.create('#002');
  assert.equal(created.id, 'battle-test');
  assert.equal(runtime.list().length, 2);
  assert.equal(runtime.setEmotion('battle-test', 85).config.emotionLevel, 85);
  assert.equal(runtime.setActionUrge('battle-test', 70).config.actionUrgeLevel, 70);
  assert.equal(runtime.snapshot().config.emotionLevel, 0);
  assert.equal(runtime.snapshot().config.actionUrgeLevel, 0);

  const restored = createOfflineSimulation({ storage, now: () => timestamp });
  assert.equal(restored.snapshot('battle-test').name, '#002');
  assert.equal(restored.snapshot('battle-test').config.emotionLevel, 85);
  assert.equal(restored.snapshot('battle-test').config.actionUrgeLevel, 70);
});
test('offline battles preserve BNB and the selected one-day boundary', () => {
  const timestamp = Date.UTC(2026,8,12,4,1,0), storage=memoryStorage();
  const runtime=createOfflineSimulation({storage,now:()=>timestamp,randomUUID:()=> 'bnb-daily'});
  const battle=runtime.create('BNB daily',{period:'1d',agents:[{id:'bnb',coin:'BNB',strategy:'smart'}]});
  assert.equal(battle.config.asset,'BNBUSDT');assert.equal(battle.config.period,'1d');assert.equal(battle.config.roundMs,24*60*60*1000);
  assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(new Date(battle.nextSlot)),'12');
  assert.equal(createOfflineSimulation({storage,now:()=>timestamp}).snapshot('bnb-daily').config.period,'1d');
});

test('offline simulation settles locally and keeps pause and strategy controls', () => {
  let timestamp = Date.UTC(2026, 8, 12, 4, 1, 0);
  const storage = memoryStorage();
  const runtime = createOfflineSimulation({ storage, now: () => timestamp });
  assert.equal(runtime.snapshot().enabled, false);
  const before = runtime.setEnabled('default', true);
  const firstRound = before.roundCount;

  timestamp = before.nextSlot;
  const after = runtime.snapshot();
  assert.equal(after.roundCount, firstRound + 1);

  const paused = runtime.setEnabled('default', false);
  assert.equal(paused.enabled, false);
  const pausedRound = paused.roundCount;
  timestamp += ROUND_MS;
  const settled = runtime.snapshot();
  assert.equal(settled.roundCount, pausedRound);
  assert.ok(settled.agents.some(agent => agent.wins + agent.losses > 0));

  const policies = runtime.setStrategies([
    { name: 'Alpha', strategy: 'conservative', actionUrge:73, emotionSensitivity:88, maxStakePct: 90, allowAllIn: true },
    { name: 'Beta', strategy: 'smart' },
    { name: 'Gamma', strategy: 'aggressive' },
  ]);
  assert.equal(policies.agents[0].name, 'Alpha');
  assert.equal(policies.agents[0].maxStakePct, 10);
    assert.equal(policies.agents[0].allowAllIn, false);
    assert.equal(policies.agents[0].actionUrge, 73);
    assert.equal(policies.agents[0].emotionSensitivity, 88);
  assert.deepEqual(policies.agents[0].indicators, profiles.conservative.recommended);
});

test('offline core strategies decide from one shared, clearly simulated indicator snapshot', () => {
  let timestamp = Date.UTC(2026, 8, 12, 4, 1, 0);
  const storage = memoryStorage();
  const runtime = createOfflineSimulation({ storage, now: () => timestamp, randomUUID: () => 'indicator-battle' });
  const battle = runtime.create('indicator audit', { agents: [
    { id:'one', name:'One', strategy:'smart', provider:'gpt', coin:'BTC' },
    { id:'two', name:'Two', strategy:'smart', provider:'gpt', coin:'BTC' },
  ] });
  timestamp = battle.nextSlot;
  const opened = runtime.snapshot(battle.id);
  const [one,two] = opened.agents;
  assert.equal(opened.indicators.source,'offline-simulated');
  assert.equal(opened.indicators.simulated,true);
  assert.deepEqual(one.lastDecision.indicators,two.lastDecision.indicators);
  assert.deepEqual(one.lastDecision.factors,two.lastDecision.factors);
  assert.equal(one.lastDecision.direction,two.lastDecision.direction);
  const signal=evaluateCoreStrategy('smart',opened.indicators);
  if(one.lastDecision.action==='BET') assert.equal(one.lastDecision.direction,signal.score>=0?'UP':'DOWN');
  else assert.ok(Math.abs(signal.score)<1.5||one.lastDecision.confidence<68);
  assert.deepEqual(runtime.indicators('ETHUSDT'),simulatedIndicatorSnapshot('standalone',Math.floor(timestamp/ROUND_MS)*ROUND_MS,'ETHUSDT'));
});
