const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createAiConnections, usageOf } = require('../ai-connections');
const { DECISION_META, normalizePolicy, buildDecisionContext, createMockDecisionProvider } = require('../ai-decision');
const { createPredictionSimulation, ROUND } = require('../prediction-sim');
const { createWarriorServer } = require('../server');

const settings = { provider: 'deepseek', baseUrl: 'https://api.deepseek.com', model: 'fixture-model', apiKey: 'test-secret-never-log' };
test('queued pre-round AI work may finish after ten seconds while live review retains its freshness deadline',async()=>{
  const start=1800000000000;let time=start;
  const store=createAiConnections({fetchImpl:transport(),now:()=>time});
  await store.save(settings,true);store.assign('smart','deepseek');
  const input=fixture(start).input;input.market.entry_mode='precompute';time=start+12000;
  const raw=await store.router.decide(input,{now:()=>time,deadlineMs:start+45000});
  assert.equal(raw.round_id,'r');assert.equal(input.market.data_timestamp,start);
  input.market.entry_mode='signal';
  await assert.rejects(store.router.decide(input,{now:()=>time,deadlineMs:start+45000}),/AI_DEADLINE_EXPIRED/);
});
const skip = id => ({ round_id:id, action:'SKIP', direction:null, stake_usdt:0, stake_pct:0, confidence:0, risk_mode:'WAIT', skip_reason_code:'MODEL_UNCERTAIN', factors:[], reason:'fixture', data_fresh:true, warnings:[] });
const indicators = time => ({ dataTimestamp:time, priceChangePct:{oneMinute:.4,fiveMinutes:1.2}, rsi14:62, ema:{ema5:105,ema20:100},volumeRatio:1.2,spotOrderBookImbalance:.2,
  macd:{line:1,signal:.5,histogram:.5},bollinger:{middle:100,upper:103,lower:97,percentB:.7,bandwidthPct:6},atr:{value:.2,percent:.2},adx:{adx:28,plusDI:30,minusDI:10},roc:{tenMinutes:.8,twentyMinutes:1.2},longReturns:{fifteenMinutes:.9,sixtyMinutes:2.1},momentum:2,volatility:{perMinutePct:.1},takerFlow:{buyRatio:.65,netBase:30,totalBase:100},spread:{basisPoints:1,mid:100,microprice:100.001,micropriceBiasBps:.1} });
