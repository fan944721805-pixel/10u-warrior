const crypto = require('node:crypto');
const DECISION_META = Symbol('trusted-decision-metadata');
const { alignRoundDirection } = require('./round-direction');

const {
  MIN_STAKE,
  capitalManagement,
  indicators: indicatorCatalog,
  profiles: PROFILE_RULES,
  defaultIndicators: DEFAULT_INDICATORS,
  effectiveActionUrge,
  longHorizonContext,
  evaluateCoreStrategy, evaluateCharacter, eligibleCountertradePeers,
  evaluatePriceAction,
  divinationStrategies, evaluateDivination, formatDivination,
  confidenceForScore,
  personalityNudge,
  emotionAdjustment,
  normalStakePercent,
  probeStakePercent,
  allInRequirements,
  strongCoreConsensus,
  buildDecisionPrompt,
} = require('./public/strategy-catalog');
const INDICATORS = Object.keys(indicatorCatalog);
const DEFAULT_AGENT_POLICIES = {
  A: { id: 'A', name: '狐火术师', provider: 'claude', coin: 'BTC', strategy: 'aggressive', decisionVariance: 82, actionUrge: 85, emotionSensitivity: 90, maxStakePct: 100, allowAllIn: true, indicators: PROFILE_RULES.aggressive.recommended },
  B: { id: 'B', name: '星环机甲', provider: 'gpt', coin: 'BTC', strategy: 'smart', decisionVariance: 45, actionUrge: 60, emotionSensitivity: 15, maxStakePct: 100, allowAllIn: true, indicators: PROFILE_RULES.smart.recommended },
  C: { id: 'C', name: '深海灵兽', provider: 'deepseek', coin: 'BTC', strategy: 'conservative', decisionVariance: 18, actionUrge: 35, emotionSensitivity: 60, maxStakePct: 10, allowAllIn: false, indicators: PROFILE_RULES.conservative.recommended },
};

