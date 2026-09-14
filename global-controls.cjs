// Runtime controls are independent of translated UI text and card base stats.
const DEFAULTS = Object.freeze({urge:0,tilt:0,gain:100,cooling:'normal',variance:0});
const clamp = value => Math.max(0,Math.min(100,value));
const fail = code => Object.assign(Error(code),{code,statusCode:400});
function normalize(value) {
  if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(key=>!Object.hasOwn(DEFAULTS,key))) throw fail('INVALID_GLOBAL_CONTROLS');
  for(const key of ['urge','tilt','gain','variance']) if(!Number.isInteger(value[key]) || value[key]<0 || value[key]>(key==='gain'?200:100)) throw fail('INVALID_GLOBAL_CONTROLS');
  if(!['slow','normal','fast'].includes(value.cooling)) throw fail('INVALID_GLOBAL_CONTROLS');
  return Object.fromEntries(Object.keys(DEFAULTS).map(key=>[key,value[key]]));
}
function fromConfig(config) {
  return normalize(config.globalControls ?? {...DEFAULTS,urge:config.actionUrgeLevel??0,tilt:config.emotionLevel??0});
}
function effective(personal,global) {return clamp(personal)+(100-clamp(personal))*clamp(global)/100;}
function restoreEmotion(value,completedRounds=[]) {
  if(value==null)return {tilt:0,lastCooledRound:completedRounds.length?Math.max(...completedRounds):null};
  if(!Number.isFinite(value.tilt)||value.tilt<0||value.tilt>100||(value.lastCooledRound!==null&&!Number.isFinite(value.lastCooledRound)))throw fail('INVALID_SIM_LEDGER');
  return {tilt:value.tilt,lastCooledRound:value.lastCooledRound};
}
// Called only when an OPEN order changes to its final settlement state.
function settleEmotion(state,status,sensitivity,controls) {
  const increment=({WON:8,LOST:12}[status]||0)*clamp(sensitivity)/100*controls.gain/100;
  state.tilt=clamp(state.tilt+increment);
}
function coolEmotion(state,completedRounds,controls) {
  const fresh=completedRounds.filter(slot=>state.lastCooledRound===null||slot>state.lastCooledRound);
  if(!fresh.length)return false;
  state.tilt=clamp(state.tilt-fresh.length*({slow:3,normal:6,fast:12}[controls.cooling]));
  state.lastCooledRound=Math.max(...fresh);return true;
}
module.exports={DEFAULTS,normalize,fromConfig,effective,restoreEmotion,settleEmotion,coolEmotion};