function fixture(time = Date.now(), strategy='smart') {
  const policy = normalizePolicy({strategy, maxStakePct:10,allowAllIn:false},'A');
  return {policy,input:buildDecisionContext({market:{roundId:'r',secondsToClose:300,upOdds:2,downOdds:2,dataTimestamp:time},indicators:indicators(time),account:{balance:100,initialBalance:100,wins:0,losses:0,winStreak:0,lossStreak:0,openStake:0},policy})};
}
function transport(answer = input => skip(input.market.round_id), usage = { prompt_tokens:100, completion_tokens:20, prompt_cache_hit_tokens:40 }) {
  return async (_, request) => {
    const body = JSON.parse(request.body), input = JSON.parse(body.messages.at(-1).content);
    return {ok:true,json:async()=>({model:body.model,choices:[{message:{content:JSON.stringify(input.market.round_id==='connection-test'?skip('connection-test'):answer(input))},finish_reason:'stop'}],usage})};
  };
}
test('tested connection persists encrypted, routes the selected strategy, and records real usage separately from output', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'warrior-ai-test-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'connections.json'), store=createAiConnections({file,fetchImpl:transport()});
  await store.save(settings);
  assert.throws(()=>store.assign('smart','deepseek'),{code:'AI_CONNECTION_NOT_TESTED'});
  await store.save({...settings,apiKey:''},true);store.assign('smart','deepseek');
  const raw=await store.router.decide(fixture().input);
  assert.equal(raw[DECISION_META].engine.connectionId,'deepseek');
  assert.equal(raw[DECISION_META].usage.usage.input,100);
  assert.equal(store.snapshot().usage.deepseek.total,240);
  assert.equal(store.snapshot().usage.deepseek.calls,2);
  assert.ok(!JSON.stringify(store.snapshot()).includes(settings.apiKey));
  assert.ok(!fs.readFileSync(file,'utf8').includes(settings.apiKey));
  const restored=createAiConnections({file,fetchImpl:transport()});
  assert.equal(restored.snapshot().assignments.smart,'deepseek');
  assert.equal((await restored.router.decide(fixture().input))[DECISION_META].engine.model,settings.model);
});
test('none uses local rules without a network request; other strategies retain their own assignment', async () => {
  let calls=0;const wire=transport(),store=createAiConnections({fetchImpl:(...args)=>{calls++;return wire(...args);}});
  await store.save(settings,true);store.assign('smart','deepseek');store.assign('aggressive','none');
  const count=calls;
  const result=await store.router.decide(fixture(Date.now(),'aggressive').input);
  assert.equal(calls,count);assert.ok(['BET','SKIP'].includes(result.action));
  assert.equal(store.router.describeFor(fixture(Date.now(),'aggressive').input).mode,'mock');
  assert.equal(store.router.describeFor(fixture().input).connectionId,'deepseek');
});
test('a failed changed model cannot inherit test success, and deletion never falls back to rules', async () => {
  let reject=false;const wire=transport();const store=createAiConnections({fetchImpl:(...args)=>reject?Promise.resolve({ok:false,status:401}):wire(...args)});
  await store.save(settings,true);store.assign('smart','deepseek');reject=true;
  await assert.rejects(store.save({...settings,model:'changed'},true),{code:'AI_AUTH_FAILED'});
  assert.equal(store.snapshot().connections[0].tested,false);
  await assert.rejects(store.router.decide(fixture().input),{code:'AI_CONNECTION_NOT_TESTED'});
  store.remove('deepseek');await assert.rejects(store.router.decide(fixture().input),{code:'AI_CONNECTION_NOT_TESTED'});
});
test('changed assignments discard in-flight decisions even after changing back; usage is still counted', async () => {
  let release,started;const waiting=new Promise(r=>started=r),wire=transport();
  const store=createAiConnections({fetchImpl:async (...args)=>{
    if(JSON.parse(args[1].body).messages.at(-1).content.includes('connection-test'))return wire(...args);
    started();await new Promise(r=>release=r);return wire(...args);
  }});
  await store.save(settings,true);store.assign('smart','deepseek');const running=store.router.decide(fixture().input);await waiting;
  store.assign('smart','none');store.assign('smart','deepseek');release();
  await assert.rejects(running,{code:'AI_CONFIGURATION_CHANGED'});assert.equal(store.snapshot().usage.deepseek.calls,2);
});
test('token accounting handles cache subsets and missing usage without inventing zero tokens', () => {
  assert.deepEqual(usageOf({usage:{input_tokens:10,output_tokens:20,cache_read_input_tokens:30,cache_creation_input_tokens:40}},'anthropic'),{input:80,output:20,cached:30,cacheWrite:40,total:100});
  const usage=usageOf({usage:{prompt_tokens:100,completion_tokens:20,prompt_tokens_details:{cached_tokens:40}}},'openai');
  assert.equal(usage.total,120);
  assert.equal(usageOf({},'deepseek'),null);
  assert.equal(usageOf({usage:{prompt_tokens:1,completion_tokens:2,prompt_cache_hit_tokens:3}},'deepseek'),null);
});
test('malformed or truncated provider output is rejected and its reported tokens are counted', async () => {
  for(const bad of [ {choices:[{message:{content:'not JSON'}}]}, {choices:[{message:{content:'{}'},finish_reason:'length'}]} ]) {
    const store=createAiConnections({fetchImpl:async()=>({ok:true,json:async()=>({...bad,usage:{prompt_tokens:100,completion_tokens:20}})})});
    await assert.rejects(store.save(settings,true));
    assert.equal(store.snapshot().usage.deepseek.total,120);assert.equal(store.snapshot().connections[0].tested,false);
  }
});
test('endpoint changes need a new key; error payloads and redirect responses never leak credentials', async () => {
  let request;const store=createAiConnections({fetchImpl:async(_,options)=>{request=options;return {ok:false,status:401,json:async()=>({error:{message:settings.apiKey}})};}});
  await store.save(settings);
  await assert.rejects(store.save({...settings,baseUrl:'https://other.example',apiKey:''},true),{code:'AI_KEY_REQUIRED'});
  await assert.rejects(store.save(settings,true), e=>e.code==='AI_AUTH_FAILED'&&!e.message.includes(settings.apiKey));
  assert.equal(request.redirect,'error');
});
test('OpenAI and Anthropic requests use their own schemas and usage fields', async () => {
  for(const provider of ['openai','anthropic']){
    let captured;
    const store=createAiConnections({fetchImpl:async(url,options)=>{captured={url,options,body:JSON.parse(options.body)};return {ok:true,json:async()=>provider==='anthropic'?{content:[{type:'text',text:JSON.stringify(skip('connection-test'))}],usage:{input_tokens:100,output_tokens:20}}:{choices:[{message:{content:JSON.stringify(skip('connection-test'))}}],usage:{prompt_tokens:100,completion_tokens:20}}};}});
    await store.save({...settings,provider},true);
    if(provider==='anthropic'){assert.match(captured.url,/\/messages$/);assert.ok(captured.body.system);assert.ok(captured.options.headers['x-api-key']);}
    else{assert.ok(captured.body.max_completion_tokens);assert.equal(captured.body.temperature,undefined);}
    assert.equal(store.snapshot().usage[provider].total,120);
  }
});
test('tested assigned model passes through the formal simulation into an audited paper order', async () => {
  let time=1800000010000;const slot=(Math.floor(time/ROUND)+1)*ROUND;
  const store=createAiConnections({now:()=>time,fetchImpl:transport(input=>({...skip(input.market.round_id),action:'BET',direction:'UP',stake_usdt:5,stake_pct:5,confidence:90,risk_mode:'NORMAL'}))});
  await store.save(settings,true);store.assign('smart','none');
  const policy=normalizePolicy({...fixture(time).policy,aiConnectionId:'deepseek',aiConnectionRevision:store.snapshot().connections[0].revision},'A');
  const market=start=>({marketTopicId:start,symbol:'BTCUSDT',marketVariant:'CRYPTO_UP_DOWN',collateral:'USDT',startDate:start,endDate:start+ROUND,markets:[{marketId:start,status:'REGISTERED',tradingStatus:'OPEN',outcomes:[{name:'Up',tokenId:'up'},{name:'Down',tokenId:'down'}]}]});
  const sim=createPredictionSimulation({now:()=>time,source:{marketFor:async start=>market(start),detail:async id=>market(id),book:async(_,direction)=>({tokenId:direction==='UP'?'up':'down',timestamp:time,asks:[{price:.4,size:1000}]})},indicatorSource:{snapshot:async()=>indicators(time)},decisionProvider:store.router,policyFor:()=>policy,agentPolicies:[policy]});
  await sim.tick();time=slot;await sim.tick();
  const agent=sim.snapshot().agents[0];assert.equal(agent.cash,95);assert.equal(agent.latest.amount,5);
  assert.equal(agent.latest.decision.engine.connectionId,'deepseek');assert.equal(agent.latest.decision.usage.usage.total,120);
  assert.equal(sim.snapshot().config.agents[0].aiConnectionId,'deepseek');
});