function decisionError(code, statusCode = 422) {
  return Object.assign(new Error(code), { code, statusCode });
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function normalizePolicy(value, id) {
  const fallback = DEFAULT_AGENT_POLICIES[id] || {
    id,
    name: `AI ${id}`,
    provider: 'gpt',
    coin: 'BTC',
    strategy: 'smart',
    decisionVariance: 45,
    actionUrge: 60,
    emotionSensitivity: 15,
    maxStakePct: 100,
    allowAllIn: true,
    indicators: PROFILE_RULES.smart.recommended,
  };
  const strategy = Object.hasOwn(PROFILE_RULES, value?.strategy) ? value.strategy : fallback.strategy;
  const rules = PROFILE_RULES[strategy];
  const savedIndicators = Array.isArray(value?.indicators) ? [...new Set(value.indicators.filter(key => INDICATORS.includes(key)))] : null;
  const legacyCoreDefaults = ['aggressive','smart','conservative'].includes(strategy) && savedIndicators?.length === DEFAULT_INDICATORS.length && DEFAULT_INDICATORS.every(key => savedIndicators.includes(key));
  const requestedIndicators = !savedIndicators || legacyCoreDefaults ? rules.recommended : savedIndicators;
  const indicators = [...new Set([...(requestedIndicators.length >= 3 ? requestedIndicators : rules.recommended), ...rules.required])];
  const configuredCap = boundedInteger(value?.maxStakePct, fallback.maxStakePct, 5, 100);
  const maxStakePct = rules.fixedStakeChoices ? 100 : Math.min(configuredCap, rules.maxStakePct);
  const requestedCoin = String(value?.coin || fallback.coin || 'BTC').toUpperCase();
  if (value?.aiConnectionId !== undefined && !['none','deepseek','openai','anthropic','custom'].includes(value.aiConnectionId)) throw decisionError('AI_CONNECTION_NOT_TESTED');
  return {
    id,
    ...(value?.sourceAgentId ? {sourceAgentId:String(value.sourceAgentId).slice(0,60),aiModelLabel:String(value.aiModelLabel||'').slice(0,160)} : {}),
    ...(value?.aiConnectionId !== undefined ? {aiConnectionId:value.aiConnectionId,aiConnectionRevision:typeof value.aiConnectionRevision==='string'?value.aiConnectionRevision:null} : {}),
    name: String(value?.name || fallback.name).trim().slice(0, 18) || fallback.name,
    provider: ['claude', 'gpt', 'deepseek'].includes(value?.provider) ? value.provider : fallback.provider,
    skinId: typeof value?.skinId === 'string' ? value.skinId : 'anime-female',
    coin: ['BTC', 'ETH', 'BNB'].includes(requestedCoin) ? requestedCoin : 'BTC',
    strategy,
    decisionVariance: boundedInteger(value?.decisionVariance, rules.variance, 0, 100),
    actionUrge: boundedInteger(value?.actionUrge, rules.actionUrge, 0, 100),
    emotionSensitivity: boundedInteger(value?.emotionSensitivity, rules.emotionSensitivity, 0, 100),
    maxStakePct,
    allowAllIn: rules.allowAllIn && maxStakePct === 100 && (rules.fixedStakeChoices || value?.allowAllIn !== false) ? true : false,
    indicators,
    minConfidence: rules.minConfidence,
    baseStakePct: rules.baseStakePct,
    allInConfidence: rules.allInConfidence,
  };
}

function normalizeAgentPolicies(value) {
  const list = Array.isArray(value?.agents) ? value.agents : Array.isArray(value) ? value : [];
  return Object.fromEntries(['A', 'B', 'C'].map((id, index) => [id, normalizePolicy(list.find(item => item?.id === id) || list[index], id)]));
}

function selectedIndicators(snapshot, selected = INDICATORS) {
  const result = {};
  for (const key of selected) {
    const definition = indicatorCatalog[key];
    if (!definition) throw decisionError('AI_INDICATOR_MISSING');
    result[definition.field] = completeIndicator(snapshot[definition.snapshotKey]) ? snapshot[definition.snapshotKey] : null;
  }
  return result;
}

function completeIndicator(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0 && value.every(completeIndicator);
  return value !== null && typeof value === 'object' && Object.keys(value).length > 0 && Object.values(value).every(completeIndicator);
}

function assertDecisionInputs(input) {
  if (Object.values(input.indicators).some(value=>!completeIndicator(value)) ||
      (input.policy.required_indicators || []).some(field=>!completeIndicator(input.indicators[field]))) throw decisionError('AI_INDICATOR_MISSING');
}

function buildDecisionContext({ market, indicators, account, policy, battleEmotion = 0, battleActionUrge = 0, peers = null, frozenDivination = null }) {
  const capital=capitalManagement({strategy:policy.strategy,...account,recoveryActive:account.capitalRecovery});
  const personalActionUrge=policy.actionUrge;
  const actionUrge=effectiveActionUrge(personalActionUrge,battleActionUrge);
  const emotion=emotionAdjustment({strategy:policy.strategy,actionUrge,emotionSensitivity:policy.emotionSensitivity,battleEmotion,winStreak:account.winStreak,lossStreak:account.lossStreak});
  const countertrade=eligibleCountertradePeers(policy.strategy,actionUrge,{agentId:policy.id,roundId:market.roundId,asset:`${policy.coin}USDT`,peers});
  return {
    ...(peers ? {peers:structuredClone(policy.strategy==='contrarian'?peers:{...peers,agents:peers.agents.map(({performance,...peer})=>peer)})} : {}),
    market: {
      asset: `${policy.coin}USDT`,
      round_id: String(market.roundId),
      timeframe: String(market.timeframe || '5m'),
      round_duration_seconds: Number(market.roundDurationSeconds || 300),
      seconds_to_close: Number(market.secondsToClose),
      up_odds: Number(market.upOdds),
      down_odds: Number(market.downOdds),
      data_timestamp: Number(market.dataTimestamp),
      ...(market.roundContext ? { round_context: structuredClone(market.roundContext) } : {}),
    },
    indicators: selectedIndicators({ ...indicators, marketOdds: { up: market.upOdds, down: market.downOdds } }, policy.indicators),
    ...(divinationStrategies.includes(policy.strategy) ? { divination: evaluateDivination(policy.strategy, { ...indicators, marketOdds:{up:market.upOdds,down:market.downOdds} }, {roundId:market.roundId,asset:`${policy.coin}USDT`,frozenReading:frozenDivination,actionUrge}).divination } : {}),
    account: {
      balance: Number(account.balance),
      initial_balance: Number(account.initialBalance ?? 100),
      capital_recovery: capital.recoveryActive,
      wins: Number(account.wins),
      losses: Number(account.losses),
      win_streak: Number(account.winStreak),
      loss_streak: Number(account.lossStreak),
      open_stake: Number(account.openStake),
    },
    policy: {
      agent_id: policy.id,
      ...(policy.aiConnectionId !== undefined ? {ai_connection_id:policy.aiConnectionId,ai_connection_revision:policy.aiConnectionRevision} : {}),
      strategy: policy.strategy,
      decision_variance: policy.decisionVariance,
      action_urge: actionUrge,
      personal_action_urge: personalActionUrge,
      battle_action_urge: Math.max(0,Math.min(100,Math.round(Number(battleActionUrge)||0))),
      emotion_sensitivity: policy.emotionSensitivity,
      emotion_state: emotion.state,
      emotion_streak: emotion.streak,
      battle_emotion: emotion.battleEmotion,
      risk_appetite: emotion.battleEmotion >= 70 ? 'HIGH' : 'STANDARD',
      personality_stake_multiplier: Number(emotion.personalityStakeMultiplier.toFixed(4)),
      shared_tilt_multiplier: Number(emotion.globalStakeMultiplier.toFixed(4)),
      emotion_stake_multiplier: Number(emotion.stakeMultiplier.toFixed(4)),
      effective_minimum_confidence: Number(emotion.minimumConfidence.toFixed(2)),
      max_stake_pct: capital.recoveryActive?100:policy.maxStakePct,
      capital_management: capital,
      min_stake_usdt: capital.recoveryActive?.01:MIN_STAKE,
      countertrade_stake_multiplier: policy.strategy==='contrarian'?countertrade.stakeMultiplier:1,
      allow_all_in: capital.recoveryActive||policy.allowAllIn,
      minimum_confidence: policy.minConfidence,
      base_stake_pct: policy.baseStakePct,
      all_in_confidence: allInRequirements({strategy:policy.strategy,battleEmotion}).confidence,
      all_in_requirements: allInRequirements({strategy:policy.strategy,battleEmotion}),
      strategy_rule: PROFILE_RULES[policy.strategy].enDescription,
      required_indicators: PROFILE_RULES[policy.strategy].required.map(key=>indicatorCatalog[key].field),
    },
  };
}

function countertradeForInput(input) {
  return eligibleCountertradePeers(input.policy.strategy,input.policy.action_urge,{agentId:input.policy.agent_id,roundId:input.market.round_id,asset:input.market.asset,peers:input.peers});
}
function capitalForInput(input) {
  return capitalManagement({strategy:input.policy.strategy,balance:input.account.balance,initialBalance:input.account.initial_balance,
    openStake:input.account.open_stake||0,recoveryActive:input.account.capital_recovery});
}
function countertradeMultiplier(input) {
  return input.policy.strategy==='contrarian'?countertradeForInput(input).stakeMultiplier:1;
}
function decisionStakeChoices(input) {
  const profile=PROFILE_RULES[input.policy.strategy],emotion=emotionForInput(input);
  const amountFor=pct=>{
    const amount=Math.floor(input.account.balance*pct+1e-8)/100;
    return {stake_usdt:amount,stake_pct:Number((amount/input.account.balance*100).toFixed(6))};
  };
  if(capitalForInput(input).recoveryActive) return {normal:[],probe:null,all_in:input.account.balance>=.01?{
    ...amountFor(100),risk_mode:'ALL_IN',requires:{strategyPermission:true,minimumConfidence:emotion.minimumConfidence,positiveEdge:true}}:null};
  const normal=[0,...profile.tierConfidence].map((minimum,index)=>{
    const maximum=profile.tierConfidence[index]===undefined?100:profile.tierConfidence[index]-.000001;
    const pct=normalStakePercent({countertradeMultiplier:countertradeMultiplier(input),balance:input.account.balance,initialBalance:input.account.initial_balance,openStake:input.account.open_stake||0,recoveryActive:input.account.capital_recovery,strategy:input.policy.strategy,baseStakePct:input.policy.base_stake_pct,maxStakePct:input.policy.max_stake_pct,confidence:minimum,winStreak:input.account.win_streak,lossStreak:input.account.loss_streak,emotionSensitivity:input.policy.emotion_sensitivity,battleEmotion:input.policy.battle_emotion});
    return {minimum_confidence:Math.max(minimum,emotion.minimumConfidence),maximum_confidence:maximum,...amountFor(pct),risk_mode:countertradeMultiplier(input)>1?'ADD_ON':'NORMAL'};
  }).filter(row=>row.stake_usdt>=MIN_STAKE&&row.minimum_confidence<=row.maximum_confidence);
  const permission=['UP','DOWN'].map(direction=>betPermission(input,direction)).find(p=>p.probe);
  const probe=permission?{...amountFor(permission.maxProbePct),risk_mode:'NORMAL'}:null;
  return {normal,probe:probe?.stake_usdt>=MIN_STAKE?probe:null,...(input.account.balance>=MIN_STAKE&&input.policy.allow_all_in&&input.policy.max_stake_pct===100?{all_in:{...amountFor(100),risk_mode:'ALL_IN',requires:{...allInRequirements({strategy:input.policy.strategy,battleEmotion:input.policy.battle_emotion}),strongConsensus:true}}}:{})};
}

function decisionFacts(input) {
  const permissions=Object.fromEntries(['UP','DOWN'].map(direction=>[direction,betPermission(input,direction)]));
  const odds={UP:input.market.up_odds,DOWN:input.market.down_odds};
  const facts={permissions,break_even_confidence_pct:Object.fromEntries(Object.entries(odds).map(([side,value])=>[side,100/value])),minimum_confidence:emotionForInput(input).minimumConfidence};
  facts.all_in={...allInRequirements({strategy:input.policy.strategy,battleEmotion:input.policy.battle_emotion}),enabled:input.policy.allow_all_in&&input.policy.max_stake_pct===100,strong_consensus:Object.fromEntries(['UP','DOWN'].map(side=>[side,strongCoreConsensus(coreSnapshot(input),side,input.policy.strategy)]))};
  if(capitalForInput(input).recoveryActive)facts.all_in={enabled:true,recovery:true,strategy_permission_required:true,minimum_confidence:facts.minimum_confidence,positive_edge_required:true};
  if(['contrarian','showoff'].includes(input.policy.strategy)) {
    const peers=countertradeForInput(input);
    facts.countertrade={required_loss_streak:peers.requiredLosses,eligible_count:peers.targets.length,
      mode:peers.mode,eligible_targets:peers.targets.map(a=>({id:a.id,name:a.name,loss_streak:a.lossStreak,direction:a.order.direction,stake:a.order.amount,performance:a.performance,loss_assessment:a.lossAssessment,vote_weight:a.voteWeight})),
      up_stake:peers.upStake,down_stake:peers.downStake,weighted_up:peers.up,weighted_down:peers.down,
      losing_count:peers.losingCount,loss_breadth:peers.lossBreadth,direction_agreement:peers.agreement,losing_direction_agreement:peers.losingAgreement,stake_multiplier:peers.stakeMultiplier,
      fade_direction:Math.abs(peers.up-peers.down)<1e-8?null:peers.up>peers.down?'DOWN':'UP'};
  }
  return facts;
}

function decisionPrompt(input = {}) {
  const prompt = buildDecisionPrompt({
    asset: input.market?.asset,
    timeframe: input.market?.timeframe,
    strategy: input.policy?.strategy,
    decision_variance: input.policy?.decision_variance,
    action_urge: input.policy?.action_urge,
    personal_action_urge: input.policy?.personal_action_urge,
    battle_action_urge: input.policy?.battle_action_urge,
    emotion_sensitivity: input.policy?.emotion_sensitivity,
    emotion_state: input.policy?.emotion_state,
    emotion_streak: input.policy?.emotion_streak,
    battle_emotion: input.policy?.battle_emotion,
    emotion_stake_multiplier: input.policy?.emotion_stake_multiplier,
    effective_minimum_confidence: input.policy?.effective_minimum_confidence,
    max_stake_pct: input.policy?.max_stake_pct,
    allow_all_in: input.policy?.allow_all_in,
    capital_recovery: capitalForInput(input).recoveryActive,
    indicatorFields: Object.keys(input.indicators || {}),
  });
  const target = '\nPredict settlement relative to the ORIGINAL round opening price, not merely the next price move. market.round_context, when present, contains opening/current price, distance and closed-candle noise; spot-proxy prices are NOT the official oracle. A small rebound can still settle DOWN, and a pullback can still settle UP. Never invent an unavailable opening price. The shared local direction check aligns technical strategy signals to this target; fixed-side characters and frozen oracle contracts remain unchanged.';
  const signal = input.market?.round_context ? strategySignal(input) : null;
  const correction = signal?.directionCorrection ? `\nLocal settlement-target correction: ${JSON.stringify(signal.directionCorrection)}. Any BET must use the corrected direction; keep the same stake ladder, confidence requirements and positive-edge gate. Do not increase confidence merely to make the corrected side affordable.` : '';
  const advice = input.policy?.review_mode === 'model' ? `\nThis is an independent model review, not proof of an entry signal. Read the market and choose BET or SKIP. Local execution permissions for this exact input: ${JSON.stringify(Object.fromEntries(['UP','DOWN'].map(direction=>[direction,betPermission(input,direction)])))}. A probe uses the supplied maxProbePct, which follows this personality’s tilt curve rather than a shared fixed percentage; the minimum is ${MIN_STAKE} USDT, including probes. Use only the supplied maxProbePct, while obeying configured and personality hard caps. If no legal amount reaches the minimum, SKIP. Never use ADD_ON or ALL_IN for a probe. Explain why you choose to act or wait. Do not increase confidence merely to pass the edge gate.` : '';
  const capitalNote=`\nCapital sizing: ${JSON.stringify(capitalForInput(input))}. RECOVERY_ALL_IN is the shared exception to normal, probe and personality amount caps: any permitted BET must use the all_in choice until recovery ends. It does not override direction, freshness, minimum confidence, positive edge. Recovery-only paper bets may use the full sub-5 USDT balance down to 0.01 USDT; ordinary bets retain the 5 USDT minimum. PROFIT_PROTECTION reduces the usual percentage for cautious strategies; the exact stake choices already include that reduction.`;
  const amounts=`\nExact stake choices for the current balance ${input.account.balance} USDT: ${JSON.stringify(decisionStakeChoices(input))}. After choosing an honest confidence, copy BOTH stake_usdt and stake_pct from the eligible normal confidence band, the probe row when execution permissions require a probe, or the all_in row when ALL_IN is enabled and every supplied ALL_IN condition is met. If no eligible amount exists, SKIP. Never assume 10 USDT means 10 percent. Money has at most two decimal places; percentages must describe the actual rounded amount. ALL_IN still needs every stated condition.`;
  const facts=`\nProgram-verified decision facts: ${JSON.stringify(decisionFacts(input))}. These facts are authoritative. A permitted side is an option, never an obligation. Confidence must be strictly ABOVE that side's break_even_confidence_pct as well as at least minimum_confidence. For example, confidence 62 and odds 1.0417 means negative edge, not a thin positive edge. Do not raise confidence to qualify.\nFor BET return skip_reason_code=null. For SKIP return exactly one of: STRATEGY_BLOCKED only if BOTH directions are forbidden; NO_ELIGIBLE_PEERS only for countertraders with eligible_count=0; ORACLE_WAIT only if input.divination.verdict=WAIT; otherwise MODEL_UNCERTAIN for your discretionary judgement (including insufficient confidence or edge). Never call an eligible target ineligible. Free-text reason is model commentary; the program checks the reason code against these facts.`;
  const extra = target + correction + advice + facts + amounts + capitalNote + (input.market?.entry_mode === 'signal' ? '\nThis is a mid-round review. Use seconds_to_close for the original round; a new full round does not start now.' : '');
  return prompt.replace('Return exactly one JSON object', `${extra}\nReturn exactly one JSON object`);
}

function skip(roundId, reason, engine = 'mock') {
  return { round_id: String(roundId), action: 'SKIP', direction: null, stake_usdt: 0, stake_pct: 0,
    confidence: 0, risk_mode: 'WAIT', skip_reason_code:'MODEL_UNCERTAIN', factors: [], reason, data_fresh: true, warnings: [], engine };
}

function signalScore(input) {
  const i = input.indicators;
  const factors = [];
  let score = 0;
  const add = (name, value, weight) => {
    score += weight;
    factors.push({ name, value: String(value), impact: weight > 0 ? 'UP' : weight < 0 ? 'DOWN' : 'NEUTRAL' });
  };
  if (i.price_change_pct) {
    add('price_1m', i.price_change_pct.oneMinute.toFixed(4), Math.sign(i.price_change_pct.oneMinute) * 1.2);
    add('price_5m', i.price_change_pct.fiveMinutes.toFixed(4), Math.sign(i.price_change_pct.fiveMinutes) * 1.8);
  }
  if (Number.isFinite(i.rsi_14)) add('rsi_14', i.rsi_14.toFixed(2), i.rsi_14 > 54 ? 1 : i.rsi_14 < 46 ? -1 : 0);
  if (i.ema_5_20) add('ema_5_20', `${i.ema_5_20.ema5.toFixed(2)}/${i.ema_5_20.ema20.toFixed(2)}`, Math.sign(i.ema_5_20.ema5 - i.ema_5_20.ema20) * 1.6);
  if (Number.isFinite(i.spot_order_book_imbalance)) add('spot_book', i.spot_order_book_imbalance.toFixed(4), Math.abs(i.spot_order_book_imbalance) < 0.03 ? 0 : Math.sign(i.spot_order_book_imbalance) * 1.4);
  if (Number.isFinite(i.volume_ratio)) {
    const multiplier = Math.max(0.75, Math.min(1.35, i.volume_ratio));
    score *= multiplier;
    factors.push({ name: 'volume_ratio', value: i.volume_ratio.toFixed(3), impact: 'NEUTRAL' });
  }
  return { score, factors };
}

function coreSnapshot(input) {
  const i=input.indicators;
  return {
    priceChangePct:i.price_change_pct,
    rsi14:i.rsi_14,
    ema:i.ema_5_20,
    volumeRatio:i.volume_ratio,
    spotOrderBookImbalance:i.spot_order_book_imbalance,
    macd:i.macd_12_26_9,
    bollinger:i.bollinger_20,
    atr:i.atr_14,
    adx:i.adx_dmi_14,
    roc:i.roc_10_20,
    momentum:i.momentum_10,
    volatility:i.realized_volatility_20,
    takerFlow:i.taker_flow_5,
    spread:i.spread_microprice,
    longReturns:i.returns_15_60,
    marketOdds:i.market_odds,
  };
}

function emotionForInput(input) {
  return emotionAdjustment({strategy:input.policy.strategy,actionUrge:input.policy.action_urge,emotionSensitivity:input.policy.emotion_sensitivity,battleEmotion:input.policy.battle_emotion,winStreak:input.account.win_streak,lossStreak:input.account.loss_streak});
}

function emotionFactor(emotion) {
  return {name:'emotion',value:`${emotion.state}:${emotion.streak}; own=${emotion.sensitivity}; arena=${emotion.battleEmotion}; stake=x${emotion.stakeMultiplier.toFixed(3)}; min_confidence=${emotion.minimumConfidence.toFixed(2)}`,impact:'NEUTRAL'};
}

function emotionSuffix(emotion) {
  if(emotion.state==='neutral'||emotion.sensitivity===0)return '';
  if(emotion.state==='win')return emotion.stakeMultiplier>1.001?'；连胜情绪加码':'；连胜后仍保持冷静';
  return emotion.stakeMultiplier>1.001?'；连败后更想翻本':'；连败情绪缩注';
}

function createMockDecisionProvider() {
  return {
    describe: () => ({ mode: 'mock', provider: 'Local deterministic model', model: 'offline-v2', configured: true, simulated: true }),
    async decide(input) {
      assertDecisionInputs(input);
      const signal = strategySignal(input) || signalScore(input);
      const oracle = signal.divination;
      const oracleResult = verdict => oracle ? { divination:{seed:oracle.seed,reading:formatDivination(oracle),verdict}, warnings:['ENTERTAINMENT_ONLY'] } : {};
      const { score } = signal,emotion=emotionForInput(input),factors=[...signal.factors,emotionFactor(emotion)];
      const direction = score >= 0 ? 'UP' : 'DOWN';
      const odds = direction === 'UP' ? input.market.up_odds : input.market.down_odds;
      const baseConfidence = confidenceForScore(score,input.policy.decision_variance,input.policy.strategy);
      const nudge = personalityNudge({strategy:input.policy.strategy,agentId:input.policy.agent_id,roundId:input.market.round_id,variance:input.policy.decision_variance,confidence:baseConfidence,minimumConfidence:emotion.minimumConfidence});
      const confidence = Math.max(50,Math.min(97,baseConfidence+nudge));
      factors.push({name:'personality_nudge',value:nudge.toFixed(3),impact:'NEUTRAL'});
      const edge = confidence / 100 * odds - 1;
      if (Math.abs(score) < entryThreshold(input) || confidence < emotion.minimumConfidence || edge <= 0) {
        return { ...skip(input.market.round_id, oracle ? `${formatDivination(oracle)}；本地模拟，本轮观望` : '没有通过本地验证的正期望'), confidence: Math.round(confidence), factors, ...oracleResult('WAIT') };
      }
      let stakePct = normalStakePercent({countertradeMultiplier:countertradeMultiplier(input),balance:input.account.balance,initialBalance:input.account.initial_balance,openStake:input.account.open_stake||0,recoveryActive:input.account.capital_recovery,strategy:input.policy.strategy,baseStakePct:input.policy.base_stake_pct,maxStakePct:input.policy.max_stake_pct,confidence,edge,winStreak:input.account.win_streak,lossStreak:input.account.loss_streak,emotionSensitivity:input.policy.emotion_sensitivity,battleEmotion:input.policy.battle_emotion});
      let riskMode = input.policy.strategy!=='liangXi'&&(countertradeMultiplier(input)>1||emotion.streak&&emotion.stakeMultiplier>1.001)?'ADD_ON':'NORMAL';
      const permission=betPermission(input,direction);
      const allInRules=allInRequirements({strategy:input.policy.strategy,battleEmotion:input.policy.battle_emotion});
      const allIn = !permission.probe && input.policy.allow_all_in && input.policy.max_stake_pct === 100 && confidence >= allInRules.confidence && edge >= allInRules.minimumEdge && strongCoreConsensus(coreSnapshot(input),direction,input.policy.strategy) &&
        input.account.loss_streak >= allInRules.requiredLossStreak;
      if (allIn || capitalForInput(input).recoveryActive) { stakePct = 100; riskMode = 'ALL_IN'; }
      if (permission.probe) { stakePct=Math.min(Math.max(stakePct,MIN_STAKE*100/input.account.balance),permission.maxProbePct); riskMode='NORMAL'; }
      stakePct = Math.min(stakePct, capitalForInput(input).recoveryActive?100:input.policy.max_stake_pct);
      const stake = Math.floor(input.account.balance * stakePct + 1e-8) / 100;
      if (stake < (capitalForInput(input).recoveryActive?.01:MIN_STAKE)) return {...skip(input.market.round_id, '金额低于本地最小值'), ...oracleResult('WAIT')};
      return {
        round_id: input.market.round_id,
        action: 'BET',
        direction,
        stake_usdt: stake,
        stake_pct: stake / input.account.balance * 100,
        confidence: Math.round(confidence),
        risk_mode: riskMode,
        factors,
        reason: (signal.directionCorrection ? '结合本轮开盘位置与剩余时间，修正结算方向' : oracle ? `${formatDivination(oracle)}；卦牌与指标同向，小注试势` : input.policy.strategy==='smart'
          ? `先判断${signal.regime==='trend'?'趋势局':'震荡局'}，再按优势调整金额`
          : input.policy.strategy==='conservative'
            ? '波动和价差安全，趋势与盘口全部同向，只押小注'
            : input.policy.strategy==='aggressive'
              ? '短线、动量和主动买卖同向'
              : input.policy.strategy==='priceAction'
                ? '吞没、影线、连阳连阴或前高前低突破形成同向裸K信号'
              : input.policy.strategy==='contrarian'
                ? countertradeMultiplier(input)>1?'多人亏损且方向一致，反向加码':'综合对手历史亏损与本轮方向，反向下注'
              : `指标符合${PROFILE_RULES[input.policy.strategy].label}规则`)+(signal.directionCorrection ? '' : emotionSuffix(emotion)),
        data_fresh: true,
        warnings: [],
        ...oracleResult(direction),
      };
    },
  };
}

// Shared by the deterministic provider and the gate for external AI responses.
// New strategies have distinct, inspectable entry rules, not just different stakes.
function strategySignal(input) {
  return alignRoundDirection(rawStrategySignal(input), input);
}

function rawStrategySignal(input) {
  const profile = PROFILE_RULES[input.policy.strategy];
  const character=evaluateCharacter(input.policy.strategy,coreSnapshot(input),input.policy.action_urge,{asset:input.market.asset,roundId:input.market.round_id,agentId:input.policy.agent_id,peers:input.peers});
  if(character)return character;
  const oracle=evaluateDivination(input.policy.strategy,coreSnapshot(input),{roundId:input.market.round_id,asset:input.market.asset,frozenReading:input.divination,actionUrge:input.policy.action_urge});
  if(oracle)return oracle;
  const priceAction=evaluatePriceAction(input.policy.strategy,input.indicators.raw_candles,input.policy.action_urge);
  if(priceAction)return priceAction;
  const core=evaluateCoreStrategy(input.policy.strategy,coreSnapshot(input),input.policy.action_urge);
  if(core) return core;
  if (!profile?.required.length) return null;
  const i = input.indicators, factors = [];
  if (profile.required.some(key => !completeIndicator(i[indicatorCatalog[key].field]))) return {score:0,factors};
  const urge=Math.max(0,Math.min(100,Number(input.policy.action_urge??profile.actionUrge)))/100;
  const long=longHorizonContext({longReturns:i.returns_15_60});
  const direction = (value, deadband=0) => Number.isFinite(Number(value))&&Math.abs(Number(value))>deadband ? Math.sign(Number(value)) : 0;
  const tally = votes => ({up:votes.filter(v=>v>0).length,down:votes.filter(v=>v<0).length});
  const unopposedMajority = (votes,minimum) => {const {up,down}=tally(votes);return down===0&&up>=minimum?1:up===0&&down>=minimum?-1:0};
  let vote=0,score=0,regime='waiting';
  switch(input.policy.strategy) {
    case 'trendFollowing': {
      const votes=[direction(i.price_change_pct.fiveMinutes,.02),direction(i.ema_5_20.ema5-i.ema_5_20.ema20),direction(i.macd_12_26_9.histogram),direction(i.adx_dmi_14.plusDI-i.adx_dmi_14.minusDI),long.fifteen,long.sixty];
      const {up,down}=tally(votes),minimum=urge>=.5?4:5;
      if(i.adx_dmi_14.adx>=24-urge*8) vote=up>=minimum&&down<=1?1:down>=minimum&&up<=1?-1:0;
      score=vote*(Math.max(up,down)===6?6:Math.max(up,down)===5?5.2:4.6);regime=vote?'trend':'conflict';
      break;
    }
    case 'meanReversion': {
      if(i.adx_dmi_14.adx<32+urge*14) {
        const edge=.14+urge*.2,rsiLow=40+urge*6,rsiHigh=60-urge*6,stochLow=28+urge*16,stochHigh=72-urge*16,minimum=urge>=.2?2:3;
        const votes=[i.bollinger_20.percentB<=edge?1:i.bollinger_20.percentB>=1-edge?-1:0,i.rsi_14<=rsiLow?1:i.rsi_14>=rsiHigh?-1:0,i.stochastic_14_3.k<=stochLow?1:i.stochastic_14_3.k>=stochHigh?-1:0];
        const {up,down}=tally(votes);vote=up>=minimum&&down===0?1:down>=minimum&&up===0?-1:0;
        if(vote&&long.opposition(vote)>=2&&i.adx_dmi_14.adx>=35)vote=0;
        score=vote*(Math.max(up,down)===3?6:4.6);
      }
      regime=vote?'reversion':'waiting';
      break;
    }
    case 'breakout': {
      const exact=direction(i.donchian_20.breakout),close=Number(i.donchian_20.close),upper=Number(i.donchian_20.upper),lower=Number(i.donchian_20.lower),buffer=.0001+urge*.0019;
      const near=exact||(![close,upper,lower].every(Number.isFinite)?0:close>=upper*(1-buffer)?1:close<=lower*(1+buffer)?-1:0);
      const confirms=[direction(i.price_change_pct.oneMinute,.01),direction(i.taker_flow_5.buyRatio-.5,.03)],same=confirms.filter(value=>value===near).length;
      const longReady=exact?long.opposition(near)<2:long.opposition(near)<2&&long.support(near)>=1;
      if(i.volume_ratio>=1.35-urge*.35&&i.atr_14.percent<=.75+urge*.45&&near&&same>=1&&longReady) vote=near;
      score=vote*(exact?(same===2?6:5):(same===2?4.8:4.3));regime=vote?(exact?'breakout':'near-break'):'waiting';
      break;
    }
    case 'orderFlow': {
      const votes=[direction(i.taker_flow_5.buyRatio-.5,.1-urge*.07),direction(i.spot_order_book_imbalance,.12-urge*.09),direction(i.price_change_pct.oneMinute,.015-urge*.01)];
      if(i.spread_microprice.basisPoints<=4+urge*3) vote=unopposedMajority(votes,2);
      if(vote&&long.opposition(vote)>=2)vote=0;
      const {up,down}=tally(votes);score=vote*(Math.max(up,down)===3?6:4.8);regime=vote?'flow':'conflict';
      break;
    }
    case 'volatilityGuard': {
      const votes=[direction(i.ema_5_20.ema5-i.ema_5_20.ema20),direction(i.price_change_pct.fiveMinutes,.02),direction(i.spot_order_book_imbalance,.03)];
      if(i.atr_14.percent<=.3+urge*.25&&i.realized_volatility_20.perMinutePct<=.16+urge*.16) vote=unopposedMajority(votes,2);
      if(vote&&(long.support(vote)<1||long.opposition(vote)>0))vote=0;
      const {up,down}=tally(votes);score=vote*(Math.max(up,down)===3?6:5.3);regime=vote?'calm':'unsafe-or-conflict';
      break;
    }
    case 'consensus': {
      const votes=[direction(i.price_change_pct.fiveMinutes),direction(i.ema_5_20.ema5-i.ema_5_20.ema20),direction(i.macd_12_26_9.histogram),direction(i.rsi_14-50,4),direction(i.spot_order_book_imbalance,0.03),direction(i.taker_flow_5.buyRatio-0.5,0.05)];
      const {up,down}=tally(votes),minimum=urge>=.5?4:5;
      vote=up>=minimum&&down<=1?1:down>=minimum&&up<=1?-1:0;
      if(vote&&long.opposition(vote)>=2)vote=0;
      score=vote*(Math.max(up,down)===6?6:Math.max(up,down)===5?5.8:5.4);regime=vote?'consensus':'split';
      break;
    }
  }
  for(const key of profile.required.filter(key=>key!=='odds')) {
    if(key==='longReturns'){
      factors.push(
        {name:'return_15m',value:Number(i.returns_15_60.fifteenMinutes).toFixed(4),impact:long.fifteen>0?'UP':long.fifteen<0?'DOWN':'NEUTRAL'},
        {name:'return_60m',value:Number(i.returns_15_60.sixtyMinutes).toFixed(4),impact:long.sixty>0?'UP':long.sixty<0?'DOWN':'NEUTRAL'},
      );
      continue;
    }
    const field=indicatorCatalog[key].field;
    factors.push({name:field,value:JSON.stringify(i[field]).slice(0,80),impact:vote>0?'UP':vote<0?'DOWN':'NEUTRAL'});
  }
  return {score,factors,regime};
}

function createOffDecisionProvider(reason = 'AI_DECISION_DISABLED') {
  return {
    describe: () => ({ mode: 'off', provider: null, model: null, configured: false, simulated: false }),
    decide: async input => skip(input.market.round_id, reason, 'off'),
  };
}

function entryThreshold(input) { return 2.4-Math.max(0,Math.min(100,Number(input.policy.action_urge)||0))*.014; }

function betPermission(input, direction) {
  const signal=strategySignal(input), sign=direction==='UP'?1:-1;
  const matched=signal?.score && Math.sign(signal.score)===sign;
  const i=input.indicators;
  const unsafe=i.spread_microprice?.basisPoints>8 || i.atr_14?.percent>1.2 || i.realized_volatility_20?.perMinutePct>.8;
  const flexible=input.policy.review_mode==='model' && ['aggressive','smart','priceAction'].includes(input.policy.strategy);
  const weak=!matched || Math.abs(signal.score)<entryThreshold(input);
  const strongConflict=!matched && Math.abs(signal?.score||0)>=5;
  const patterns=signal?.factors?.filter(f=>['engulfing','rejection_wick','range_break','three_bar_structure','candle_run','body_drive'].includes(f.name))||[];
  const patternConflict=patterns.some(f=>f.impact==='UP')&&patterns.some(f=>f.impact==='DOWN');
  const allowed=!unsafe && (matched && !weak || flexible && input.policy.action_urge>=70 && !strongConflict && !patternConflict && !signal?.directionCorrection && !['missing','risk-off'].includes(signal?.regime));
  const probe=!capitalForInput(input).recoveryActive&&Boolean(allowed && (weak || signal?.probe || Math.abs(signal?.score||0)<3));
  return {allowed:Boolean(allowed),probe,maxProbePct:probeStakePercent({strategy:input.policy.strategy,baseStakePct:input.policy.base_stake_pct,maxStakePct:input.policy.max_stake_pct,balance:input.account.balance,initialBalance:input.account.initial_balance,openStake:input.account.open_stake||0,recoveryActive:input.account.capital_recovery,battleEmotion:input.policy.battle_emotion})};
}

function entryWaitReason(input) {
  const signal=strategySignal(input);
  const reason=signal?.factors?.find(f=>f.name==='character_gate')?.value;
  return reason==='CZ_NOT_BETTING'?'WAIT_CZ_BET':reason==='WAIT_FOR_BULL_TREND'?'WAIT_BULL_TREND':
    ['NO_LOSING_PEERS','NO_CURRENT_PEERS','PEERS_TIED'].includes(reason)?'WAIT_PEER_BET':
    signal?.regime==='oracle-wait'?'WAIT_ORACLE_SIGNAL':'WAIT_ENTRY_SIGNAL';
}

// External models review once per round even without a local entry signal.
// Subsequent reviews require a changed observation, cooldown, and a round budget.
function modelReview(input, candleCloseTime, previous, now) {
  assertDecisionInputs(input);
  if(input.policy.strategy==='showoff'&&!entrySignal(input,candleCloseTime)) return {reason:'WAIT_CZ_BET'};
  const cooldown=120000-Math.max(0,Math.min(100,input.policy.action_urge))*600;
  const limit=Math.min(12,1+Math.ceil(input.market.round_duration_seconds*1000/cooldown));
  if((previous?.count??previous?.keys?.length??0)>=limit)return {reason:'AI_REVIEW_LIMIT'};
  const retryDelay=previous?.count===0?30000:cooldown;
  if(previous&&now-previous.at<retryDelay)return {reason:'AI_REVIEW_COOLDOWN'};
  const signal=strategySignal(input);
  const peers=(input.peers?.agents||[]).filter(a=>a.order).map(a=>[a.id,a.order.id,a.lossStreak,...(input.policy.strategy==='contrarian'?[a.performance]:[])]);
  const key=JSON.stringify(['model',candleCloseTime??null,Math.round(1/input.market.up_odds*20),Math.round(1/input.market.down_odds*20),Math.sign(signal?.score||0),peers,input.policy.action_urge,input.policy.battle_emotion??0,input.policy.controls_revision??0]);
  if(previous?.keys?.includes(key))return {reason:'AI_WAIT_MARKET_CHANGE'};
  return {key};
}

// Local rules can avoid computation until a signal exists.
function entrySignal(input, candleCloseTime) {
  assertDecisionInputs(input);
  const signal = strategySignal(input) || signalScore(input);
  if (!Number.isFinite(signal.score) || Math.abs(signal.score) < entryThreshold(input)) return null;
  const direction = signal.score > 0 ? 'UP' : 'DOWN';
  const peers = ['contrarian','showoff'].includes(input.policy.strategy)
    ? (input.peers?.agents || []).filter(a => a.order).map(a => a.order.id).sort() : [];
  return { direction, key: JSON.stringify([direction, signal.regime, Math.floor(Math.abs(signal.score)),
    candleCloseTime ?? null, peers]), score: signal.score };
}

function createDeepSeekDecisionProvider({ apiKey, baseUrl = 'https://api.deepseek.com', model = 'deepseek-chat', fetchImpl = require('./ai-transport').aiFetch } = {}) {
  const secret = String(apiKey || '').trim();
  const endpoint = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  return {
    describe: () => ({ mode: 'deepseek', provider: 'DeepSeek', model, configured: Boolean(secret), simulated: false }),
    async decide(input, { deadlineMs = Infinity, now = Date.now, onRequest, isCancelled } = {}) {
      assertDecisionInputs(input);
      if (!secret) throw decisionError('AI_NOT_CONFIGURED', 503);
      const timeoutMs = Math.floor(Math.min(8000, deadlineMs - now() - 250));
      if (timeoutMs <= 0) throw decisionError('AI_DEADLINE_EXPIRED');
      if(isCancelled?.())throw decisionError('AI_CONFIGURATION_CHANGED');
      const body={model,temperature:Math.min(0.65,0.15+input.policy.decision_variance/200),max_tokens:1500,response_format:{type:'json_object'},
        messages:[{role:'system',content:decisionPrompt(input)},{role:'user',content:JSON.stringify(input)}]};
      onRequest?.({provider:'deepseek',body:structuredClone(body),responseContract:'strategy-v2'});
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch { throw decisionError('AI_REQUEST_FAILED', 503); }
      if (!response?.ok) throw decisionError('AI_REQUEST_REJECTED', 503);
      let payload;
      try { payload = await response.json(); } catch { throw decisionError('AI_RESPONSE_INVALID'); }
      if(isCancelled?.())throw decisionError('AI_CONFIGURATION_CHANGED');
      if(payload.choices?.[0]?.finish_reason==='length')throw decisionError('AI_RESPONSE_TRUNCATED');
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim().startsWith('{') || !content.trim().endsWith('}')) throw decisionError('AI_RESPONSE_INVALID');
      let raw;
      try { raw=JSON.parse(content); } catch { throw decisionError('AI_RESPONSE_INVALID'); }
      if(!raw||typeof raw!=='object'||Array.isArray(raw))throw decisionError('AI_RESPONSE_INVALID');
      Object.defineProperty(raw,DECISION_META,{value:{engine:{mode:'deepseek',provider:'DeepSeek',model,configured:true,simulated:false},responseContract:'strategy-v2'}});
      return raw;
    },
  };
}

