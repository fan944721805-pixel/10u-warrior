const {profiles,emotionAdjustment}=require('./public/strategy-catalog');
const MINIMUM=.1,VERSION='SC-2';
const defaults=Object.freeze({maxStakePct:100,exposurePct:100,stopLossPct:null,allowAllIn:false});
const money=value=>Math.floor((value+1e-10)*100)/100;
function normalizeLimits(value=defaults){
 const fail=()=>{throw Object.assign(Error('INVALID_CARD_CAPITAL_LIMITS'),{code:'INVALID_CARD_CAPITAL_LIMITS',statusCode:422});};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(defaults,k)))fail();
 const result={...defaults,...value};
 for(const k of ['maxStakePct','exposurePct'])if(!Number.isInteger(result[k])||result[k]<1||result[k]>100)fail();
 if(result.stopLossPct!==null&&(!Number.isInteger(result.stopLossPct)||result.stopLossPct<1||result.stopLossPct>99))fail();
 if(typeof result.allowAllIn!=='boolean')fail();return result;
}
function context(policy,account){
 const limits=normalizeLimits(policy.capitalLimits),balance=account.balance,open=account.openStake||0;
 const initial=account.baseInitialBalance??account.initialBalance,added=account.addedCapital||0,equity=balance+open;
 if(![balance,open,initial,added].every(Number.isFinite)||balance<0||open<0||initial<=0||added<0)throw Object.assign(Error('INVALID_CARD_ACCOUNT'),{code:'INVALID_CARD_ACCOUNT'});
 const stopAt=limits.stopLossPct===null?null:initial*(1-limits.stopLossPct/100),netEquity=equity-added;
 const stopped=Boolean(account.capitalStopped)||(stopAt!==null&&netEquity<=stopAt+1e-8);
 const capacity=money(Math.max(0,equity*limits.exposurePct/100-open));
 return {version:VERSION,recoveryActive:false,stakeMultiplier:1,mode:stopped?'STOP_LOSS':'NORMAL',stopped,
   minimumStake:MINIMUM,netEquity,stopAt,exposure:open,exposureCapacity:capacity,
   maxStake:stopped?0:money(Math.min(balance*policy.maxStakePct/100,capacity)),limits};
}
function accountFromInput(input){return {balance:input.account.balance,initialBalance:input.account.initial_balance,
 baseInitialBalance:input.account.base_initial_balance,addedCapital:input.account.added_capital,openStake:input.account.open_stake,capitalStopped:input.account.capital_stopped};}
function fromInput(input){return context({capitalLimits:input.policy.capital_limits,maxStakePct:input.policy.max_stake_pct},accountFromInput(input));}
function normalPct(input,confidence){
 const p=input.policy,profile=profiles[p.strategy],capital=fromInput(input);if(capital.stopped||p.trait_effects?.paused)return 0;
 const cap=Math.min(p.max_stake_pct,profile.normalMaxStakePct),tiers=profile.fixedStakeChoices?[50]:profile.stakeTiers;
 const index=confidence>=profile.tierConfidence[1]?2:confidence>=profile.tierConfidence[0]?1:0;
 const emotion=emotionAdjustment({strategy:p.strategy,actionUrge:p.action_urge,emotionSensitivity:p.emotion_sensitivity,
   cardEmotion:true,battleEmotion:p.battle_emotion,winStreak:input.account.win_streak,lossStreak:input.account.loss_streak});
 const effects=p.trait_effects||{},shrink=effects.stakeMultiplier??1;
 const multiplier=emotion.stakeMultiplier<1?Math.min(emotion.stakeMultiplier,shrink):emotion.stakeMultiplier*shrink;
 const baseIndex=effects.nextTier?Math.min(index+1,tiers.length-1):index;
 const target=profile.fixedStakeChoices?50:(tiers[baseIndex]+(effects.stakeBonus||0))*multiplier*(p.strategy==='contrarian'?p.countertrade_stake_multiplier||1:1);
 const allowed=tiers.filter(pct=>pct<=cap&&pct<=target+1e-8&&money(input.account.balance*pct/100)<=capital.maxStake);
 return allowed.length?Math.max(...allowed):0;
}
function probePct(input){
 const profile=profiles[input.policy.strategy];
 // Weak evidence may use the lowest legal personality tier, never a fabricated
 // amount raised to the minimum. Liang Xi still requires the 50% tier.
 const low=profile.fixedStakeChoices?50:profile.stakeTiers[0];
 return Math.min(low,normalPct(input,0));
}
function assertStake(input,raw,confidence){
 const c=fromInput(input),profile=profiles[input.policy.strategy],amount=raw.stake_usdt;
 const fail=code=>{throw Object.assign(Error(code),{code,statusCode:422});};
 if(c.stopped)fail('CARD_STOP_LOSS');
 if(input.policy.trait_effects?.paused)fail('CARD_TRAIT_COOLDOWN');
 if(amount<MINIMUM)fail('AI_STAKE_BELOW_MINIMUM');
 if(amount>c.maxStake+1e-8)fail('AI_STAKE_OVER_CAP');
 if(raw.risk_mode!=='ALL_IN'){
   const tiers=profile.fixedStakeChoices?[50]:profile.stakeTiers;
   const cap=normalPct(input,confidence);
   if(!tiers.some(pct=>pct<=cap&&Math.abs(money(input.account.balance*pct/100)-amount)<1e-8))fail('CARD_STAKE_TIER_INVALID');
 }
}
module.exports={VERSION,MINIMUM,defaults,normalizeLimits,money,context,fromInput,normalPct,probePct,assertStake};
