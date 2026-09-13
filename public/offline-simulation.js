((root, factory) => {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.WarriorOfflineSimulation = exported;
})(typeof window === 'undefined' ? null : window, () => {
  const strategyCatalog = typeof module === 'object' && module.exports ? require('./strategy-catalog') : window.WarriorStrategyCatalog;
  const VERSION = 8;
  const STORAGE_KEY = 'warrior-offline-simulation-v1';
  const PERIODS = Object.freeze({'5m':5*60*1000,'15m':15*60*1000,'1h':60*60*1000,'1d':24*60*60*1000});
  const ROUND_MS = PERIODS['5m'];
  const easternFormatter = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const slots = ['A', 'B', 'C'];
  const defaults = [
    { id: 'A', name: '狐火术师', provider: 'claude', coin: 'BTC', strategy: 'aggressive', decisionVariance: 82, actionUrge: 85, emotionSensitivity: 90, maxStakePct: 100, allowAllIn: true, indicators: [...strategyCatalog.profiles.aggressive.recommended] },
    { id: 'B', name: '星环机甲', provider: 'gpt', coin: 'BTC', strategy: 'smart', decisionVariance: 45, actionUrge: 60, emotionSensitivity: 15, maxStakePct: 100, allowAllIn: true, indicators: [...strategyCatalog.profiles.smart.recommended] },
    { id: 'C', name: '深海灵兽', provider: 'deepseek', coin: 'BTC', strategy: 'conservative', decisionVariance: 18, actionUrge: 35, emotionSensitivity: 60, maxStakePct: 10, allowAllIn: false, indicators: [...strategyCatalog.profiles.conservative.recommended] },
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const money = value => Math.round(Number(value) * 100) / 100;
  const easternParts=value=>Object.fromEntries(easternFormatter.formatToParts(new Date(value)).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
  const easternNoon=(year,month,day)=>{const target=Date.UTC(year,month-1,day,12);let candidate=target;for(let index=0;index<3;index+=1){const parts=easternParts(candidate);candidate+=target-Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);}return candidate;};
  const currentStart = (value,duration=ROUND_MS) => {
    if(duration!==PERIODS['1d'])return Math.floor(value/duration)*duration;
    const local=easternParts(value),today=easternNoon(local.year,local.month,local.day);
    if(today<=value)return today;
    const previous=new Date(Date.UTC(local.year,local.month-1,local.day-1));
    return easternNoon(previous.getUTCFullYear(),previous.getUTCMonth()+1,previous.getUTCDate());
  };
  const nextStart=(value,duration=ROUND_MS)=>{const current=currentStart(value,duration);if(duration!==PERIODS['1d'])return current+duration;const local=easternParts(current),next=new Date(Date.UTC(local.year,local.month-1,local.day+1));return easternNoon(next.getUTCFullYear(),next.getUTCMonth()+1,next.getUTCDate());};
  const hash = value => { let result = 2166136261; for (const char of String(value)) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return result >>> 0; };
  const unit = value => hash(value) / 0xffffffff;
  const signed = value => unit(value) * 2 - 1;
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const rounded = (value,digits=4) => Number(Number(value).toFixed(digits));
  function simulatedIndicatorSnapshot(seed,start,symbol='BTCUSDT',timeframe='5m') {
    const prefix=`${seed}:${start}:indicators`,coherent=unit(`${prefix}:regime`)<0.72,bias=signed(`${prefix}:bias`),sign=bias>=0?1:-1,strength=0.45+Math.abs(bias)*0.55;
    const oneMinute=coherent?sign*(0.06+strength*0.28)+signed(`${prefix}:p1`)*0.05:signed(`${prefix}:p1`)*0.28;
    const fiveMinutes=coherent?sign*(0.15+strength*0.75)+signed(`${prefix}:p5`)*0.12:signed(`${prefix}:p5`)*0.55;
    const rsi14=coherent?50+sign*(6+strength*16)+signed(`${prefix}:rsi`)*3:50+signed(`${prefix}:rsi`)*18;
    const basePrice=symbol.startsWith('ETH')?3000:symbol.startsWith('BNB')?700:60000;
    const intervalMinutes=({'5m':1,'15m':3,'1h':15,'1d':240})[timeframe]||1,intervalMs=intervalMinutes*60000,candleBars=[];
    let candleClose=basePrice*(1-sign*.003);
    for(let index=0;index<20;index+=1){const forced=index>=16,barSign=forced?sign:(unit(`${prefix}:bar:${index}`)>.42?sign:-sign),body=basePrice*(forced?.00052:.00008+unit(`${prefix}:body:${index}`)*.00014),open=candleClose,close=open+barSign*body,wick=body*(.18+unit(`${prefix}:wick:${index}`)*.28),openTime=start-(20-index)*intervalMs;candleBars.push({openTime,closeTime:openTime+intervalMs-1,open:rounded(open,6),high:rounded(Math.max(open,close)+wick,6),low:rounded(Math.min(open,close)-wick,6),close:rounded(close,6)});candleClose=close;}
    const emaGap=coherent?sign*(0.0004+strength*0.0018)+signed(`${prefix}:ema`)*0.0002:signed(`${prefix}:ema`)*0.0014;
    const book=coherent?sign*(0.04+strength*0.22)+signed(`${prefix}:book`)*0.025:signed(`${prefix}:book`)*0.18;
    const volumeRatio=0.82+unit(`${prefix}:volume`)*0.78;
    const momentum=coherent?sign*basePrice*(0.0007+strength*0.0013)+signed(`${prefix}:momentum`)*basePrice*0.00015:signed(`${prefix}:momentum`)*basePrice*0.0012;
    const roc10=coherent?sign*(0.18+strength*0.65)+signed(`${prefix}:roc10`)*0.1:signed(`${prefix}:roc10`)*0.65;
    const roc20=coherent?sign*(0.3+strength*1.05)+signed(`${prefix}:roc20`)*0.16:signed(`${prefix}:roc20`)*1.05;
    const return15=coherent?sign*(0.2+strength*0.8)+signed(`${prefix}:return15`)*0.14:signed(`${prefix}:return15`)*0.9;
    const return60=coherent?sign*(0.45+strength*1.65)+signed(`${prefix}:return60`)*0.24:signed(`${prefix}:return60`)*1.8;
    const takerBuyRatio=clamp(0.5+(coherent?sign*(0.06+strength*0.14):signed(`${prefix}:taker`)*0.16)+signed(`${prefix}:taker-noise`)*0.02,0.25,0.75);
    const macdHistogram=coherent?sign*basePrice*(0.00005+strength*0.00015):signed(`${prefix}:macd`)*basePrice*0.00012;
    const macdSignal=macdHistogram*1.8;
    const adxValue=coherent?22+strength*18:10+unit(`${prefix}:adx`)*11;
    const dominantDi=22+strength*15,weakDi=8+unit(`${prefix}:weak-di`)*8;
    const plusDI=coherent?(sign>0?dominantDi:weakDi):12+unit(`${prefix}:plus-di`)*18;
    const minusDI=coherent?(sign<0?dominantDi:weakDi):12+unit(`${prefix}:minus-di`)*18;
    const bandwidthPct=1.6+unit(`${prefix}:bandwidth`)*3.8;
    const percentB=coherent?clamp(0.5+sign*(0.16+strength*0.2)+signed(`${prefix}:band`)*0.04,0.04,0.96):clamp(0.5+signed(`${prefix}:band`)*0.58,-0.08,1.08);
    const atrPercent=unit(`${prefix}:risk-event`)<0.1?1.25+unit(`${prefix}:atr-high`)*0.35:0.16+unit(`${prefix}:atr`)*0.46;
    const volatility=atrPercent>1?0.82+unit(`${prefix}:vol-high`)*0.2:0.07+unit(`${prefix}:vol`)*0.25;
    const spreadBps=atrPercent>1?8.2+unit(`${prefix}:spread-high`)*2.4:0.6+unit(`${prefix}:spread`)*3.3;
    const middle=basePrice*(1+signed(`${prefix}:middle`)*0.0005),halfBand=middle*bandwidthPct/200;
    const totalBase=80+unit(`${prefix}:taker-total`)*120;
    return {
      symbol,source:'offline-simulated',simulated:true,timestamp:start,dataTimestamp:start,
      candles:{intervalMinutes,targetMinutes:({'5m':5,'15m':15,'1h':60,'1d':1440})[timeframe]||5,bars:candleBars},
      priceChangePct:{oneMinute:rounded(oneMinute),fiveMinutes:rounded(fiveMinutes)},
      rsi14:rounded(clamp(rsi14,20,80),2),
      ema:{ema5:rounded(basePrice*(1+emaGap),2),ema20:basePrice},
      macd:{line:rounded(macdSignal+macdHistogram,4),signal:rounded(macdSignal,4),histogram:rounded(macdHistogram,4)},
      adx:{adx:rounded(adxValue,2),plusDI:rounded(plusDI,2),minusDI:rounded(minusDI,2)},
      bollinger:{middle:rounded(middle,2),upper:rounded(middle+halfBand,2),lower:rounded(middle-halfBand,2),percentB:rounded(percentB,4),bandwidthPct:rounded(bandwidthPct,3)},
      atr:{value:rounded(basePrice*atrPercent/100,4),percent:rounded(atrPercent,4)},
      roc:{tenMinutes:rounded(roc10,4),twentyMinutes:rounded(roc20,4)},
      longReturns:{fifteenMinutes:rounded(return15,4),sixtyMinutes:rounded(return60,4)},
      momentum:rounded(momentum,4),
      volatility:{perMinutePct:rounded(volatility,4)},
      volumeRatio:rounded(volumeRatio,3),
      takerFlow:{buyRatio:rounded(takerBuyRatio,4),netBase:rounded((takerBuyRatio*2-1)*totalBase,4),totalBase:rounded(totalBase,4)},
      spotOrderBookImbalance:rounded(clamp(book,-0.35,0.35),4),
      spread:{basisPoints:rounded(spreadBps,3),mid:basePrice,microprice:rounded(basePrice*(1+book*0.00005),4),micropriceBiasBps:rounded(book*0.5,4)},
    };
  }
  const normalizeStrategy = value => Object.hasOwn(strategyCatalog.profiles,value) ? value : 'smart';
  const normalizePolicy = (value = {}, index = 0) => {
    const fallback = defaults[index] || defaults[1];
    const strategy = normalizeStrategy(value.strategy || fallback.strategy);
    const profile = strategyCatalog.profiles[strategy];
    const maxStakePct = Math.max(5, Math.min(profile.maxStakePct, Number(value.maxStakePct ?? fallback.maxStakePct) || fallback.maxStakePct));
    const saved = Array.isArray(value.indicators) ? [...new Set(value.indicators.filter(key=>Object.hasOwn(strategyCatalog.indicators,key)))] : null;
    const legacyCoreDefaults = strategyCatalog.coreStrategies.includes(strategy) && saved?.length===strategyCatalog.defaultIndicators.length && strategyCatalog.defaultIndicators.every(key=>saved.includes(key));
    const selected = !saved || saved.length<3 || legacyCoreDefaults ? profile.recommended : saved;
    const indicators = [...new Set([...selected,...profile.required])];
    const requestedEmotion=Number(value.emotionSensitivity ?? profile.emotionSensitivity);
    const emotionSensitivity=Number.isFinite(requestedEmotion)?Math.max(0,Math.min(100,Math.round(requestedEmotion))):profile.emotionSensitivity;
    const requestedUrge=Number(value.actionUrge ?? profile.actionUrge);
    const actionUrge=Number.isFinite(requestedUrge)?Math.max(0,Math.min(100,Math.round(requestedUrge))):profile.actionUrge;
    return { ...fallback, ...value, id: String(value.id || fallback.id), name: String(value.name || fallback.name).slice(0, 40),
      provider: ['claude', 'gpt', 'deepseek'].includes(value.provider) ? value.provider : fallback.provider,
      coin: ['BTC','ETH','BNB'].includes(value.coin) ? value.coin : 'BTC', strategy, decisionVariance: Math.max(0, Math.min(100, Number(value.decisionVariance ?? fallback.decisionVariance) || 0)),
      actionUrge,emotionSensitivity,
      maxStakePct, allowAllIn: profile.allowAllIn && maxStakePct === 100 && Boolean(value.allowAllIn ?? fallback.allowAllIn), indicators };
  };
  function normalizeConfig(value = {}, policies) {
    if (Object.hasOwn(value, 'agents') && (!Array.isArray(value.agents) || !value.agents.length || value.agents.length > 8)) throw new Error('INVALID_BATTLE_AGENTS');
    const amount = value.initialBalance ?? value.budget;
    if (amount !== undefined && (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1 || amount > 1000)) throw new Error('INVALID_BATTLE_BUDGET');
    const raw = Array.isArray(value.agents) && value.agents.length ? value.agents : policies;
    if (new Set(raw.map(agent => agent?.coin || 'BTC')).size > 1) throw new Error('MIXED_BATTLE_ASSETS');
    const seen = new Set();
    const agents = raw.slice(0, 8).map((agent, index) => {
      let id = String(agent?.id || slots[index] || `agent-${index + 1}`);
      if (!id || seen.has(id)) id = `agent-${index + 1}`;
      seen.add(id);
      const policy=normalizePolicy({ ...agent, id }, index);
      if(!strategyCatalog.supportsAsset(policy.strategy,policy.coin))throw new Error('CHARACTER_ASSET_UNSUPPORTED');
      return policy;
    });
    const configuredRounds = value.rounds ?? value.maxRounds;
    if (configuredRounds != null && configuredRounds !== 'until-loss' && configuredRounds !== '' && (!Number.isInteger(configuredRounds) || configuredRounds < 1 || configuredRounds > 1000)) throw new Error('INVALID_BATTLE_ROUNDS');
    const rounds = configuredRounds === 'until-loss' || configuredRounds == null || configuredRounds === '' ? null : Math.max(1, Math.min(1000, Math.floor(Number(configuredRounds)) || 1));
    const emotionLevel=value.emotionLevel??0;
    if(typeof emotionLevel!=='number'||!Number.isInteger(emotionLevel)||emotionLevel<0||emotionLevel>100)throw new Error('INVALID_BATTLE_EMOTION');
    const actionUrgeLevel=value.actionUrgeLevel??0;
    if (value.realtimeEntry === true) throw new Error('REALTIME_ENTRY_UNAVAILABLE');
    if(typeof actionUrgeLevel!=='number'||!Number.isInteger(actionUrgeLevel)||actionUrgeLevel<0||actionUrgeLevel>100)throw new Error('INVALID_BATTLE_ACTION_URGE');
    const period=String(value.period||'5m').toLowerCase();
    if(!Object.hasOwn(PERIODS,period))throw new Error('INVALID_BATTLE_PERIOD');
    return { initialBalance: money(amount ?? 100), rounds, market: 'Binance Prediction', asset: `${agents[0].coin}USDT`, period, roundMs:PERIODS[period], emotionLevel, actionUrgeLevel, agents };
  }

  function createOfflineSimulation({ storage, now = Date.now, randomUUID } = {}) {
    const clock = () => Number(now());
    const makeId = randomUUID || (() => globalThis.crypto?.randomUUID?.() || `battle-${clock()}-${Math.random().toString(16).slice(2)}`);
    const saveTarget = storage || null;
    let state;
    const freshPolicies = () => defaults.map((item, index) => normalizePolicy(item, index));
    function makeAgent(policy, initialBalance) { return { id: policy.id, cash: initialBalance, reserved: 0, wins: 0, losses: 0, lastStatus: 'WAITING', lastDecision: null, orders: [], policy: clone(policy) }; }
    function makeBattle(id, name, createdAt, config) { return { id, name, createdAt, config, enabled: true, lifecycle: 'running', endReason: null, endedAt: null, roundCount: 0, nextSlot: nextStart(clock(),config.roundMs), agents: config.agents.map(agent => makeAgent(agent, config.initialBalance)) }; }
    function freshState() { const policies = freshPolicies(); const config = normalizeConfig({ agents: policies }, policies); return { version: VERSION, policies, battles: [{ id: 'default', name: 'A / B / C', createdAt: null, config, enabled: false, lifecycle: 'paused', endReason: null, endedAt: null, roundCount: 0, nextSlot: nextStart(clock(),config.roundMs), agents: config.agents.map(agent => makeAgent(agent, config.initialBalance)) }] }; }
    function load() {
      try {
        const parsed = JSON.parse(saveTarget?.getItem(STORAGE_KEY) || 'null');
        if (![1,2,3,4,5,6,7,VERSION].includes(parsed?.version) || !Array.isArray(parsed.battles) || !parsed.battles.length || parsed.battles[0]?.id !== 'default') return freshState();
        parsed.version = VERSION;
        parsed.policies = slots.map((_, index) => normalizePolicy(parsed.policies?.[index], index));
        parsed.battles.forEach(battle => {
          battle.config = normalizeConfig(battle.config || { agents: parsed.policies }, parsed.policies);
          battle.enabled = false; // Reopening never resumes unattended battles.
          if (battle.lifecycle === 'running') battle.lifecycle = 'paused';
          battle.lifecycle = battle.lifecycle || (battle.enabled ? 'running' : 'paused');
          battle.endReason = battle.endReason || null;
          battle.endedAt = battle.endedAt || null;
          battle.roundCount = Math.max(0, Number(battle.roundCount) || 0);
          battle.nextSlot = Number(battle.nextSlot) || nextStart(clock(),battle.config.roundMs);
          const validBoundary=battle.config.roundMs===PERIODS['1d'] ? easternParts(battle.nextSlot).hour===12 : battle.nextSlot % battle.config.roundMs===0;
          if (!validBoundary) battle.nextSlot = nextStart(clock(),battle.config.roundMs);
          battle.agents = battle.config.agents.map((policy, index) => {
            const saved = battle.agents?.find(agent => agent.id === policy.id) || {};
            return { id: policy.id, cash: Math.max(0, Number(saved.cash) || 0), addedCapital:saved.addedCapital||0, topUps:saved.topUps||[], reserved: Math.max(0, Number(saved.reserved) || 0), wins: Math.max(0, Number(saved.wins) || 0), losses: Math.max(0, Number(saved.losses) || 0), lastStatus: saved.lastStatus || 'WAITING', lastDecision: saved.lastDecision || null, orders: Array.isArray(saved.orders) ? saved.orders : [], policy: clone(policy) };
          });
        });
        return parsed;
      } catch { return freshState(); }
    }
    function persist() {
      try { saveTarget?.setItem(STORAGE_KEY, JSON.stringify(state)); }
      catch {
        for (const battle of state.battles) if (battle.enabled) {
          battle.enabled = false; battle.lifecycle = 'paused'; battle.endReason = 'STORAGE_ERROR';
        }
        throw new Error('STORAGE_ERROR');
      }
    }
    function findBattle(id = 'default') { const battle = state.battles.find(item => item.id === id); if (!battle) { const error = new Error('Battle not found'); error.status = 404; error.code = 'BATTLE_NOT_FOUND'; throw error; } return battle; }
    function currentStreaks(agent) {
      let winStreak=0,lossStreak=0;
      for(const order of [...agent.orders].reverse()) {
        if(order.status==='WON'&&!lossStreak) winStreak++;
        else if(order.status==='LOST'&&!winStreak) lossStreak++;
        else if(['WON','LOST'].includes(order.status)) break;
      }
      return {winStreak,lossStreak};
    }
    function settleOpenOrders(battle, timestamp) { battle.agents.forEach(agent => { const order = agent.orders.at(-1); if (!order || order.status !== 'OPEN' || order.end > timestamp) return; const outcome = unit(`${battle.id}:${order.start}:market`) >= 0.5 ? 'UP' : 'DOWN'; order.outcome = outcome; order.settledAt = timestamp; agent.reserved = money(Math.max(0, agent.reserved - order.amount)); if (order.direction === outcome) { order.status = 'WON'; agent.cash = money(agent.cash + order.amount * order.quote.odds); agent.wins += 1; } else { order.status = 'LOST'; agent.losses += 1; } agent.lastStatus = order.status; }); }

    function finish(battle, reason) {
      if (['ended', 'settling'].includes(battle.lifecycle)) return;
      battle.enabled = false;
      battle.lifecycle = 'settling';
      battle.endReason = reason;
      finalize(battle);
      persist();
    }
    function finalize(battle) {
      if (battle.lifecycle !== 'settling' || battle.agents.some(a => a.orders.some(o => o.status === 'OPEN'))) return;
      battle.lifecycle = 'ended';
      battle.endedAt = clock();
      battle.report = publicSnapshot(battle);
    }
    function openRound(battle, start) {
      const roundMs=battle.config.roundMs;
      battle.roundCount += 1; battle.lastAttempt = start; battle.nextSlot = start + roundMs;
      const snapshot=simulatedIndicatorSnapshot(battle.id,start,battle.config.asset,battle.config.period),upOdds=money(1.82+unit(`${battle.id}:${start}:up-odds`)*0.28),downOdds=money(1.82+unit(`${battle.id}:${start}:down-odds`)*0.28);
      battle.lastIndicators=clone(snapshot);
      battle.agents.forEach(a=>{a.policy=clone(battle.config.agents.find(p=>p.id===a.id));});
      [...battle.agents].sort((a,b)=>strategyCatalog.decisionStage(a.policy?.strategy)-strategyCatalog.decisionStage(b.policy?.strategy)).forEach((agent, index) => {
        const policy=battle.config.agents.find(p=>p.id===agent.id)||agent.policy,profile=strategyCatalog.profiles[policy.strategy];agent.policy=clone(policy);
        if(!strategyCatalog.coreStrategies.includes(policy.strategy)&&!strategyCatalog.characterStrategies.includes(policy.strategy)&&!strategyCatalog.divinationStrategies.includes(policy.strategy)&&policy.strategy!=='priceAction') {
          agent.lastStatus='SKIPPED';agent.lastDecision={roundId:String(start),action:'SKIP',direction:null,stakeUsdt:0,confidence:0,riskMode:'WAIT',reason:'新策略需要真实指标，离线演示不生成信号。'};return;
        }
        const streaks=currentStreaks(agent);
        const actionUrge=strategyCatalog.effectiveActionUrge(policy.actionUrge,battle.config.actionUrgeLevel);
        const emotion=strategyCatalog.emotionAdjustment({strategy:policy.strategy,actionUrge,emotionSensitivity:policy.emotionSensitivity,battleEmotion:battle.config.emotionLevel,...streaks});
        const peers=strategyCatalog.peerSnapshot(battle.agents,start,battle.config.asset,clock());
        const signal=strategyCatalog.evaluateCharacter(policy.strategy,snapshot,actionUrge,{asset:battle.config.asset,roundId:start,agentId:agent.id,peers})||strategyCatalog.evaluateDivination(policy.strategy,{...snapshot,marketOdds:{up:upOdds,down:downOdds}},{roundId:start,asset:battle.config.asset})||strategyCatalog.evaluatePriceAction(policy.strategy,snapshot.candles,actionUrge)||strategyCatalog.evaluateCoreStrategy(policy.strategy,snapshot,actionUrge),direction=signal.score>=0?'UP':'DOWN';
        const baseConfidence=strategyCatalog.confidenceForScore(signal.score,policy.decisionVariance,policy.strategy),nudge=strategyCatalog.personalityNudge({strategy:policy.strategy,agentId:agent.id,roundId:start,variance:policy.decisionVariance,confidence:baseConfidence,minimumConfidence:emotion.minimumConfidence}),confidence=Math.max(50,Math.min(97,baseConfidence+nudge)),odds=direction==='UP'?upOdds:downOdds,edge=confidence/100*odds-1;
        const oracle=signal.divination;
        const oracleResult=verdict=>oracle?{divination:{...oracle,interpretation:strategyCatalog.formatDivination(oracle),finalVerdict:verdict},warnings:['ENTERTAINMENT_ONLY']}:{};
        const factors=[...signal.factors,{name:'emotion',value:`${emotion.state}:${emotion.streak}; own=${emotion.sensitivity}; arena=${emotion.battleEmotion}; stake=x${emotion.stakeMultiplier.toFixed(3)}; min_confidence=${emotion.minimumConfidence.toFixed(2)}`,impact:'NEUTRAL'},{name:'personality_nudge',value:nudge.toFixed(3),impact:'NEUTRAL'}];
        if(Math.abs(signal.score)<1.5||confidence<emotion.minimumConfidence||edge<=0||agent.cash<0.01) {
          agent.lastStatus=agent.cash<0.01?'INSUFFICIENT_FUNDS':'SKIPPED';agent.lastDecision={roundId:String(start),action:'SKIP',direction:null,stakeUsdt:0,confidence:Math.round(confidence),riskMode:'WAIT',reason:'模拟指标没有通过策略与情绪门槛',factors,indicators:clone(snapshot),...(strategyCatalog.characterStrategies.includes(policy.strategy)?{peers:clone(peers)}:{}),...oracleResult('WAIT')};return;
        }
        let percent=strategyCatalog.normalStakePercent({strategy:policy.strategy,baseStakePct:profile.baseStakePct,maxStakePct:policy.maxStakePct,confidence,edge,...streaks,emotionSensitivity:policy.emotionSensitivity,battleEmotion:battle.config.emotionLevel});
        let riskMode=emotion.streak&&emotion.stakeMultiplier>1.001?'ADD_ON':'NORMAL';
        const allIn=policy.allowAllIn&&policy.maxStakePct===100&&confidence>=profile.allInConfidence&&edge>=0.2&&strategyCatalog.strongCoreConsensus(snapshot,direction,policy.strategy)&&(policy.strategy==='smart'||streaks.lossStreak>=2);
        if(allIn){percent=100;riskMode='ALL_IN';}
        const amount=money(Math.min(agent.cash,Math.max(0.01,agent.cash*percent/100)));
        const emotionText=emotion.state==='neutral'||emotion.sensitivity===0?'':emotion.state==='win'?(emotion.stakeMultiplier>1.001?'；连胜情绪加码':'；连胜后仍保持冷静'):(emotion.stakeMultiplier>1.001?'；连败后更想翻本':'；连败情绪缩注');
        const reason=(oracle?`${strategyCatalog.formatDivination(oracle)}；卦牌与指标同向，小注试势`:policy.strategy==='priceAction'?'只看开高低收，裸K形态同向':policy.strategy==='smart'?`先判断${signal.regime==='trend'?'趋势局':'震荡局'}，再按优势调整金额`:policy.strategy==='conservative'?'波动和价差安全，趋势与盘口全部同向，只押小注':'短线、动量和主动买卖同向')+emotionText;
        const order={id:`${battle.id}-${start}-${agent.id}`,start,end:nextStart(start,roundMs),direction,amount,status:'OPEN',quote:{odds,source:'offline-simulated'},indicators:clone(snapshot)};
        agent.cash=money(agent.cash-amount);agent.reserved=money(agent.reserved+amount);agent.orders.push(order);agent.lastStatus='OPEN';agent.lastDecision={roundId:String(start),action:'BET',direction,stakeUsdt:amount,stakePct:amount/(amount+agent.cash)*100,confidence:Math.round(confidence),riskMode,reason,factors,indicators:clone(snapshot),...(strategyCatalog.characterStrategies.includes(policy.strategy)?{peers:clone(peers)}:{}),...oracleResult(direction)};
      });
    }
    function advance(battle) {
      if (battle.lifecycle === 'ended') return;
      const timestamp = clock();
      settleOpenOrders(battle, timestamp);
      finalize(battle);
      if (battle.lifecycle === 'ended') { persist(); return; }
      const roundMs=battle.config.roundMs,start = currentStart(timestamp,roundMs);
      if (battle.enabled && timestamp >= battle.nextSlot && start > (battle.lastAttempt ?? -1)) {
        // Consume each boundary once even when every Agent skips; never backfill missed rounds.
        battle.nextSlot = nextStart(start,roundMs);
        if (timestamp - start <= 10000) openRound(battle, start);
      }
      if (battle.config.rounds && battle.roundCount >= battle.config.rounds) finish(battle, 'ROUND_LIMIT');
      if (battle.enabled && battle.agents.every(a => a.cash < 0.01 && a.reserved === 0)) finish(battle, 'BALANCE_DEPLETED');
      persist();
    }
    function publicAgent(agent) { const latest = agent.orders.at(-1) || null; const equity = money(agent.cash + agent.reserved); return { ...clone(agent), latest: clone(latest), equity, winRate: agent.wins + agent.losses ? agent.wins / (agent.wins + agent.losses) : null }; }
    function publicSnapshot(battle) {
      const roundMs=battle.config.roundMs,start = currentStart(clock(),roundMs);
      const status = ['ended', 'settling'].includes(battle.lifecycle) ? battle.lifecycle : battle.enabled ? 'running' : 'paused';
      return { id: battle.id, name: battle.name, placeholder: Boolean(battle.placeholder), createdAt: battle.createdAt, enabled: battle.enabled, status,
        roundCount: battle.roundCount, serverTime: clock(), nextSlot: battle.nextSlot,
        activeMarket: status === 'ended' ? null : { id: `offline-${start}`, start, end: nextStart(start,roundMs), source: 'offline-simulated' },
        market: null, indicators: clone(battle.lastIndicators || simulatedIndicatorSnapshot(battle.id,start,battle.config.asset,battle.config.period)), error: null, decisionEngine: { mode: 'offline', configured: true, simulationOnly: true },
        config: clone(battle.config), initialTotal: battle.config.initialBalance * battle.config.agents.length, addedCapital:battle.agents.reduce((sum,a)=>sum+(a.addedCapital||0),0),
        endedAt: battle.endedAt, endReason: battle.endReason, agents: battle.agents.map(publicAgent) };
    }
    function snapshot(id = 'default') {
      const battle = findBattle(id);
      advance(battle);
      return clone(battle.report || publicSnapshot(battle));
    }
    function list() { return state.battles.map(battle => snapshot(battle.id)); }
    function leaderboard() { return list().flatMap(battle => battle.agents.map(agent => ({ battleId: battle.id, battleName: battle.name, agentId: agent.id, equity: agent.equity, profit: money(agent.equity - battle.config.initialBalance - (agent.addedCapital||0)), returnRate: (agent.equity - battle.config.initialBalance - (agent.addedCapital||0)) / (battle.config.initialBalance+(agent.addedCapital||0)), wins: agent.wins, losses: agent.losses, winRate: agent.winRate }))).sort((left, right) => right.profit - left.profit || (right.winRate ?? -1) - (left.winRate ?? -1)); }
    // Virtual chips only; real wallet funding requires a separate, receipt-backed implementation.
    function topUp(id,agentId,amount,requestId){
      const battle=findBattle(id);
      if(typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>1e-7)throw new Error('INVALID_TOP_UP_AMOUNT');
      if(typeof requestId!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(requestId))throw new Error('INVALID_TOP_UP_REQUEST');
      const prior=battle.agents.flatMap(a=>(a.topUps||[]).map(entry=>({...entry,agentId:a.id}))).find(entry=>entry.requestId===requestId);
      if(prior){if(prior.agentId!==agentId||prior.amount!==amount)throw new Error('TOP_UP_CONFLICT');return clone(publicSnapshot(battle));}
      if(battle.placeholder||['ended','settling'].includes(battle.lifecycle))throw new Error('BATTLE_ENDED');
      const agent=battle.agents.find(a=>a.id===agentId);if(!agent)throw new Error('AGENT_NOT_FOUND');
      if((agent.addedCapital||0)+amount>1e9)throw new Error('INVALID_TOP_UP_AMOUNT');
      const before=clone(state);
      agent.cash=money(agent.cash+amount);agent.addedCapital=money((agent.addedCapital||0)+amount);
      agent.topUps=[...(agent.topUps||[]),{requestId,amount,at:clock()}];
      try{persist();}catch(error){
        state=before;
        // Roll back the credit without undoing the existing fail-closed storage pause.
        for(const saved of state.battles)if(saved.enabled){saved.enabled=false;saved.lifecycle='paused';saved.endReason='STORAGE_ERROR';}
        throw error;
      }
      return clone(publicSnapshot(battle));
    }
    function create(name, config = {}) { const value = String(name || '').trim(); if (!value || value.length > 40) throw new Error('Name must contain 1–40 characters'); const battleConfig = normalizeConfig(config, state.policies); const battle = makeBattle(makeId(), value, clock(), battleConfig); state.battles.push(battle); persist(); return snapshot(battle.id); }
    function setEnabled(id, enabled) {
      const battle = findBattle(id);
      if (battle.placeholder && enabled) throw new Error('CREATE_BATTLE_FIRST');
      if (['ended', 'settling'].includes(battle.lifecycle)) {
        if (enabled) throw new Error('BATTLE_ENDED');
        return snapshot(id);
      }
      battle.enabled = Boolean(enabled);
      battle.lifecycle = battle.enabled ? 'running' : 'paused';
      battle.endReason = battle.enabled ? null : 'USER_PAUSED';
      battle.nextSlot = nextStart(clock(),battle.config.roundMs);
      persist();
      return snapshot(id);
    }
    function setEmotion(id, emotionLevel) {
      const battle=findBattle(id);
      if(['ended','settling'].includes(battle.lifecycle))throw new Error('BATTLE_ENDED');
      if(typeof emotionLevel!=='number'||!Number.isInteger(emotionLevel)||emotionLevel<0||emotionLevel>100)throw new Error('INVALID_BATTLE_EMOTION');
      battle.config.emotionLevel=emotionLevel;
      persist();
      return snapshot(id);
    }
    function setActionUrge(id, actionUrgeLevel) {
      const battle=findBattle(id);
      if(['ended','settling'].includes(battle.lifecycle))throw new Error('BATTLE_ENDED');
      if(typeof actionUrgeLevel!=='number'||!Number.isInteger(actionUrgeLevel)||actionUrgeLevel<0||actionUrgeLevel>100)throw new Error('INVALID_BATTLE_ACTION_URGE');
      battle.config.actionUrgeLevel=actionUrgeLevel;
      persist();
      return snapshot(id);
    }
    function end(id, reason = 'MANUAL') { const battle = findBattle(id); finish(battle, reason); return snapshot(id); }
    function getStrategies() { return { agents: clone(state.policies) }; }
    function remove(id) {
      const battle = findBattle(id);
      if (battle.placeholder) throw Object.assign(new Error('BATTLE_NOT_FOUND'), { code: 'BATTLE_NOT_FOUND' });
      if (battle.agents.some(agent => agent.orders.some(order => order.status === 'OPEN'))) throw Object.assign(new Error('BATTLE_HAS_PENDING_ORDERS'), { code: 'BATTLE_HAS_PENDING_ORDERS' });
      const next = clone(state);
      next.battles = next.battles.filter(item => item.id !== id);
      if (id === 'default') {
        const empty = freshState().battles[0]; empty.placeholder = true;
        empty.config = normalizeConfig({}, state.policies);
        empty.agents = empty.config.agents.map(policy => makeAgent(policy, empty.config.initialBalance));
        next.battles.unshift(empty);
      }
      saveTarget?.setItem(`${STORAGE_KEY}-archive-${makeId()}`, JSON.stringify({ version: VERSION, policies: state.policies, battles: [battle] }));
      saveTarget?.setItem(STORAGE_KEY, JSON.stringify(next));
      state = next;
      return { battles: list(), leaderboard: leaderboard().filter(row => !findBattle(row.battleId).placeholder) };
    }
    function reset() {
      const previous = state;
      const next = freshState();
      next.policies = clone(state.policies);
      next.battles[0].config = normalizeConfig({}, next.policies);
      next.battles[0].agents = next.policies.map(policy => makeAgent(policy, 100));
      next.battles[0].placeholder = true;
      // Abort without replacing current state when backup storage is unavailable/full.
      saveTarget?.setItem(`${STORAGE_KEY}-archive-${makeId()}`, JSON.stringify(previous));
      saveTarget?.setItem(STORAGE_KEY, JSON.stringify(next));
      state = next;
      return snapshot();
    }
    function setStrategies(agents) { state.policies = slots.map((_, index) => normalizePolicy(Array.isArray(agents) ? agents[index] : undefined, index)); persist(); return getStrategies(); }
    state = load();
    return { mode: 'offline', snapshot, list, create, reset, remove, topUp, setEnabled, setEmotion, setActionUrge, end, leaderboard: () => leaderboard().filter(row => !findBattle(row.battleId).placeholder), getStrategies, setStrategies, indicators(symbol = 'BTCUSDT') { return simulatedIndicatorSnapshot('standalone',currentStart(clock()),symbol); }, clear() { state = freshState(); persist(); return snapshot(); } };
  }
  return { PERIODS, ROUND_MS, STORAGE_KEY, simulatedIndicatorSnapshot, createOfflineSimulation };
});