function strongConsensus(indicators, direction, strategy) {
  return strongCoreConsensus(indicators,direction,strategy);
}

function textArray(value, maxItems = 8) {
  return Array.isArray(value) ? value.slice(0, maxItems).map(item => String(item).slice(0, 120)) : [];
}

function safeFactors(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !['UP', 'DOWN', 'NEUTRAL'].includes(item.impact)) {
      throw decisionError('AI_FACTORS_INVALID');
    }
    return { name: String(item.name || '').slice(0, 50), value: String(item.value || '').slice(0, 80), impact: item.impact };
  });
}

function validateDecision(raw, { input, indicators, policy, now = Date.now() }) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw decisionError('AI_RESPONSE_INVALID');
  if (typeof raw.round_id !== 'string' || raw.round_id !== input.market.round_id) throw decisionError('AI_ROUND_MISMATCH');
  if (['confidence', 'stake_usdt', 'stake_pct'].some(key => typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) ||
    typeof raw.reason !== 'string' || !Array.isArray(raw.factors) || !Array.isArray(raw.warnings) || raw.warnings.some(item => typeof item !== 'string')) {
    throw decisionError('AI_RESPONSE_INVALID');
  }
  if (!['BET', 'SKIP'].includes(raw.action)) throw decisionError('AI_ACTION_INVALID');
  if (!['NORMAL', 'ADD_ON', 'ALL_IN', 'WAIT'].includes(raw.risk_mode)) throw decisionError('AI_RISK_MODE_INVALID');
  const confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) throw decisionError('AI_CONFIDENCE_INVALID');
  const timestamps = [input.market.data_timestamp, indicators.dataTimestamp];
  if (raw.data_fresh !== true || timestamps.some(timestamp => !Number.isFinite(timestamp) || now - timestamp > 10000 || timestamp > now + 2000)) {
    throw decisionError('AI_DATA_STALE');
  }
  const base = {
    action: raw.action,
    confidence,
    riskMode: raw.risk_mode,
    reason: String(raw.reason || '').slice(0, 160),
    factors: safeFactors(raw.factors),
    warnings: textArray(raw.warnings),
    ...(policy.strategy==='contrarian'?{countertrade:decisionFacts(input).countertrade}:{}),
  };
  if(divinationStrategies.includes(policy.strategy)) {
    const frozen=strategySignal(input)?.divination;
    if(!frozen || !raw.divination || raw.divination.seed!==frozen.seed || typeof raw.divination.reading!=='string' || !raw.divination.reading.trim() || raw.divination.reading.length>160 || raw.divination.verdict!==(raw.action==='BET'?raw.direction:'WAIT')) throw decisionError('AI_DIVINATION_INVALID');
    base.divination={...frozen,interpretation:raw.divination.reading,finalVerdict:raw.divination.verdict};
    base.warnings=[...new Set([...base.warnings,'ENTERTAINMENT_ONLY'])];
  }
  if (raw.action === 'SKIP') {
    if (raw.direction !== null || Number(raw.stake_usdt) !== 0 || Number(raw.stake_pct) !== 0 || raw.risk_mode !== 'WAIT') throw decisionError('AI_SKIP_INVALID');
    const strict=raw[DECISION_META]?.responseContract==='strategy-v2';
    const code=raw.skip_reason_code;
    if(strict || code!=null) {
      const facts=decisionFacts(input);
      const valid={MODEL_UNCERTAIN:true,STRATEGY_BLOCKED:!facts.permissions.UP.allowed&&!facts.permissions.DOWN.allowed,
        NO_ELIGIBLE_PEERS:facts.countertrade?.eligible_count===0,ORACLE_WAIT:input.divination?.verdict==='WAIT'};
      if(!Object.hasOwn(valid,code)||!valid[code])throw decisionError('AI_REASON_CONTRADICTS_INPUT');
      base.skipReasonCode=code;
      if(strict){
        base.modelReason=base.reason;
        base.reason=({MODEL_UNCERTAIN:'模型自主观望',STRATEGY_BLOCKED:'策略条件未满足',NO_ELIGIBLE_PEERS:'没有符合条件的对手',ORACLE_WAIT:'卦牌本轮观望'})[code];
        base.verifiedFacts=facts;
      }
    }
    return { ...base, direction: null, stake: 0, stakePct: 0, expectedEdge: null };
  }
  if (!['UP', 'DOWN'].includes(raw.direction)) throw decisionError('AI_DIRECTION_INVALID');
  assertDecisionInputs(input);
  const required = PROFILE_RULES[policy.strategy].required;
  if (required.some(key=>!completeIndicator(input.indicators[indicatorCatalog[key].field]))) throw decisionError('AI_INDICATOR_MISSING');
  const entry = strategySignal(input);
  const permission=betPermission(input,raw.direction);
  if (!permission.allowed) throw decisionError('AI_STRATEGY_CONDITION_NOT_MET');
  const stake = Number(raw.stake_usdt);
  const stakePct = Number(raw.stake_pct);
  if (!Number.isFinite(stake) || stake <= 0 || Math.abs(Math.round(stake * 100) - stake * 100) > 1e-8 || !Number.isFinite(stakePct) || stakePct <= 0 || raw.risk_mode === 'WAIT') {
    throw decisionError('AI_STAKE_INVALID');
  }
  const capital=capitalForInput(input);
  if (stake < (capital.recoveryActive?.01:MIN_STAKE)) throw decisionError('AI_STAKE_BELOW_MINIMUM');
  const cap = Math.floor(input.account.balance * (capital.recoveryActive?100:policy.maxStakePct)+1e-8) / 100;
  if(capital.recoveryActive&&(raw.risk_mode!=='ALL_IN'||Math.abs(stake-Math.floor(input.account.balance*100+1e-8)/100)>1e-8))throw decisionError('AI_ALL_IN_REJECTED');
  if (stake > input.account.balance || stake > cap || Math.abs(stakePct - stake / input.account.balance * 100) > 0.02) throw decisionError('AI_STAKE_OVER_CAP');
  if(permission.probe&&(stakePct>permission.maxProbePct+0.02||raw.risk_mode!=='NORMAL'))throw decisionError('AI_PROBE_STAKE_OVER_CAP');
  const normalCap=PROFILE_RULES[policy.strategy].normalMaxStakePct;
  if(policy.strategy==='liangXi') {
    const expected=Math.floor(input.account.balance*(raw.risk_mode==='ALL_IN'?100:50)+1e-8)/100;
    if(!['NORMAL','ALL_IN'].includes(raw.risk_mode)||Math.abs(stake-expected)>1e-8)throw decisionError('AI_LIANGXI_STAKE_INVALID');
  }
  if(raw.risk_mode!=='ALL_IN'&&stakePct>normalCap+0.02) throw decisionError('AI_STAKE_OVER_CAP');
  const emotion=emotionForInput(input);
  if(raw.risk_mode==='ADD_ON'&&emotion.stakeMultiplier<=1.001&&countertradeMultiplier(input)<=1) throw decisionError('AI_RISK_MODE_INVALID');
  if (confidence < emotion.minimumConfidence) throw decisionError('AI_CONFIDENCE_TOO_LOW');
  const odds = raw.direction === 'UP' ? input.market.up_odds : input.market.down_odds;
  const expectedEdge = confidence / 100 * odds - 1;
  if (!Number.isFinite(expectedEdge) || expectedEdge <= 0) throw decisionError('AI_EDGE_NOT_POSITIVE');
  const emotionalNormalCap=permission.probe?permission.maxProbePct:normalStakePercent({countertradeMultiplier:countertradeMultiplier(input),balance:input.account.balance,initialBalance:input.account.initial_balance,openStake:input.account.open_stake||0,recoveryActive:input.account.capital_recovery,strategy:policy.strategy,baseStakePct:policy.baseStakePct,maxStakePct:policy.maxStakePct,confidence,edge:expectedEdge,winStreak:input.account.win_streak,lossStreak:input.account.loss_streak,emotionSensitivity:policy.emotionSensitivity,battleEmotion:input.policy.battle_emotion});
  if(raw.risk_mode!=='ALL_IN'&&stakePct>emotionalNormalCap+0.02) throw decisionError('AI_STAKE_OVER_CAP');
  const allInRules=allInRequirements({strategy:policy.strategy,battleEmotion:input.policy.battle_emotion});
  const effectivelyAllIn = raw.risk_mode === 'ALL_IN' || stake >= input.account.balance * 0.95;
  if (!capital.recoveryActive && effectivelyAllIn && (!policy.allowAllIn || confidence < allInRules.confidence || !strongConsensus(indicators, raw.direction,policy.strategy))) {
    throw decisionError('AI_ALL_IN_REJECTED');
  }
  if (!capital.recoveryActive && raw.risk_mode === 'ALL_IN' && (policy.maxStakePct !== 100 || Math.abs(stake - Math.floor(input.account.balance * 100) / 100) > 1e-8 ||
    expectedEdge < allInRules.minimumEdge || input.account.loss_streak < allInRules.requiredLossStreak)) throw decisionError('AI_ALL_IN_REJECTED');
  return { ...base, direction: raw.direction, stake, stakePct, expectedEdge, probe:permission.probe,
    ...(capital.mode!=='NORMAL'?{modelReason:base.modelReason||base.reason,reason:capital.recoveryActive?'搏命梭哈：继续全押，直到回本。':'本金已增长，按保守规则减少下注。'}:{}),
    ...(entry?.directionCorrection ? { directionCorrection: entry.directionCorrection } : {}) };
}

