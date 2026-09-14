const test=require('node:test'),assert=require('node:assert/strict');
const {samplingFor}=require('../ai-sampling.cjs');
const {createAiConnections}=require('../ai-connections');
const {normalizePolicy,buildDecisionContext,createDeepSeekDecisionProvider,DECISION_META}=require('../ai-decision');
const {makeCard}=require('../public/card-lab-data');
const {DEFAULTS}=require('../global-controls.cjs');
const now=1800000000000;
const skip=id=>({round_id:id,action:'SKIP',direction:null,stake_usdt:0,stake_pct:0,confidence:0,risk_mode:'WAIT',reason:'wait',factors:[],warnings:[],data_fresh:true,skip_reason_code:'MODEL_UNCERTAIN'});
function inputFor(variance=0){return buildDecisionContext({
 policy:normalizePolicy({cardSnapshot:makeCard('orderFlow','original',123)},'card'),
 market:{roundId:'r',secondsToClose:300,upOdds:2.5,downOdds:2.5,dataTimestamp:now},
 indicators:{dataTimestamp:now,price:100,priceChangePct:{oneMinute:.1,fiveMinutes:.3},takerFlow:{buyRatio:.7,netBase:40,totalBase:100},spotOrderBookImbalance:.3,spread:{basisPoints:1},longReturns:{fifteenMinutes:.3,sixtyMinutes:1}},
 account:{balance:100,initialBalance:100,openStake:0,wins:0,losses:0,winStreak:0,lossStreak:0},globalControls:{...DEFAULTS,variance}
});}
const supported=[['deepseek','deepseek-chat'],['deepseek','deepseek-v4-flash'],['openai','gpt-4o-mini'],['openai','gpt-4.1-2025-04-14'],['openai','gpt-5.1'],['openai','gpt-5.2'],['openai','gpt-5.4'],['anthropic','claude-sonnet-4-6'],['anthropic','claude-opus-4-6'],['anthropic','claude-haiku-4-5-20251001']];
const omitted=[['openai','gpt-6-astra'],['openai','gpt-5'],['openai','gpt-5-mini'],['openai','gpt-5.4-pro'],['openai','o3'],['openai','gpt-4o-search-preview'],['openai','gpt-4o-unverified'],['anthropic','claude-opus-4-7'],['anthropic','claude-sonnet-5'],['deepseek','deepseek-reasoner'],['custom','gpt-4o'],['custom','my-model']];

test('only supported models receive bounded variance sampling; unknown and reasoning models omit it',()=>{
 for(const [provider,model] of supported)for(const variance of [0,22.5,100]){
  const result=samplingFor({provider,model,variance,thinkingDisabled:true});
  assert.equal(result.parameters.temperature,.15+variance/200,model);
  assert.equal(result.audit.temperature,result.parameters.temperature);assert.equal(result.audit.mode,'variance');
 }
 for(const [provider,model] of omitted){const result=samplingFor({provider,model,variance:100,thinkingDisabled:true});assert.deepEqual(result.parameters,{},model);assert.equal(result.audit.temperature,null);}
 assert.equal(samplingFor({provider:'deepseek',model:'deepseek-chat',variance:100}).parameters.temperature,undefined);
 for(const variance of [NaN,Infinity,-1,101,'50',undefined])assert.throws(()=>samplingFor({provider:'openai',model:'gpt-4o',variance}),{code:'AI_VARIANCE_INVALID'});
 assert.deepEqual(samplingFor({provider:'openai',model:'gpt-4o',kind:'test'}).parameters,{});
});

test('saved API connections send the effective global variance and retain actual sampling in audit metadata',async()=>{
 for(const [provider,model] of [...supported,...omitted]){
  const sent=[],audits=[];
  const store=createAiConnections({now:()=>now,fetchImpl:async(url,options)=>{
   const body=JSON.parse(options.body),input=JSON.parse(body.messages.at(-1).content);sent.push(body);
   const answer=JSON.stringify(skip(input.market.round_id));
   return Response.json(provider==='anthropic'?{content:[{type:'text',text:answer}]}:{choices:[{message:{content:answer}}]});
  }});
  await store.save({provider,model,baseUrl:'https://model.example/v1',apiKey:'fixture-secret'},true);
  assert.equal(sent[0].temperature,undefined);store.assign('orderFlow',provider);
  for(const variance of [0,100]){
   const input=inputFor(variance),before=structuredClone(input);
   const raw=await store.router.decide(input,{now:()=>now,onRequest:r=>audits.push(r)});
   const sampling=raw[DECISION_META].sampling;
   assert.equal(sampling.variance,input.policy.decision_variance);
   assert.equal(sent.at(-1).temperature,sampling.temperature??undefined);
   assert.deepEqual(audits.at(-1).sampling,sampling);assert.deepEqual(store.snapshot().recent[0].sampling,sampling);
   assert.deepEqual(input,before);assert.ok(!JSON.stringify(audits).includes('fixture-secret'));
   if(supported.some(([p,m])=>p===provider&&m===model))assert.equal(sent.at(-1).temperature,Number((.15+input.policy.decision_variance/200).toFixed(6)));
   else assert.equal(sent.at(-1).temperature,undefined);
   if(model==='deepseek-reasoner')assert.equal(sent.at(-1).thinking,undefined);
   if(provider==='openai'&&/^gpt-5\.[124]$/.test(model))assert.equal(sent.at(-1).reasoning_effort,'none');
  }
 }
});

test('environment DeepSeek adapter shares sampling, omits unsupported values and audits the exact request',async()=>{
 for(const model of ['deepseek-chat','deepseek-reasoner','unknown-model']){
  let request,audit;
  const provider=createDeepSeekDecisionProvider({apiKey:'fixture-secret',model,fetchImpl:async(_,options)=>{
   request=options;return Response.json({choices:[{message:{content:JSON.stringify(skip('r'))}}]});
  }});
  const input=inputFor(100),raw=await provider.decide(input,{now:()=>now,onRequest:r=>audit=r});
  assert.equal(request.redirect,'error');assert.deepEqual(JSON.parse(request.body),audit.body);
  assert.deepEqual(raw[DECISION_META].sampling,audit.sampling);
  assert.equal(audit.body.temperature,model==='deepseek-chat'?.65:undefined);
  assert.deepEqual(audit.body.thinking,model==='deepseek-chat'?{type:'disabled'}:undefined);
  assert.ok(!JSON.stringify(audit).includes('fixture-secret'));
 }
});
