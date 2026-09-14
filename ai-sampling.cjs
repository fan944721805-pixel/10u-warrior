// Capabilities verified against provider docs; see 05-global-emotion.md.
// Use a bounded allowlist: new/reasoning/custom models must not inherit an
// unsupported parameter merely because their names resemble a supported model.
const deepseekNonThinking=model=>/^(?:deepseek-chat|deepseek-v4-(?:flash|pro))$/.test(String(model||'').toLowerCase())?{thinking:{type:'disabled'}}:{};
function samplingFor({provider,model,variance,kind='decision',thinkingDisabled=false}) {
  const audit={version:1,mode:'provider-default',reason:'MODEL_CAPABILITY_UNKNOWN',variance:null,temperature:null};
  if(kind!=='decision')return {parameters:{},audit:{...audit,reason:'CONNECTION_CHECK'}};
  if(!Number.isFinite(variance)||variance<0||variance>100)throw Object.assign(Error('AI_VARIANCE_INVALID'),{code:'AI_VARIANCE_INVALID',statusCode:422,requestStarted:false});
  audit.variance=variance;
  const name=String(model||'').toLowerCase(),parameters={};
  let supported=false;
  if(provider==='openai') {
    supported=/^gpt-4(?:o(?:-mini)?|\.1(?:-mini|-nano)?)(?:-\d{4}-\d{2}-\d{2})?$/.test(name);
    if(/^gpt-5\.(?:1|2|4)(?:-\d{4}-\d{2}-\d{2})?$/.test(name)) {
      // These model defaults are none. Make the required compatibility explicit.
      supported=true;parameters.reasoning_effort='none';
    } else if(/^(?:gpt-6(?:[.-]|$)|gpt-5(?:-(?:mini|nano)|$)|o[134](?:[.-]|$))/.test(name)) audit.reason='MODEL_SAMPLING_UNSUPPORTED';
  } else if(provider==='anthropic') {
    supported=/^claude-(?:(?:sonnet|opus)-4-[56]|haiku-4-5)(?:-\d{8})?$/.test(name);
    if(!supported&&/^claude-(?:(?:opus|sonnet)-4-[78]|(?:opus|sonnet|haiku)-5|mythos)(?:-|$)/.test(name))audit.reason='MODEL_SAMPLING_UNSUPPORTED';
  } else if(provider==='deepseek') {
    supported=thinkingDisabled&&/^(?:deepseek-chat|deepseek-v4-(?:flash|pro))$/.test(name);
    if(!thinkingDisabled||name==='deepseek-reasoner')audit.reason='THINKING_SAMPLING_UNSUPPORTED';
  }
  if(supported){
    parameters.temperature=Number((.15+variance/200).toFixed(6));
    Object.assign(audit,{mode:'variance',reason:null,temperature:parameters.temperature});
  }
  return {parameters,audit};
}
module.exports={samplingFor,deepseekNonThinking};