function decisionAudit({ provider, input, plan, indicators, raw }) {
  return {
    engine: raw?.[DECISION_META]?.engine || provider.describeFor?.(input) || provider.describe(),
    ...(raw?.[DECISION_META]?.usage ? { usage: raw[DECISION_META].usage } : {}),
    inputHash: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),
    roundId: input.market.round_id,
    dataTimestamp: Math.min(input.market.data_timestamp, indicators.dataTimestamp),
    action: plan.action,
    direction: plan.direction,
    stake: plan.stake,
    stakePct: plan.stakePct,
    confidence: plan.confidence,
    riskMode: plan.riskMode,
    capitalManagement: capitalForInput(input),
    expectedEdge: plan.expectedEdge,
    edgeBasis: 'uncalibrated-model-probability-before-fees',
    ...(plan.countertrade?{countertrade:plan.countertrade}:{}),
    reason: plan.reason,
    ...(plan.skipReasonCode?{skipReasonCode:plan.skipReasonCode}:{}),
    ...(plan.modelReason?{modelReason:plan.modelReason,modelReasonVerified:false,verifiedFacts:plan.verifiedFacts}:{}),
    warnings: plan.warnings,
    indicators: input.indicators,
    directionVersion: 'round-target-v1',
    ...(input.market.round_context ? { roundContext: input.market.round_context } : {}),
    ...(plan.directionCorrection ? { directionCorrection: plan.directionCorrection } : {}),
    ...(plan.divination?{divination:plan.divination}:{}),
  };
}

function rejectedDecisionAudit({ provider, input, indicators, reason }) {
  return {
    engine: provider.describeFor?.(input) || provider.describe(),
    inputHash: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),
    roundId: input.market.round_id,
    dataTimestamp: Math.min(input.market.data_timestamp, indicators.dataTimestamp),
    action: 'REJECTED',
    direction: null,
    stake: 0,
    confidence: 0,
    riskMode: 'WAIT',
    expectedEdge: null,
    reason: String(reason || 'AI_DECISION_FAILED'),
    warnings: [],
    indicators: input.indicators,
  };
}

module.exports = {
  decisionFacts,
  decisionStakeChoices,
  betPermission,
  entryWaitReason,
  modelReview,
  DECISION_META,
  DEFAULT_AGENT_POLICIES,
  entrySignal,
  INDICATORS,
  PROFILE_RULES,
  buildDecisionContext,
  createDeepSeekDecisionProvider,
  createMockDecisionProvider,
  createOffDecisionProvider,
  decisionAudit,
  decisionPrompt,
  normalizeAgentPolicies,
  normalizePolicy,
  rejectedDecisionAudit,
  validateDecision,
  strategySignal,
  assertDecisionInputs,
};