test('battle-specific model and no-AI choices override global routing without changing another battle', async () => {
  let calls=0;const wire=transport();const store=createAiConnections({fetchImpl:(...args)=>{calls++;return wire(...args);}});
  await store.save(settings,true);store.assign('smart','deepseek');
  const local=fixture().input;local.policy.ai_connection_id='none';
  await store.router.decide(local);assert.equal(calls,1);
  const external=fixture().input;external.policy.ai_connection_id='deepseek';external.policy.ai_connection_revision=store.snapshot().connections[0].revision;
  store.assign('smart','none');
  assert.equal((await store.router.decide(external))[DECISION_META].engine.connectionId,'deepseek');assert.equal(calls,2);
  await store.save({...settings,model:'replacement'},true);
  await assert.rejects(store.router.decide(external),{code:'AI_CONFIGURATION_CHANGED'});
  assert.throws(()=>store.assertAgents([{aiConnectionId:'deepseek',aiConnectionRevision:external.policy.ai_connection_revision}]),{code:'AI_CONFIGURATION_CHANGED'});
});
test('HTTP settings reject cross-origin changes and expose no secrets; preview never creates orders', async t => {
  const server=createWarriorServer({walletCli:async()=>{throw new Error('NO_WALLET');},paperFile:null,aiFetch:transport(),indicatorSource:{snapshot:async()=>indicators(Date.now())},marketFetch:async()=>{throw new Error('NO_MARKET');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(url,body,headers={})=>fetch(base+url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await post('/api/ai/connections/test',settings,{origin:'https://evil.example'})).status,403);
  assert.equal((await post('/api/ai/connections/test',settings)).status,200);
  assert.equal((await post('/api/ai/assignments',{strategy:'smart',connectionId:'deepseek'})).status,200);
  const before=await(await fetch(base+'/api/simulation')).json();
  const preview=await(await post('/api/ai/preview',{strategy:'smart'})).json();
  assert.equal(preview.ordersCreated,0);assert.equal(preview.engine.connectionId,'deepseek');assert.equal(preview.plan.action,'SKIP');
  const after=await(await fetch(base+'/api/simulation')).json();assert.deepEqual(after.agents.map(a=>a.cash),before.agents.map(a=>a.cash));
  const publicData=await(await fetch(base+'/api/ai/settings')).text();assert.ok(!publicData.includes(settings.apiKey));
});
