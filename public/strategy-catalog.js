((root, factory) => {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root) root.WarriorStrategyCatalog = value;
})(typeof window === 'undefined' ? null : window, () => {
  const MIN_STAKE = 5;
  const defaultIndicators = ['priceChange', 'rsi', 'ema', 'volume', 'orderbook', 'odds'];
  const aggressiveIndicators = ['priceChange','momentum','roc','volume','takerFlow','orderbook','longReturns','odds'];
  const smartIndicators = ['priceChange','rsi','ema','macd','adx','bollinger','atr','volatility','volume','takerFlow','orderbook','spread','longReturns','odds'];
  const conservativeIndicators = ['priceChange','rsi','ema','adx','atr','volatility','spread','orderbook','longReturns','odds'];
  const definitions = [
    ['priceChange','1m / 5m 涨跌','1m / 5m change','price_change_pct','priceChangePct'],
    ['rsi','RSI 14','RSI 14','rsi_14','rsi14'],
    ['ema','EMA 5 / 20','EMA 5 / 20','ema_5_20','ema'],
    ['volume','成交量倍率','Volume ratio','volume_ratio','volumeRatio'],
    ['orderbook','订单簿失衡','Order-book imbalance','spot_order_book_imbalance','spotOrderBookImbalance'],
    ['odds','市场赔率','Market odds','market_odds','marketOdds'],
    ['sma','SMA 5 / 20 / 50','SMA 5 / 20 / 50','sma_5_20_50','sma'],
    ['macd','MACD 12 / 26 / 9','MACD 12 / 26 / 9','macd_12_26_9','macd'],
    ['bollinger','布林带 20','Bollinger Bands 20','bollinger_20','bollinger'],
    ['atr','ATR 14 波动幅度','ATR 14 range','atr_14','atr'],
    ['adx','ADX / DMI 14','ADX / DMI 14','adx_dmi_14','adx'],
    ['stochastic','随机指标 14 / 3','Stochastic 14 / 3','stochastic_14_3','stochastic'],
    ['cci','CCI 20','CCI 20','cci_20','cci'],
    ['williams','威廉指标 14','Williams %R 14','williams_r_14','williams'],
    ['mfi','资金流量 MFI 14','Money Flow Index 14','mfi_14','mfi'],
    ['obv','OBV 20 分钟净变化','OBV 20m net change','obv_change_20','obv'],
    ['vwap','滚动 VWAP 20 分钟','Rolling VWAP 20m','vwap_20','vwap'],
    ['roc','ROC 10 / 20','ROC 10 / 20','roc_10_20','roc'],
    ['momentum','动量 10','Momentum 10','momentum_10','momentum'],
    ['volatility','已实现波动率 20','Realized volatility 20','realized_volatility_20','volatility'],
    ['donchian','唐奇安突破通道 20','Donchian breakout 20','donchian_20','donchian'],
    ['takerFlow','主动买卖流 5 分钟','Taker flow 5m','taker_flow_5','takerFlow'],
    ['spread','买卖价差与微价格','Spread & microprice','spread_microprice','spread'],
    ['cmf','蔡金资金流 CMF 20','Chaikin Money Flow 20','cmf_20','cmf'],
    ['longReturns','15m / 60m 涨跌','15m / 60m change','returns_15_60','longReturns'],
    ['candles','最近 20 根裸 K','Latest 20 raw candles','raw_candles','candles'],
  ];
  const indicators = Object.fromEntries(definitions.map(([key,zh,en,field,snapshotKey]) => [key,{key,zh,en,field,snapshotKey}]));
  const profiles = {
    kzgMask:{label:'KZG 口罩哥',enLabel:'KZG Mask Bro',description:'先确认趋势和区间突破，再等量能与主动流确认；信号冲突就观望。',enDescription:'Confirm trend and a closed-candle range break, then require volume and flow support. Wait on conflicting evidence.',actionUrge:35,emotionSensitivity:25,emotionLabel:'亏损后更耐心等待确认',enEmotionLabel:'Waits more patiently for confirmation after losses.',emotion:{winStake:.08,lossStake:-.15,winConfidence:0,lossConfidence:.8},variance:20,minConfidence:72,baseStakePct:8,maxStakePct:20,required:['ema','adx','longReturns','candles','donchian','volume','takerFlow','orderbook','atr','spread','odds']},
    sunBrother:{label:'孙哥 · 反指',enLabel:'Sun Bro · Inverse',description:'黄毛薄肌，指标反着来。明确技术信号看涨则看空，看跌则看涨；信号冲突、缺失或风险过高时观望。人物娱乐设定。',enDescription:'Blond and lean. Invert a clear technical consensus: bullish signals permit DOWN, bearish signals permit UP. Conflicting, missing or unsafe inputs require waiting. Fictional persona.',actionUrge:55,emotionSensitivity:35,emotionLabel:'反指不等于盲目追损',enEmotionLabel:'Inversion never permits blind loss chasing.',emotion:{winStake:.05,lossStake:-.1,winConfidence:0,lossConfidence:.5},variance:40,minConfidence:74,baseStakePct:10,maxStakePct:25,required:['ema','macd','rsi','adx','volume','atr','longReturns','spread','odds']},
    liangXi:{label:'凉兮',enLabel:'Liang Xi',description:'盯短线拐点，多空都敢做；选点挑剔，开仓后容易上头连着押。只下半仓或全仓。人物风格模拟，不代表本人或真实胜率。',enDescription:'Hunt short-term turns in either direction. Selective before entry, but prone to repeated bets after getting involved. Stake only half or all of the available paper balance. A persona simulation, not the real person or a verified win rate.',actionUrge:40,emotionSensitivity:95,emotionLabel:'赢了想滚仓，输了急翻本',enEmotionLabel:'Wants to roll winnings and rushes to win losses back.',emotion:{winStake:0,lossStake:0,winConfidence:-6,lossConfidence:-8},variance:35,minConfidence:84,baseStakePct:50,normalMaxStakePct:50,maxStakePct:100,allowAllIn:true,allInConfidence:90,fixedStakeChoices:[50,100],required:smartIndicators,recommended:smartIndicators},
    fengShui:{label:'风水师',enLabel:'Feng Shui Master',description:'卦象定方向，卦象相持就看五行；有行情信号呼应就敢试小注，强烈逆风才静观。娱乐模拟，不代表预测能力。',enDescription:'Follow the oracle direction, using the drawn element to break a symbol tie. Try a small stake with some market support; wait against strong opposing evidence. Entertainment simulation, not predictive power.',actionUrge:50,emotionSensitivity:25,emotionLabel:'连败宜静，不追损',enEmotionLabel:'Seek stillness after losses; never chase.',emotion:{winStake:.03,lossStake:-.15,winConfidence:0,lossConfidence:.8},variance:40,minConfidence:70,baseStakePct:5,maxStakePct:10,required:['priceChange','rsi','ema','orderbook','atr','spread','longReturns','odds']},
    diviner:{label:'占卜师',enLabel:'Diviner',description:'三张牌定偏向，有行情支持就小注尝试；手痒高时，中立牌面可参考行情试探，每轮不重抽。娱乐模拟。',enDescription:'Use the three-card tilt with market support for small bets. At high action urge, a neutral draw may consult market direction for a small probe. Never redraw within a round. Entertainment simulation.',actionUrge:55,emotionSensitivity:40,emotionLabel:'连败收牌，降低下注',enEmotionLabel:'Put the cards away and reduce stakes after losses.',emotion:{winStake:.05,lossStake:-.18,winConfidence:0,lossConfidence:1},variance:55,minConfidence:70,baseStakePct:5,maxStakePct:10,required:['priceChange','rsi','ema','orderbook','atr','spread','longReturns','odds']},
    aggressive:{label:'10U战神',enLabel:'10U Warrior',description:'短线谁冲得猛就追谁，也瞄一眼 15/60 分钟大势；冲劲够强才敢逆风追。',enDescription:'Chase the strongest short pressure while checking the 15m/60m backdrop; only very strong momentum may run against it.',actionUrge:85,emotionSensitivity:90,emotionLabel:'连胜膨胀，连败追损',enEmotionLabel:'Raises stakes after wins and chases losses.',emotion:{winStake:5/9,lossStake:.38,winConfidence:-1.2,lossConfidence:-1.5},variance:82,minConfidence:58,baseStakePct:20,normalMaxStakePct:60,maxStakePct:100,allowAllIn:true,allInConfidence:85,required:aggressiveIndicators,recommended:aggressiveIndicators},
    smart:{label:'超级AI',enLabel:'Super AI',description:'先用 15/60 分钟认清大势，再判断趋势、震荡或危险局；看不懂就不押。',enDescription:'Read the 15m/60m backdrop first, then classify risk, trend or chop; skip unclear or dangerous snapshots.',actionUrge:60,emotionSensitivity:15,emotionLabel:'只有轻微情绪波动',enEmotionLabel:'Only reacts slightly to wins and losses.',emotion:{winStake:.08,lossStake:-.08,winConfidence:-.2,lossConfidence:.35},variance:45,minConfidence:68,baseStakePct:10,normalMaxStakePct:30,maxStakePct:100,allowAllIn:true,allInConfidence:92,required:smartIndicators,recommended:smartIndicators},
    conservative:{label:'守财奴',enLabel:'Miser',description:'先查 15/60 分钟大势、波动和价差；长短线一致才押小注。',enDescription:'Check the 15m/60m backdrop, volatility and spread first; bet small only when long and short signals agree.',actionUrge:35,emotionSensitivity:60,emotionLabel:'连败就缩注、更谨慎',enEmotionLabel:'Cuts stakes and becomes more cautious after losses.',emotion:{winStake:.02,lossStake:-.25,winConfidence:0,lossConfidence:1.5},variance:18,minConfidence:78,baseStakePct:5,normalMaxStakePct:10,maxStakePct:10,allowAllIn:false,allInConfidence:101,required:conservativeIndicators,recommended:conservativeIndicators},
    trendFollowing:{label:'跟风侠',enLabel:'Trend Chaser',description:'五分钟、均线、MACD、DMI 和 15/60 分钟大势多数同向才跟。',enDescription:'Follow only when the 5m move, EMA, MACD, DMI and the 15m/60m backdrop mostly align.',actionUrge:60,emotionSensitivity:65,emotionLabel:'连胜敢跟，连败收手',enEmotionLabel:'Follows harder after wins and pulls back after losses.',emotion:{winStake:.22,lossStake:-.18,winConfidence:-.6,lossConfidence:1},variance:35,minConfidence:72,baseStakePct:8,maxStakePct:20,required:['priceChange','ema','macd','adx','longReturns','odds']},
    meanReversion:{label:'抄底摸顶王',enLabel:'Bottom & Top Hunter',description:'看到超买超卖就想抄底摸顶；三项信号中两项同向就敢试，普通逆势敢接，强单边行情才收手。',enDescription:'Hunt tops and bottoms early: two agreeing oversold or overbought signals can trigger a reversal bet. Ordinary countertrend setups are allowed; strong one-way trends still block entry.',actionUrge:45,emotionSensitivity:75,emotionLabel:'越输越觉得快反转',enEmotionLabel:'Gets more stubborn about a reversal after losses.',emotion:{winStake:.1,lossStake:.22,winConfidence:-.3,lossConfidence:-.8},variance:25,minConfidence:74,baseStakePct:5,maxStakePct:15,required:['bollinger','rsi','stochastic','adx','longReturns','odds']},
    breakout:{label:'火箭哥',enLabel:'Rocket Bro',description:'突破前高前低后，还要短线冲劲和 15/60 分钟大势别唱反调才点火。',enDescription:'Launch at a range break only when short pressure confirms it and the 15m/60m backdrop does not strongly oppose it.',actionUrge:55,emotionSensitivity:70,emotionLabel:'连胜猛冲，连败等机会',enEmotionLabel:'Rushes harder after wins and waits after losses.',emotion:{winStake:.24,lossStake:-.22,winConfidence:-.5,lossConfidence:1},variance:45,minConfidence:72,baseStakePct:8,maxStakePct:20,required:['donchian','volume','atr','priceChange','takerFlow','longReturns','odds']},
    orderFlow:{label:'大单侦探',enLabel:'Whale Detective',description:'跟着主动买卖和盘口走，但 15/60 分钟大势都反对时不跟单。',enDescription:'Follow active flow and the order book, but stand down when both the 15m and 60m backdrop oppose the trade.',actionUrge:65,emotionSensitivity:35,emotionLabel:'连败后要更多证据',enEmotionLabel:'Demands stronger evidence after losses.',emotion:{winStake:.07,lossStake:-.15,winConfidence:0,lossConfidence:1.2},variance:35,minConfidence:74,baseStakePct:5,maxStakePct:15,required:['takerFlow','orderbook','spread','priceChange','longReturns','odds']},
    volatilityGuard:{label:'稳如老狗',enLabel:'Steady Dog',description:'只在波动安静、长短线同向时下注；15/60 分钟有反对票就继续趴着。',enDescription:'Bet only in calm volatility when short and long signals align; any 15m/60m opposition means stay put.',actionUrge:40,emotionSensitivity:5,emotionLabel:'几乎不受连胜连败影响',enEmotionLabel:'Is almost unaffected by streaks.',emotion:{winStake:.02,lossStake:-.03,winConfidence:0,lossConfidence:.2},variance:15,minConfidence:78,baseStakePct:5,maxStakePct:10,required:['atr','volatility','ema','priceChange','orderbook','longReturns','odds']},
    consensus:{label:'六票战神',enLabel:'Six-Vote Warrior',description:'六个短线信号先投票，15/60 分钟大势再当总裁判；强烈反对就不押。',enDescription:'Let six short signals vote, then use the 15m/60m backdrop as the final referee; strong opposition forces a skip.',actionUrge:55,emotionSensitivity:20,emotionLabel:'连败后要更多人同意',enEmotionLabel:'Demands more agreement after losses.',emotion:{winStake:.04,lossStake:-.12,winConfidence:0,lossConfidence:1.2},variance:25,minConfidence:78,baseStakePct:5,maxStakePct:15,required:['priceChange','ema','macd','rsi','orderbook','takerFlow','longReturns','odds']},
    priceAction:{label:'蜡烛哥',enLabel:'Candlestick Bro',description:'裸K版10U战神：吞没、长影线、两连阳阴或大实体K线，抓到明确形态就敢上；多空明显打架才停手。',enDescription:'The raw-candle 10U Warrior: act on a clear engulfing bar, rejection wick, two-candle run, range break or forceful candle body without waiting for several patterns. Stand down when bullish and bearish evidence strongly conflict.',actionUrge:85,emotionSensitivity:55,emotionLabel:'连胜越看越准，连败容易死磕形态',enEmotionLabel:'Gets cockier after wins and may overtrust a pattern after losses.',emotion:{winStake:.12,lossStake:.08,winConfidence:-.3,lossConfidence:-.25},variance:78,minConfidence:60,baseStakePct:7,maxStakePct:20,required:['candles','odds']},
    czBrother:{label:'CZ大表哥',enLabel:'CZ Big Bro',description:'只做多 BTC 和 BNB；手痒越高越早尝试上涨机会，确认不足只下小注，强烈逆风仍等待。',enDescription:'Long-only BTC and BNB. Higher action urge allows earlier bullish probes with small stakes; strong opposing trends still mean wait.',actionUrge:62,emotionSensitivity:25,emotionLabel:'趋势确认后才加仓',enEmotionLabel:'Adds only after trend confirmation.',emotion:{winStake:.12,lossStake:-.1,winConfidence:-.2,lossConfidence:.6},variance:35,minConfidence:72,baseStakePct:8,maxStakePct:20,required:['atr','spread','priceChange','ema','macd','adx','volume','orderbook','longReturns','odds']},
    contrarian:{label:'逆行者',enLabel:'Contrarian',description:'综合对手近20笔战绩、方向偏好与追注习惯，反押加权多数；多人持续亏损且方向一致时加码。',enDescription:'Combine peers’ last 20 settled bets, direction preferences and loss-chasing habits. Fade the weighted majority; increase stakes when multiple losing peers agree.',actionUrge:48,emotionSensitivity:30,emotionLabel:'别人越输越想反着押',enEmotionLabel:'Fades the crowd after repeated losses.',emotion:{winStake:.08,lossStake:.05,winConfidence:-.2,lossConfidence:-.2},variance:30,minConfidence:76,baseStakePct:6,maxStakePct:30,required:['atr','spread','priceChange','orderbook','longReturns','odds']},
    showoff:{label:'装逼的人',enLabel:'Show-off',description:'只和 CZ大表哥做对手盘；没有 CZ 的有效下注就观望。',enDescription:'Trade only against CZ Big Bro; if CZ has no valid bet, stand down.',actionUrge:70,emotionSensitivity:75,emotionLabel:'专挑CZ的方向唱反调',enEmotionLabel:'Loves taking the opposite side of CZ.',emotion:{winStake:.2,lossStake:.12,winConfidence:-.4,lossConfidence:-.3},variance:65,minConfidence:68,baseStakePct:10,maxStakePct:20,required:['atr','spread','priceChange','ema','orderbook','odds']},
    firstLady:{label:'一姐',enLabel:'First Lady',description:'沿用 CZ大表哥的趋势与流动性框架，但更果断、更激进；只做多 BTC 和 BNB。',enDescription:'Uses CZ Big Bro’s trend and liquidity framework with a bolder, more aggressive temperament; long-only BTC and BNB.',actionUrge:78,emotionSensitivity:55,emotionLabel:'确认趋势后更敢追击',enEmotionLabel:'Presses harder once the trend is confirmed.',emotion:{winStake:.3,lossStake:-.05,winConfidence:-.4,lossConfidence:.3},variance:55,minConfidence:68,baseStakePct:12,maxStakePct:30,required:['atr','spread','priceChange','ema','macd','adx','volume','orderbook','longReturns','odds']},
  };
  // Each personality gets its own confidence ruler and three-step betting ladder.
  // This deliberately keeps the last mile from flattening distinct entry rules.
  const decisionShapes = {
    kzgMask:{confidence:{base:49,scoreWeight:5.8,varianceWeight:.02},stakeTiers:[8,14,20],tierConfidence:[78,88],personalitySwing:1.5},
    sunBrother:{confidence:{base:49,scoreWeight:5.7,varianceWeight:.02},stakeTiers:[10,15,25],tierConfidence:[80,90],personalitySwing:2},
    liangXi:{confidence:{base:48,scoreWeight:5.5,varianceWeight:.015},stakeTiers:[50,50,50],tierConfidence:[80,90],personalitySwing:1},
    fengShui:{confidence:{base:49,scoreWeight:5.3,varianceWeight:.02},stakeTiers:[10,10,10],tierConfidence:[70,82],personalitySwing:1.5},
    diviner:{confidence:{base:48,scoreWeight:5.4,varianceWeight:.04},stakeTiers:[10,10,10],tierConfidence:[71,83],personalitySwing:2.5},
    aggressive:{confidence:{base:47,scoreWeight:5.4,varianceWeight:.09},stakeTiers:[20,40,60],tierConfidence:[74,86],personalitySwing:5},
    smart:{confidence:{base:50,scoreWeight:5.8,varianceWeight:.025},stakeTiers:[10,20,30],tierConfidence:[78,88],personalitySwing:2.2},
    conservative:{confidence:{base:52,scoreWeight:5.5,varianceWeight:.01},stakeTiers:[5,7,10],tierConfidence:[84,91],personalitySwing:.8},
    trendFollowing:{confidence:{base:48,scoreWeight:5.6,varianceWeight:.025},stakeTiers:[8,14,20],tierConfidence:[78,87],personalitySwing:2.5},
    meanReversion:{confidence:{base:49,scoreWeight:5.5,varianceWeight:.015},stakeTiers:[5,10,15],tierConfidence:[79,88],personalitySwing:2},
    breakout:{confidence:{base:47,scoreWeight:6,varianceWeight:.035},stakeTiers:[8,14,20],tierConfidence:[78,88],personalitySwing:3},
    orderFlow:{confidence:{base:48,scoreWeight:5.8,varianceWeight:.025},stakeTiers:[5,10,15],tierConfidence:[79,88],personalitySwing:2.2},
    volatilityGuard:{confidence:{base:52,scoreWeight:5.5,varianceWeight:.008},stakeTiers:[5,7,10],tierConfidence:[84,91],personalitySwing:.6},
    consensus:{confidence:{base:50,scoreWeight:6.1,varianceWeight:.015},stakeTiers:[5,10,15],tierConfidence:[82,91],personalitySwing:1.5},
    priceAction:{confidence:{base:48,scoreWeight:5.9,varianceWeight:.03},stakeTiers:[7,12,20],tierConfidence:[78,88],personalitySwing:3},
    czBrother:{confidence:{base:49,scoreWeight:5.8,varianceWeight:.02},stakeTiers:[8,14,20],tierConfidence:[78,88],personalitySwing:2},
    contrarian:{confidence:{base:50,scoreWeight:5.7,varianceWeight:.02},stakeTiers:[6,10,15],tierConfidence:[80,90],personalitySwing:1.5},
    showoff:{confidence:{base:48,scoreWeight:5.9,varianceWeight:.05},stakeTiers:[10,15,20],tierConfidence:[74,86],personalitySwing:3.5},
    firstLady:{confidence:{base:48,scoreWeight:6,varianceWeight:.04},stakeTiers:[12,20,30],tierConfidence:[74,85],personalitySwing:3},
  };
  // A 10U game can place the existing 1U minimum without exceeding these 10% caps.
  profiles.fengShui.baseStakePct = profiles.diviner.baseStakePct = 10;
  Object.entries(profiles).forEach(([key, profile]) => Object.assign(profile, {
    key,
    allowAllIn:profile.allowAllIn ?? false,
    allInConfidence:profile.allInConfidence ?? 101,
    normalMaxStakePct:profile.normalMaxStakePct ?? profile.maxStakePct,
    actionUrge:profile.actionUrge ?? 50,
    emotionSensitivity:profile.emotionSensitivity ?? 0,
    emotion:profile.emotion || {winStake:0,lossStake:0,winConfidence:0,lossConfidence:0},
    required:profile.required || [],
    recommended:profile.recommended || profile.required || defaultIndicators,
    confidence:decisionShapes[key]?.confidence || decisionShapes.smart.confidence,
    stakeTiers:decisionShapes[key]?.stakeTiers || decisionShapes.smart.stakeTiers,
    tierConfidence:decisionShapes[key]?.tierConfidence || decisionShapes.smart.tierConfidence,
    personalitySwing:decisionShapes[key]?.personalitySwing ?? decisionShapes.smart.personalitySwing,
  }));

  const coreStrategies = ['aggressive','smart','conservative','liangXi'];
  const characterStrategies = ['czBrother','contrarian','showoff','firstLady','kzgMask','sunBrother'];
  const decisionStage = strategy => strategy === 'contrarian' ? 2 : strategy === 'showoff' ? 1 : 0;
  const supportsAsset = (strategy, coin) => !['czBrother','firstLady'].includes(strategy) || ['BTC','BNB'].includes(String(coin).replace(/USDT$/, ''));
  function peerPerformance(history, current, investedCapital) {
    const completed=history.filter(o=>['WON','LOST','SPLIT'].includes(o.status)),window=completed.slice(0,20);
    const financialRow=o=>['UP','DOWN'].includes(o.direction)&&Number.isFinite(o.amount)&&o.amount>0&&
      (Number.isFinite(o.payout)&&o.payout>=0||o.status==='LOST'&&o.payout==null)?{...o,profit:(o.payout??0)-o.amount}:null;
    const recent=window.map(financialRow),all=completed.map(financialRow);
    const rows=recent.filter(Boolean);
    const summarize=items=>{
      const staked=items.reduce((sum,o)=>sum+o.amount,0),netProfit=items.reduce((sum,o)=>sum+o.profit,0);
      const wins=items.filter(o=>o.profit>0).length,losses=items.filter(o=>o.profit<0).length;
      return {count:items.length,staked,netProfit,returnPct:staked?100*netProfit/staked:null,wins,losses,
        winRate:wins+losses?wins/(wins+losses):null,averageStake:items.length?staked/items.length:null};
    };
    let afterLossBets=0,afterLossRaises=0;
    for(let i=0;i<recent.length-1;i++)if(recent[i]&&recent[i+1]?.profit<0){afterLossBets++;if(recent[i].amount>recent[i+1].amount*1.05)afterLossRaises++;}
    const up=rows.filter(o=>o.direction==='UP'),down=rows.filter(o=>o.direction==='DOWN');
    const cumulativeNetProfit=all.every(Boolean)?all.reduce((sum,o)=>sum+o.profit,0):null;
    const capitalLossPct=Number.isFinite(investedCapital)&&investedCapital>0&&cumulativeNetProfit!==null?Math.max(0,-cumulativeNetProfit)/investedCapital*100:null;
    return {window:20,complete:rows.length===window.length,unknownCount:window.length-rows.length,...summarize(rows),investedCapital,cumulativeNetProfit,capitalLossPct,byDirection:{UP:summarize(up),DOWN:summarize(down)},
      habits:{upShare:rows.length?up.length/rows.length:null,downShare:rows.length?down.length/rows.length:null,
        afterLossBets,afterLossRaises,afterLossRaiseRate:afterLossBets?afterLossRaises/afterLossBets:null,
        currentlyChasingLoss:Boolean(current&&recent[0]?.profit<0&&current.amount>recent[0].amount*1.05)}};
  }
  function countertradeLossAssessment(peer) {
    const p=peer.performance,streak=Number(peer.lossStreak)||0;
    const lossReturn=p?.complete!==false&&p?.count>=3&&p.netProfit<0?p.returnPct:0;
    const capitalLoss=Number.isFinite(p?.capitalLossPct)?p.capitalLossPct:0;
    const severity=capitalLoss>=50||lossReturn<=-60||streak>=4?3:capitalLoss>=30||lossReturn<=-35||streak>=3?2:capitalLoss>=15||lossReturn<=-15||streak>=2?1:0;
    const side=p?.byDirection?.[peer.order?.direction];
    const repeatsLosingDirection=Boolean(p?.complete!==false&&side?.count>=3&&side.netProfit<0&&side.winRate<=.4);
    return {severity,repeatsLosingDirection,chasingLoss:Boolean(p?.habits?.currentlyChasingLoss)};
  }
  // Histories contain only outcomes known at observation time; current orders are actual fills.
  function peerSnapshot(agents, roundId, asset, observedAt, initialBalance) {
    return {roundId:String(roundId),asset,observedAt,agents:agents.map(agent=>{
      const orders=agent.orders||[],history=orders.filter(o=>Number(o.start)<Number(roundId)).sort((a,b)=>b.start-a.start);
      let lossStreak=0;
      for(const o of history){if(o.status!=='LOST'||!Number.isFinite(o.settledAt)||o.settledAt>observedAt)break;lossStreak++;}
      const current=orders.find(o=>String(o.start)===String(roundId)&&o.status==='OPEN'&&(!Number.isFinite(o.placedAt)||o.placedAt<=observedAt));
      const known=history.filter(o=>Number.isFinite(o.settledAt)&&o.settledAt<=observedAt);
      const invested=Number.isFinite(initialBalance)&&initialBalance>0?initialBalance+(Number.isFinite(agent.addedCapital)?agent.addedCapital:0):null;
      return {id:agent.id,name:agent.policy?.name,strategy:agent.policy?.strategy,lossStreak,performance:peerPerformance(known,current,invested),order:current?{id:current.id,direction:current.direction,amount:current.amount}:null};
    })};
  }
  function eligibleCountertradePeers(strategy, actionUrge, context={}) {
    const requiredLosses=strategy==='showoff'?0:Number(actionUrge)>=100?0:Number(actionUrge)>=70?1:2;
    const peers=context.peers;
    const current=Boolean(peers&&peers.roundId===String(context.roundId)&&peers.asset===context.asset&&Array.isArray(peers.agents));
    const candidates=current?peers.agents.filter(a=>a.id!==context.agentId&&a.order&&['UP','DOWN'].includes(a.order.direction)&&Number.isFinite(a.order.amount)&&a.order.amount>0&&(strategy==='showoff'?a.strategy==='czBrother':a.strategy!=='contrarian')):[];
    const assessed=candidates.map(a=>({...a,lossAssessment:countertradeLossAssessment(a)}));
    const useHistory=strategy==='contrarian'&&assessed.some(a=>a.lossAssessment.severity>0);
    const eligible=strategy==='showoff'||useHistory?assessed:assessed.filter(a=>a.lossStreak>=requiredLosses);
    const amounts=eligible.map(a=>a.order.amount).sort((a,b)=>a-b),middle=Math.floor(amounts.length/2);
    const median=amounts.length?(amounts.length%2?amounts[middle]:(amounts[middle-1]+amounts[middle])/2):1;
    const targets=eligible.map(a=>{
      const loss=a.lossAssessment;
      const historyWeight=loss.severity?1+loss.severity:a.performance?.complete!==false&&a.performance?.count>=3&&a.performance.netProfit>=0?.5:1;
      const habitWeight=(loss.repeatsLosingDirection?1.25:1)*(loss.chasingLoss?1.15:1);
      return {...a,voteWeight:useHistory?historyWeight*habitWeight*clamp(Math.sqrt(a.order.amount/median),.5,1.5):a.order.amount};
    });
    const sum=(direction,key)=>targets.filter(a=>a.order.direction===direction).reduce((s,a)=>s+(key==='stake'?a.order.amount:a.voteWeight),0);
    const up=sum('UP'),down=sum('DOWN'),losers=targets.filter(a=>a.lossAssessment.severity>0);
    const lossBreadth=targets.length?losers.length/targets.length:0,agreement=up+down?Math.abs(up-down)/(up+down):0;
    const losingUp=losers.filter(a=>a.order.direction==='UP').reduce((s,a)=>s+a.voteWeight,0),losingDown=losers.filter(a=>a.order.direction==='DOWN').reduce((s,a)=>s+a.voteWeight,0);
    const losingAgreement=losingUp+losingDown?Math.abs(losingUp-losingDown)/(losingUp+losingDown):0;
    const averageSeverity=losers.length?losers.reduce((s,a)=>s+a.lossAssessment.severity,0)/losers.length:0;
    let stakeMultiplier=1;
    if(useHistory&&losers.length>=2&&lossBreadth>=.5&&agreement>=.5&&losingAgreement>=.5&&(up-down)*(losingUp-losingDown)>0){
      stakeMultiplier=lossBreadth>=.75&&averageSeverity>=2.5&&agreement>=.75?2:
        lossBreadth>=2/3&&averageSeverity>=1.5&&agreement>=.6?1.5:1.25;
    }
    return {current,requiredLosses,targets,up,down,upStake:sum('UP','stake'),downStake:sum('DOWN','stake'),
      mode:strategy==='showoff'?'cz-only':useHistory?'loss-history':'crowd-fallback',losingCount:losers.length,lossBreadth,agreement,losingAgreement,averageSeverity,stakeMultiplier};
  }
  function evaluateCharacter(strategy,snapshot={},actionUrge,context={}) {
    if(!characterStrategies.includes(strategy))return null;
    const wait=reason=>({score:0,factors:[{name:'character_gate',value:reason,impact:'NEUTRAL'}],regime:'waiting'});
    const profile=profiles[strategy];
    if(!supportsAsset(strategy,context.asset))return wait('BTC_BNB_ONLY');
    if(profile.required.filter(k=>k!=='odds').some(k=>!complete(snapshot[indicators[k].snapshotKey])))return wait('MISSING_INPUT');
    if(snapshot.spread.basisPoints>8||snapshot.atr.percent>1.2)return wait('MARKET_RISK');
    if(strategy==='sunBrother'){
      const sign=v=>v>0?1:v<0?-1:0, e=snapshot.ema, a=snapshot.adx;
      const votes=[sign(e.ema5-e.ema20),sign(snapshot.macd.histogram),sign(a.plusDI-a.minusDI),snapshot.rsi14>54?1:snapshot.rsi14<46?-1:0,sign(snapshot.longReturns.fifteenMinutes),sign(snapshot.longReturns.sixtyMinutes)];
      const up=votes.filter(v=>v>0).length,down=votes.filter(v=>v<0).length;
      if(a.adx<20||snapshot.volumeRatio<1||snapshot.atr.percent>.8||Math.max(up,down)<4||Math.min(up,down)>0)return wait('TECHNICAL_CONSENSUS_UNCLEAR');
      const score=(up>down?-1:1)*(Math.max(up,down)===6?6:5.2);
      return {score,factors:[{name:'inverse_technical_consensus',value:JSON.stringify({up,down,technicalDirection:up>down?'UP':'DOWN'}),impact:score>0?'UP':'DOWN'}],regime:'inverse-technical'};
    }
    if(strategy==='kzgMask'){
      const style=context.styleId||'original', d=snapshot.donchian, e=snapshot.ema, a=snapshot.adx;
      const adxMin=style==='sniper'?25:style==='wild'?18:20,volumeMin=style==='sniper'?1.3:style==='wild'?1:1.1;
      const direct=d.close>d.upper?1:d.close<d.lower?-1:0;
      const previous=d.previous;
      const confirmed=previous&&previous.close>previous.upper&&d.close>previous.upper?1:previous&&previous.close<previous.lower&&d.close<previous.lower?-1:0;
      const side=style==='sniper'?confirmed:direct||confirmed;
      if(!side||a.adx<adxMin||snapshot.volumeRatio<volumeMin||snapshot.atr.percent>.8)return wait('WAIT_FOR_STRUCTURE_CONFIRMATION');
      const long=longHorizonContext(snapshot);
      if(Math.sign(e.ema5-e.ema20)!==side||Math.sign(a.plusDI-a.minusDI)!==side||long.opposition(side)===2||(style==='trend'&&long.support(side)<2))return wait('STRUCTURE_TREND_CONFLICT');
      if(Math.sign(snapshot.takerFlow.buyRatio-.5)!==side&&Math.sign(snapshot.spotOrderBookImbalance)!==side)return wait('STRUCTURE_FLOW_MISSING');
      return {score:side*(confirmed?6:5.2),factors:[{name:'confirmed_range_break',value:JSON.stringify({style,side,confirmed:Boolean(confirmed),upper:d.upper,lower:d.lower,close:d.close}),impact:side>0?'UP':'DOWN'}],regime:'structure-confirmation'};
    }
    if(strategy==='czBrother'||strategy==='firstLady'){
      const bold=strategy==='firstLady',urge=clamp(Number(actionUrge??profile.actionUrge),0,100)/100;
      const long=longHorizonContext(snapshot),p=snapshot.priceChangePct,e=snapshot.ema,a=snapshot.adx;
      const votes=[p.oneMinute>.01,p.fiveMinutes>.02,e.ema5>e.ema20,snapshot.macd.histogram>0,a.plusDI>a.minusDI,snapshot.spotOrderBookImbalance>.03,long.fifteen>0,long.sixty>0];
      const count=votes.filter(Boolean).length;
      const minimum=Math.ceil((bold?6:8)-urge*4);
      const early=urge>=.7&&p.fiveMinutes>0&&long.opposition(1)<2;
      if(p.fiveMinutes<=0||(!early&&e.ema5<=e.ema20)||long.opposition(1)>(bold?1:urge>=.85?1:0)||a.adx<(bold?22:28)-urge*12||snapshot.volumeRatio<(bold?1:1.1)-urge*.5||count<minimum)return wait('WAIT_FOR_BULL_TREND');
      const probe=count<(bold?5:7)||e.ema5<=e.ema20;
      return {score:probe?3:count===8?6.5:count>=7?6:5.2,probe,factors:[{name:'long_only_trend',value:`${count}/8`,impact:'UP'}],regime:probe?'long-only-probe':'long-only'};
    }
    const collective=eligibleCountertradePeers(strategy,actionUrge??profile.actionUrge,context);
    const {current,targets,up,down}=collective;
    if(!current)return wait('NO_CURRENT_PEERS');
    if(!targets.length)return wait(strategy==='showoff'?'CZ_NOT_BETTING':'NO_LOSING_PEERS');
    if(Math.abs(up-down)<1e-8)return wait('PEERS_TIED');
    const sign=up>down?-1:1;
    return {score:sign*(5+Math.abs(up-down)/(up+down)),probe:strategy==='contrarian'&&collective.stakeMultiplier===1&&targets.some(a=>a.lossStreak<2),factors:[{name:'peer_countertrade',value:JSON.stringify({targets:targets.map(a=>({id:a.id,orderId:a.order.id,lossStreak:a.lossStreak,weight:a.voteWeight,severity:a.lossAssessment.severity})),up,down,losingCount:collective.losingCount,agreement:collective.agreement,stakeMultiplier:collective.stakeMultiplier}),impact:sign>0?'UP':'DOWN'}],regime:'countertrade'};
  }
  const divinationStrategies = ['fengShui','diviner'];
  const oracleSymbols = [['乾','Heaven'],['坤','Earth'],['震','Thunder'],['巽','Wind'],['坎','Water'],['离','Fire'],['艮','Mountain'],['兑','Lake']];
  const oracleElements = [['木','Wood'],['火','Fire'],['土','Earth'],['金','Metal'],['水','Water']];
  // Game-specific card meanings, not a claim about traditional divination or market probability.
  const oracleCards = [['太阳','Sun',1],['月亮','Moon',-1],['高塔','Tower',-1],['星星','Star',1],['战车','Chariot',1],['隐者','Hermit',0],['命运之轮','Wheel',1],['节制','Balance',0]];
  function describeOracleDraw(system, draw) {
    if (system === 'fengShui') return {
      upper: {id:draw.upper, name:oracleSymbols[draw.upper][1]},
      lower: {id:draw.lower, name:oracleSymbols[draw.lower][1]},
      element: {id:draw.element, name:oracleElements[draw.element][1]},
    };
    return {cards:draw.cards.map(({card,reversed},index)=>({id:card,name:oracleCards[card][1],position:['backdrop','present tension','next action'][index],orientation:reversed?'reversed':'upright',gameVote:oracleCards[card][2]*(reversed?-1:1)}))};
  }
  function canonical(value) {
    if (value && typeof value === 'object') return Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : `{${Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')}}`;
    return JSON.stringify(value);
  }
  function evaluateDivination(strategy, snapshot={}, {roundId,asset='BTCUSDT',frozenReading=null,actionUrge=profiles[strategy]?.actionUrge}={}) {
    if (!divinationStrategies.includes(strategy)) return null;
    const required=profiles[strategy].required;
    if (roundId==null || String(roundId)==='' || required.some(key=>!complete(snapshot[indicators[key].snapshotKey]))) return {score:0,factors:[],regime:'missing',divination:null};
    const values=Object.fromEntries(required.map(key=>[key,snapshot[indicators[key].snapshotKey]]));
    let hash=2166136261;
    for (const char of canonical({version:1,strategy,roundId:String(roundId),asset,values})) { hash^=char.charCodeAt(0); hash=Math.imul(hash,16777619); }
    let seed=(hash>>>0).toString(16).padStart(8,'0'); let state=(hash>>>0)||1;
    const next=n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)%n;};
    let omen=0,draw;
    if(frozenReading && frozenReading.system===strategy && frozenReading.roundId===String(roundId) && frozenReading.asset===asset) {
      seed=frozenReading.seed; draw=JSON.parse(JSON.stringify(frozenReading.draw));
      omen=frozenReading.omen==='UP'?1:frozenReading.omen==='DOWN'?-1:0;
    } else if(strategy==='fengShui') {
      const upper=next(8),lower=next(8),element=next(5);
      const symbolVote=[1,-1,1,1,-1,1,0,-1][upper]+[1,-1,1,1,-1,1,0,-1][lower];
      // On a tied pair, the already-drawn element breaks the tie; never reroll.
      omen=Math.sign(symbolVote || [1,1,0,-1,-1][element]);
      draw={upper,lower,element};
    } else {
      const deck=oracleCards.map((_,index)=>index),cards=[];
      for(let index=0;index<3;index++){const card=deck.splice(next(deck.length),1)[0],reversed=Boolean(next(2));cards.push({card,reversed});omen+=oracleCards[card][2]*(reversed?-1:1);}
      omen=Math.sign(omen);draw={cards};
    }
    const votes=[direction(snapshot.priceChangePct.fiveMinutes,.02),direction(snapshot.rsi14-50,4),direction(snapshot.ema.ema5-snapshot.ema.ema20),direction(snapshot.spotOrderBookImbalance,.03)];
    const urge=clamp(Number(actionUrge)||0,0,100);
    // Keep the original draw and omen. A neutral draw may consult market votes;
    // this is a small market-led probe, never a new card draw.
    const marketVote=Math.sign(votes.reduce((sum,v)=>sum+v,0));
    const choice=omen||((urge>=80&&votes.filter(v=>v===marketVote).length>=2)?marketVote:0);
    const support=votes.filter(value=>choice&&value===choice).length,opposition=votes.filter(value=>choice&&value===-choice).length;
    const safe=snapshot.atr.percent<=.8&&snapshot.spread.basisPoints<=8;
    const longOpposition=longHorizonContext(snapshot).opposition(choice);
    const aligned=Boolean(choice&&safe&&support>=1&&opposition<=(urge>=85?3:2)&&(longOpposition<2||(support>=2&&opposition<=1)));
    const probe=aligned&&(!omen||opposition>2);
    const divination={version:1,system:strategy,seed,roundId:String(roundId),asset,draw,draw_details:describeOracleDraw(strategy,draw),omen:omen>0?'UP':omen<0?'DOWN':'WAIT',verdict:aligned?(choice>0?'UP':'DOWN'):'WAIT',support,opposition,simulated:true};
    return {score:aligned?choice*(4.4+support*.3):0,probe,regime:aligned?(!omen?'oracle-market-probe':'oracle-aligned'):'oracle-wait',divination,
      factors:[{name:'indicator_seed',value:seed,impact:'NEUTRAL'},{name:'oracle',value:JSON.stringify(draw),impact:divination.omen==='WAIT'?'NEUTRAL':divination.omen},{name:'market_alignment',value:`${support}/${votes.length}; opposed=${opposition}; safe=${safe}`,impact:aligned?divination.verdict:'NEUTRAL'}]};
  }
  function formatDivination(reading, locale='zh') {
    if(!reading)return '';
    const en=!String(locale).startsWith('zh'),pick=item=>item[en?1:0];
    const draw=reading.system==='fengShui'
      ? `${pick(oracleSymbols[reading.draw.upper])} / ${pick(oracleSymbols[reading.draw.lower])} · ${pick(oracleElements[reading.draw.element])}`
      : reading.draw.cards.map(({card,reversed})=>`${pick(oracleCards[card])}${en?(reversed?' reversed':' upright'):(reversed?'逆位':'正位')}`).join(' · ');
    const finalVerdict=reading.finalVerdict||reading.verdict;
    const verdict=finalVerdict==='UP'?(en?'UP':'看涨'):finalVerdict==='DOWN'?(en?'DOWN':'看跌'):(en?'WAIT':'观望');
    return `${draw} → ${verdict}`;
  }
  const finite = value => Number.isFinite(Number(value));
  const complete = value => typeof value==='number'?Number.isFinite(value):Array.isArray(value)?value.length>0&&value.every(complete):value!==null&&typeof value==='object'&&Object.keys(value).length>0&&Object.values(value).every(complete);
  const direction = (value, deadband=0) => finite(value) && Math.abs(Number(value)) > deadband ? Math.sign(Number(value)) : 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function longHorizonContext(snapshot={}) {
    const returns=snapshot.longReturns||{};
    const fifteen=direction(returns.fifteenMinutes,.06),sixty=direction(returns.sixtyMinutes,.15);
    const bias=fifteen===sixty?fifteen:fifteen===0?sixty:sixty===0?fifteen:0;
    return {
      fifteen,sixty,bias,
      support:sign=>[fifteen,sixty].filter(value=>value===sign).length,
      opposition:sign=>[fifteen,sixty].filter(value=>value===-sign).length,
    };
  }
  function effectiveActionUrge(personalValue, battleValue=0) {
    const personal=clamp(Number.isFinite(Number(personalValue))?Math.round(Number(personalValue)):50,0,100);
    const battle=clamp(Number.isFinite(Number(battleValue))?Math.round(Number(battleValue)):0,0,100);
    return personal+(100-personal)*battle/100;
  }

  function evaluatePriceAction(strategy, candleWindow={}, actionUrge) {
    if(strategy!=='priceAction')return null;
    const bars=Array.isArray(candleWindow?.bars)?candleWindow.bars:[];
    if(bars.length<8||bars.some(bar=>![bar.openTime,bar.closeTime,bar.open,bar.high,bar.low,bar.close].every(Number.isFinite)))return {score:0,factors:[],regime:'missing'};
    const urge=bounded(actionUrge,profiles.priceAction.actionUrge,0,100)/100,last=bars.at(-1),previous=bars.at(-2),recent=bars.slice(-3),prior=bars.slice(-9,-1);
    const shape=bar=>{const range=bar.high-bar.low,body=bar.close-bar.open,absolute=Math.abs(body);return {sign:direction(body),range,body:absolute,bodyRatio:range>0?absolute/range:0,upper:bar.high-Math.max(bar.open,bar.close),lower:Math.min(bar.open,bar.close)-bar.low};};
    const latest=shape(last),before=shape(previous);
    const engulf=latest.sign>0&&before.sign<0&&last.open<=previous.close&&last.close>=previous.open?1:latest.sign<0&&before.sign>0&&last.open>=previous.close&&last.close<=previous.open?-1:0;
    const wick=latest.range>0&&latest.bodyRatio<=.48+(urge*.12)&&latest.lower>=Math.max(latest.body,latest.upper)*1.8?1:latest.range>0&&latest.bodyRatio<=.48+(urge*.12)&&latest.upper>=Math.max(latest.body,latest.lower)*1.8?-1:0;
    const priorHigh=Math.max(...prior.map(bar=>bar.high)),priorLow=Math.min(...prior.map(bar=>bar.low));
    const breakout=latest.bodyRatio>=.42-urge*.12&&last.close>priorHigh?1:latest.bodyRatio>=.42-urge*.12&&last.close<priorLow?-1:0;
    const upStructure=recent.every((bar,index)=>!index||bar.close>recent[index-1].close)&&recent.at(-1).high>recent[0].high;
    const downStructure=recent.every((bar,index)=>!index||bar.close<recent[index-1].close)&&recent.at(-1).low<recent[0].low;
    const structure=upStructure?1:downStructure?-1:0;
    const runBars=urge>=.35?recent.slice(-2):recent;
    const run=runBars.every(bar=>shape(bar).sign>0&&shape(bar).bodyRatio>=.3-urge*.12)?1:runBars.every(bar=>shape(bar).sign<0&&shape(bar).bodyRatio>=.3-urge*.12)?-1:0;
    const averageBody=prior.reduce((sum,bar)=>sum+shape(bar).body,0)/prior.length;
    const drive=latest.bodyRatio>=.65-urge*.12&&latest.body>0&&latest.body>=averageBody*(1.15-urge*.3)?latest.sign:0;
    const signals=[['engulfing',engulf,2.6],['rejection_wick',wick,2.2],['range_break',breakout,2.6],['three_bar_structure',structure,1.5],['candle_run',run,1.8],['body_drive',drive,2.2]];
    const positive=signals.filter(([,sign])=>sign>0).reduce((sum,[,,weight])=>sum+weight,0),negative=signals.filter(([,sign])=>sign<0).reduce((sum,[,,weight])=>sum+weight,0);
    const vote=positive>negative?1:negative>positive?-1:0,support=Math.max(positive,negative),opposition=Math.min(positive,negative),minimum=2.4-urge*1.1;
    // A single strong candle pattern can be enough; equally strong opposition cannot.
    const accepted=vote&&support>=minimum&&support-opposition>=1.4&&opposition<=support*.6;
    const score=accepted?vote*(support>=5?6:support>=3.5?5.2:4.6):0;
    const factors=signals.map(([name,sign])=>({name,value:String(sign),impact:sign>0?'UP':sign<0?'DOWN':'NEUTRAL'}));
    factors.push({name:'candle_interval_minutes',value:String(candleWindow.intervalMinutes),impact:'NEUTRAL'});
    return {score,factors,regime:accepted?'raw-price-action':'conflict-or-no-pattern'};
  }
  function evaluateCoreStrategy(strategy, snapshot = {}, actionUrge) {
    if (!coreStrategies.includes(strategy)) return null;
    if(strategy==='liangXi') {
      // Persona design, not a reconstruction of the person's private trading system.
      // Reuse the regime/quality checks; require short pressure and flow to agree.
      const signal=evaluateCoreStrategy('smart',snapshot,actionUrge);
      if(!signal.score)return signal;
      const sign=Math.sign(signal.score),price=snapshot.priceChangePct||{};
      const votes=[direction(price.oneMinute,.01),direction(snapshot.spotOrderBookImbalance,.03),direction((snapshot.takerFlow?.buyRatio??.5)-.5,.04)];
      const aligned=votes.filter(v=>v===sign).length,opposed=votes.filter(v=>v===-sign).length;
      const long=longHorizonContext(snapshot);
      const accepted=aligned>=2&&opposed===0&&long.opposition(sign)<2;
      return {...signal,score:accepted?sign*Math.min(8,Math.abs(signal.score)):0,
        factors:[...signal.factors,{name:'liangxi_entry_confirmation',value:`${aligned}/3`,impact:accepted?(sign>0?'UP':'DOWN'):'NEUTRAL'}]};
    }
    const profile=profiles[strategy],urge=clamp(Number.isFinite(Number(actionUrge))?Number(actionUrge):profile.actionUrge,0,100)/100;
    const required=strategy==='aggressive'
      ? [snapshot.priceChangePct,snapshot.momentum,snapshot.roc,snapshot.volumeRatio,snapshot.takerFlow,snapshot.spotOrderBookImbalance,snapshot.longReturns]
      : strategy==='smart'
        ? [snapshot.priceChangePct,snapshot.rsi14,snapshot.ema,snapshot.macd,snapshot.adx,snapshot.bollinger,snapshot.atr,snapshot.volatility,snapshot.volumeRatio,snapshot.takerFlow,snapshot.spotOrderBookImbalance,snapshot.spread,snapshot.longReturns]
        : [snapshot.priceChangePct,snapshot.rsi14,snapshot.ema,snapshot.adx,snapshot.atr,snapshot.volatility,snapshot.spread,snapshot.spotOrderBookImbalance,snapshot.longReturns];
    if(required.some(value=>!complete(value))) {
      return {score:0,factors:[],regime:'missing'};
    }
    const price=snapshot.priceChangePct||{},ema=snapshot.ema||{},long=longHorizonContext(snapshot),p1=direction(price.oneMinute,0.01),p5=direction(price.fiveMinutes,0.02),
      emaVote=direction(Number(ema.ema5)-Number(ema.ema20)),book=direction(snapshot.spotOrderBookImbalance,0.03),rsiTrend=direction(Number(snapshot.rsi14)-50,4);
    const factors=[];
    const record=(name,value,vote,weight=1)=>{
      factors.push({name,value:String(value),impact:vote>0?'UP':vote<0?'DOWN':'NEUTRAL'});
      return vote*weight;
    };
    let score=0,regime='fast';
    if(strategy==='aggressive'){
      const momentumVote=direction(snapshot.momentum),rocVote=direction(snapshot.roc.tenMinutes,0.03),takerVote=direction(snapshot.takerFlow.buyRatio-0.5,0.04),volume=Number(snapshot.volumeRatio);
      score+=record('price_1m',Number(price.oneMinute).toFixed(4),p1,2.2);
      score+=record('price_5m',Number(price.fiveMinutes).toFixed(4),p5,1.2);
      score+=record('momentum_10',Number(snapshot.momentum).toFixed(4),momentumVote,1.4);
      score+=record('roc_10',Number(snapshot.roc.tenMinutes).toFixed(4),rocVote,1.2);
      score+=record('taker_flow_5',Number(snapshot.takerFlow.buyRatio).toFixed(4),takerVote,1.6);
      score+=record('spot_book',Number(snapshot.spotOrderBookImbalance).toFixed(4),book,1.4);
      score+=record('return_15m',Number(snapshot.longReturns.fifteenMinutes).toFixed(4),long.fifteen,.45);
      score+=record('return_60m',Number(snapshot.longReturns.sixtyMinutes).toFixed(4),long.sixty,.35);
      score*=clamp(volume,0.8,1.4);
      factors.push({name:'volume_ratio',value:volume.toFixed(3),impact:'NEUTRAL'});
    }else if(strategy==='smart'){
      const macdVote=direction(snapshot.macd.histogram),dmiVote=direction(snapshot.adx.plusDI-snapshot.adx.minusDI),takerVote=direction(snapshot.takerFlow.buyRatio-0.5,0.04),
        volume=Number(snapshot.volumeRatio),riskOff=snapshot.spread.basisPoints>8||snapshot.atr.percent>1.2||snapshot.volatility.perMinutePct>0.8,
        trendVotes=[p5,emaVote,macdVote,dmiVote,book,takerVote],up=trendVotes.filter(v=>v>0).length,down=trendVotes.filter(v=>v<0).length,
        trendDirection=up>=4&&up>down?1:down>=4&&down>up?-1:0,
        longAgainst=trendDirection?long.opposition(trendDirection):0,
        trending=snapshot.adx.adx>=24&&trendDirection!==0&&longAgainst<2;
      // Risk appetite must not reclassify an unchanged market from chop to conflict.
      regime=riskOff?'risk-off':trending?'trend':snapshot.adx.adx<24?'chop':'conflict';
      factors.push({name:'market_regime',value:regime,impact:'NEUTRAL'});
      if(regime==='trend'){
        score+=record('price_5m',Number(price.fiveMinutes).toFixed(4),p5,1.8);
        score+=record('ema_5_20',`${Number(ema.ema5).toFixed(2)}/${Number(ema.ema20).toFixed(2)}`,emaVote,1.8);
        score+=record('macd_histogram',Number(snapshot.macd.histogram).toFixed(4),macdVote,1.5);
        score+=record('dmi',`${Number(snapshot.adx.plusDI).toFixed(2)}/${Number(snapshot.adx.minusDI).toFixed(2)}`,dmiVote,1.2);
        score+=record('spot_book',Number(snapshot.spotOrderBookImbalance).toFixed(4),book,1.1);
        score+=record('taker_flow_5',Number(snapshot.takerFlow.buyRatio).toFixed(4),takerVote,1.1);
        score+=record('rsi_14',Number(snapshot.rsi14).toFixed(2),rsiTrend,0.5);
        score+=record('return_15m',Number(snapshot.longReturns.fifteenMinutes).toFixed(4),long.fifteen,.8);
        score+=record('return_60m',Number(snapshot.longReturns.sixtyMinutes).toFixed(4),long.sixty,.7);
      }else if(regime==='chop'){
        const rsiReversion=Number(snapshot.rsi14)<=38?1:Number(snapshot.rsi14)>=62?-1:0;
        const bandReversion=snapshot.bollinger.percentB<=0.15?1:snapshot.bollinger.percentB>=0.85?-1:0;
        const pullback=p1===0?0:-p1;
        score+=record('rsi_reversion',Number(snapshot.rsi14).toFixed(2),rsiReversion,1.8);
        score+=record('bollinger_percent_b',Number(snapshot.bollinger.percentB).toFixed(4),bandReversion,1.8);
        score+=record('spot_book',Number(snapshot.spotOrderBookImbalance).toFixed(4),book,1.4);
        score+=record('taker_flow_5',Number(snapshot.takerFlow.buyRatio).toFixed(4),takerVote,1.2);
        score+=record('short_pullback',Number(price.oneMinute).toFixed(4),pullback,0.8);
        score+=record('return_15m',Number(snapshot.longReturns.fifteenMinutes).toFixed(4),long.fifteen,.35);
        score+=record('return_60m',Number(snapshot.longReturns.sixtyMinutes).toFixed(4),long.sixty,.3);
      }
      factors.push({name:'adx_14',value:Number(snapshot.adx.adx).toFixed(2),impact:'NEUTRAL'},{name:'atr_percent',value:Number(snapshot.atr.percent).toFixed(4),impact:'NEUTRAL'},{name:'realized_volatility',value:Number(snapshot.volatility.perMinutePct).toFixed(4),impact:'NEUTRAL'},{name:'spread_bps',value:Number(snapshot.spread.basisPoints).toFixed(3),impact:'NEUTRAL'},{name:'volume_ratio',value:volume.toFixed(3),impact:'NEUTRAL'});
    }else{
      const dmiVote=direction(snapshot.adx.plusDI-snapshot.adx.minusDI),votes=[p1,p5,emaVote,dmiVote,book,long.fifteen,long.sixty],up=votes.filter(value=>value>0).length,down=votes.filter(value=>value<0).length,
        calm=snapshot.atr.percent<=0.5&&snapshot.volatility.perMinutePct<=0.25&&snapshot.spread.basisPoints<=3&&snapshot.adx.adx>=18,
        vote=calm&&down===0&&up>=6&&snapshot.rsi14>=48&&snapshot.rsi14<=70?1:calm&&up===0&&down>=6&&snapshot.rsi14<=52&&snapshot.rsi14>=30?-1:0;
      regime=!calm?'unsafe':vote?'mostly-aligned':'conflict';
      score=vote*(Math.max(up,down)===7?6:5.6);
      record('price_1m',Number(price.oneMinute).toFixed(4),p1);
      record('price_5m',Number(price.fiveMinutes).toFixed(4),p5);
      record('ema_5_20',`${Number(ema.ema5).toFixed(2)}/${Number(ema.ema20).toFixed(2)}`,emaVote);
      record('dmi',`${Number(snapshot.adx.plusDI).toFixed(2)}/${Number(snapshot.adx.minusDI).toFixed(2)}`,dmiVote);
      record('spot_book',Number(snapshot.spotOrderBookImbalance).toFixed(4),book);
      record('rsi_14',Number(snapshot.rsi14).toFixed(2),rsiTrend);
      record('return_15m',Number(snapshot.longReturns.fifteenMinutes).toFixed(4),long.fifteen);
      record('return_60m',Number(snapshot.longReturns.sixtyMinutes).toFixed(4),long.sixty);
      factors.push({name:'atr_percent',value:Number(snapshot.atr.percent).toFixed(4),impact:'NEUTRAL'},{name:'realized_volatility',value:Number(snapshot.volatility.perMinutePct).toFixed(4),impact:'NEUTRAL'},{name:'spread_bps',value:Number(snapshot.spread.basisPoints).toFixed(3),impact:'NEUTRAL'});
    }
    return {score,factors,regime};
  }
  function confidenceForScore(score, variance=50, strategy='smart') {
    const profile=profiles[strategy]||profiles.smart,curve=profile.confidence;
    return clamp(curve.base+Math.abs(Number(score)||0)*curve.scoreWeight+(Number(variance)-50)*curve.varianceWeight,50,97);
  }
  function stableUnit(value) {
    let hash=2166136261;
    for(const char of canonical(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
    return (hash>>>0)/4294967295;
  }
  function personalityNudge({strategy='smart',agentId='',roundId='',variance=50,confidence=50,minimumConfidence=50}={}) {
    const profile=profiles[strategy]||profiles.smart,distance=Math.abs(Number(confidence)-Number(minimumConfidence));
    if(!agentId||roundId==null||distance>7||profile.personalitySwing<=0)return 0;
    const willingness=clamp(Number(variance)||0,0,100)/100;
    const marginalWeight=1-distance/7;
    return (stableUnit({version:1,strategy,agentId:String(agentId),roundId:String(roundId)})*2-1)*profile.personalitySwing*willingness*marginalWeight;
  }
  function emotionAdjustment({strategy,actionUrge,emotionSensitivity,battleEmotion=0,winStreak=0,lossStreak=0,cardEmotion=false}={}) {
    const bound=cardEmotion?((value,fallback,min,max)=>Number.isFinite(Number(value))?clamp(Number(value),min,max):fallback):bounded;
    const profile=profiles[strategy]||profiles.smart,urge=bound(actionUrge,profile.actionUrge,0,100),sensitivity=bound(emotionSensitivity,profile.emotionSensitivity,0,100),intensity=sensitivity/100;
    const globalEmotion=bound(battleEmotion,0,0,100),globalIntensity=globalEmotion/100;
    const wins=clamp(Math.floor(Number(winStreak)||0),0,4),losses=clamp(Math.floor(Number(lossStreak)||0),0,4),state=losses?'loss':wins?'win':'neutral',streak=state==='loss'?losses:state==='win'?wins:0;
    const stakeRate=state==='loss'?profile.emotion.lossStake:state==='win'?profile.emotion.winStake:0;
    const confidenceRate=state==='loss'?profile.emotion.lossConfidence:state==='win'?profile.emotion.winConfidence:0;
    if(cardEmotion){
      // Sensitivity has already been applied once at settlement. Tilt influences
      // each persona's legal willingness, never its evidence or direction.
      const personalityStakeMultiplier=clamp(1+stakeRate*globalIntensity,.35,2.5);
      const minimumConfidence=clamp(profile.minConfidence-urge*.08+confidenceRate*globalIntensity,50,99);
      return {state,streak,actionUrge:urge,sensitivity,battleEmotion:globalEmotion,personalityStakeMultiplier,globalStakeMultiplier:1,stakeMultiplier:personalityStakeMultiplier,minimumConfidence};
    }
    const personalityStakeMultiplier=clamp(1+stakeRate*streak*intensity,.35,2.5);
    // Arena tilt is deliberately a strong shared influence: at 100, a two-round
    // streak should be clearly visible even for cautious personalities. Hard
    // stake caps and the local risk gate still constrain the resulting bet.
    const globalStakeRate=state==='loss'?.80:.60;
    const tiltPeriods=Math.max(1,streak);
    const globalStakeMultiplier=clamp(1+globalStakeRate*tiltPeriods*globalIntensity,1,2.8);
    const stakeMultiplier=clamp(personalityStakeMultiplier*globalStakeMultiplier,.35,2.5);
    const minimumConfidence=clamp(profile.minConfidence-urge*.08+confidenceRate*streak*intensity-2.5*tiltPeriods*globalIntensity,50,99);
    return {state,streak,actionUrge:urge,sensitivity,battleEmotion:globalEmotion,personalityStakeMultiplier,globalStakeMultiplier,stakeMultiplier,minimumConfidence};
  }
  function capitalManagement({strategy,balance,initialBalance,openStake=0,recoveryActive=false}) {
    const equity=balance+openStake;
    if(!Number.isFinite(equity)||!Number.isFinite(initialBalance)||initialBalance<=0||balance<0||openStake<0)
      return {recoveryActive:false,stakeMultiplier:1,mode:'NORMAL'};
    const ratio=equity/initialBalance;
    const recovery=equity>0&&equity<initialBalance&&(recoveryActive===true||ratio<=.2);
    const cautious=['conservative','volatilityGuard'].includes(strategy);
    const stakeMultiplier=!recovery&&cautious?(ratio>=2?.7:ratio>=1.5?.8:1):1;
    return {recoveryActive:recovery,stakeMultiplier,mode:recovery?'RECOVERY_ALL_IN':stakeMultiplier<1?'PROFIT_PROTECTION':'NORMAL',capitalRatio:ratio,recoveryTarget:initialBalance};
  }
  function normalStakePercent({strategy,baseStakePct,maxStakePct,balance,initialBalance,openStake=0,recoveryActive=false,countertradeMultiplier=1,confidence=0,edge=0,winStreak=0,lossStreak=0,emotionSensitivity,battleEmotion=0,cardEmotion=false}) {
    const capital=capitalManagement({strategy,balance,initialBalance,openStake,recoveryActive});
    if(capital.recoveryActive)return 100;
    if(strategy==='liangXi')return Number(maxStakePct)<50?0:50;
    const profile=profiles[strategy]||profiles.smart;
    const configuredBase=Number(baseStakePct)||profile.baseStakePct;
    const tiers=profile.stakeTiers.map(value=>value/profile.baseStakePct*configuredBase);
    const measuredConfidence=Number.isFinite(Number(confidence))?Number(confidence):0;
    let percent=measuredConfidence>=profile.tierConfidence[1]?tiers[2]:measuredConfidence>=profile.tierConfidence[0]?tiers[1]:tiers[0];
    percent*=emotionAdjustment({strategy,emotionSensitivity,battleEmotion,winStreak,lossStreak,cardEmotion}).stakeMultiplier;
    if (Number(battleEmotion)>0) percent=Math.max(percent,probeStakePercent({strategy,baseStakePct,maxStakePct,balance,battleEmotion}));
    if (Number.isFinite(balance) && balance > 0) percent=Math.max(percent,MIN_STAKE*100/balance);
    if (strategy==='contrarian') percent*=clamp(Number(countertradeMultiplier)||1,1,2);
    const cap=Math.min(Number(maxStakePct)||profile.maxStakePct,profile.normalMaxStakePct);
    return Math.min(cap,Math.max(Number.isFinite(balance)&&balance>0?MIN_STAKE*100/balance:0,Math.min(cap,percent)*capital.stakeMultiplier));
  }
  function probeStakePercent({strategy,baseStakePct,maxStakePct,balance,initialBalance,openStake=0,recoveryActive=false,battleEmotion=0}) {
    const capital=capitalManagement({strategy,balance,initialBalance,openStake,recoveryActive});
    if(capital.recoveryActive)return 100;
    if(strategy==='liangXi')return Number(maxStakePct)<50?0:50;
    const profile=profiles[strategy]||profiles.smart;
    const tilt=bounded(battleEmotion,0,0,100)/100;
    const base=Math.min(5,Number(baseStakePct)||profile.baseStakePct);
    const high=({aggressive:40,smart:20,contrarian:15,conservative:7,volatilityGuard:7})[strategy]??profile.normalMaxStakePct;
    const percent=base+(high-base)*tilt;
    const minimum=Number.isFinite(balance)&&balance>0?MIN_STAKE*100/balance:0;
    const cap=Math.min(Number(maxStakePct)||profile.maxStakePct,profile.normalMaxStakePct);
    return Math.min(cap,Math.max(minimum,Math.min(cap,percent)*capital.stakeMultiplier));
  }
  function allInRequirements({strategy,battleEmotion=0}) {
    const profile=profiles[strategy]||profiles.smart,tilt=bounded(battleEmotion,0,0,100)/100;
    return {
      confidence:profile.allInConfidence-(strategy==='aggressive'?20:strategy==='smart'?4:0)*tilt,
      minimumEdge:Number((.2-(strategy==='aggressive'?.1:0)*tilt).toFixed(4)),
      requiredLossStreak:strategy==='aggressive'?(tilt>=.8?0:tilt>=.5?1:2):0,
    };
  }
  function strongCoreConsensus(snapshot={},choice,strategy='smart') {
    const sign=choice==='UP'?1:-1,price=snapshot.priceChangePct||{},ema=snapshot.ema||{},long=longHorizonContext(snapshot);
    const priceAligned=direction(price.oneMinute)===sign&&direction(price.fiveMinutes)===sign;
    const bookAligned=direction(snapshot.spotOrderBookImbalance,0.05)===sign,takerAligned=direction((snapshot.takerFlow?.buyRatio??0.5)-0.5,0.05)===sign;
    if(strategy==='aggressive'){
      const momentumAligned=direction(snapshot.momentum)===sign,rocAligned=direction(snapshot.roc?.tenMinutes,0.03)===sign;
      return priceAligned&&long.support(sign)>=1&&long.opposition(sign)===0&&[priceAligned,bookAligned,takerAligned,momentumAligned,rocAligned].filter(Boolean).length>=4;
    }
    const emaAligned=direction(Number(ema.ema5)-Number(ema.ema20))===sign,macdAligned=direction(snapshot.macd?.histogram)===sign,dmiAligned=direction((snapshot.adx?.plusDI||0)-(snapshot.adx?.minusDI||0))===sign;
    return priceAligned&&bookAligned&&long.support(sign)>=1&&long.opposition(sign)===0&&snapshot.adx?.adx>=22&&snapshot.spread?.basisPoints<=5&&[priceAligned,emaAligned,macdAligned,dmiAligned,bookAligned,takerAligned].filter(Boolean).length>=5;
  }

  const outputSchema = '{"round_id":"","action":"BET|SKIP","direction":"UP|DOWN|null","stake_usdt":0,"stake_pct":0,"confidence":0,"risk_mode":"NORMAL|ADD_ON|ALL_IN|WAIT","skip_reason_code":"MODEL_UNCERTAIN|STRATEGY_BLOCKED|NO_ELIGIBLE_PEERS|ORACLE_WAIT|null","factors":[{"name":"","value":"","impact":"UP|DOWN|NEUTRAL"}],"reason":"max 80 chars","data_fresh":true,"warnings":[]}';
  const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Math.round(Number(value)))) : fallback;
  function buildDecisionPrompt(value = {}) {
    const strategy = Object.hasOwn(profiles, value.strategy) ? value.strategy : value.profile?.key || 'smart';
    const profile = profiles[strategy] || profiles.smart;
    const variance = bounded(value.decisionVariance ?? value.decision_variance ?? value.variance, profile.variance, 0, 100);
    const actionUrge = bounded(value.actionUrge ?? value.action_urge, profile.actionUrge, 0, 100);
    const personalActionUrge = bounded(value.personalActionUrge ?? value.personal_action_urge, actionUrge, 0, 100);
    const battleActionUrge = bounded(value.battleActionUrge ?? value.battle_action_urge, 0, 0, 100);
    const emotionSensitivity = bounded(value.emotionSensitivity ?? value.emotion_sensitivity, profile.emotionSensitivity, 0, 100);
    const battleEmotion = bounded(value.battleEmotion ?? value.battle_emotion, 0, 0, 100);
    const suppliedEmotionState = ['win','loss','neutral'].includes(value.emotionState ?? value.emotion_state) ? (value.emotionState ?? value.emotion_state) : 'neutral';
    const suppliedEmotionStreak = bounded(value.emotionStreak ?? value.emotion_streak, 0, 0, 4);
    const calculatedEmotion = emotionAdjustment({
      strategy,
      cardEmotion:value.card_emotion===true,
      actionUrge,
      emotionSensitivity,
      battleEmotion,
      winStreak:suppliedEmotionState==='win'?suppliedEmotionStreak:0,
      lossStreak:suppliedEmotionState==='loss'?suppliedEmotionStreak:0,
    });
    const emotionStakeMultiplier = Number.isFinite(Number(value.emotionStakeMultiplier ?? value.emotion_stake_multiplier))
      ? clamp(Number(value.emotionStakeMultiplier ?? value.emotion_stake_multiplier),.35,2.5)
      : calculatedEmotion.stakeMultiplier;
    const effectiveMinimumConfidence = Number.isFinite(Number(value.effectiveMinimumConfidence ?? value.effective_minimum_confidence))
      ? clamp(Number(value.effectiveMinimumConfidence ?? value.effective_minimum_confidence),50,99)
      : calculatedEmotion.minimumConfidence;
    const recovery=value.capital_recovery===true;
    const maxStakePct = recovery?100:bounded(value.maxStakePct ?? value.max_stake_pct, profile.maxStakePct, 5, profile.maxStakePct);
    const allowAllIn = recovery||(profile.allowAllIn && maxStakePct === 100 && (value.allowAllIn ?? value.allow_all_in) !== false);
    const requested = Array.isArray(value.indicatorFields) ? value.indicatorFields : Array.isArray(value.indicators) ? value.indicators : profile.recommended;
    const fieldNames = new Set(Object.values(indicators).map(item => item.field));
    const selectedFields = [...new Set(requested.map(key => indicators[key]?.field || key).filter(key => fieldNames.has(key)))];
    const requiredFields = profile.required.map(key => indicators[key].field);
    const asset = String(value.asset || (value.coin ? `${value.coin}USDT` : 'BTCUSDT')).toUpperCase();
    const timeframe = ['5m','15m','1h','1d'].includes(String(value.timeframe || '').toLowerCase()) ? String(value.timeframe).toLowerCase() : '5m';
    const timeframeLabel = ({'5m':'five-minute','15m':'fifteen-minute','1h':'one-hour','1d':'one-day'})[timeframe];
    const strategyRule = profile.enDescription;
    const allIn = allInRequirements({strategy,battleEmotion});
    const highProbe = probeStakePercent({strategy,maxStakePct,battleEmotion:100});
    const allInRule = recovery
      ? "RECOVERY_ALL_IN is active. Every permitted BET must use the full available balance rounded down to cents and risk_mode=ALL_IN. This replaces the normal/probe amount caps and ordinary ALL_IN eligibility checks (strong consensus, extra edge and loss streak); direction permissions, data freshness, minimum confidence and positive edge still apply. In this paper-only recovery mode, the full balance may be below 5 USDT but must be at least 0.01 USDT. This is the sole minimum-stake exception. SKIP remains valid when no bet is permitted. Losses are not evidence of an advantage."
      : allowAllIn
      ? `ALL_IN requires max_stake_pct=100, confidence >= ${allIn.confidence}, estimated edge >= ${allIn.minimumEdge}, loss_streak >= ${allIn.requiredLossStreak}, and the strategy's own strong-consensus gate. ${strategy==='aggressive'?'10U Warrior requires aligned short returns plus at least three of momentum, ROC, taker flow and order book.':'Super AI requires a strong ADX trend with aligned returns, EMA, MACD, DMI, flow and order book, plus spread <= 5 bps.'} The loss-streak requirement is only an eligibility condition, never evidence of an advantage. ALL_IN means the full available balance rounded down to cents. ${strategy==='aggressive'&&battleEmotion>=80?'At high tilt, prefer ALL_IN over a small normal bet when ALL supplied ALL_IN conditions are satisfied by your honest confidence; no previous loss is required. Never raise confidence just to qualify.':''}`
      : 'ALL_IN is disabled. Never return risk_mode=ALL_IN or stake 95% or more of the available balance.';
    return [
      `You are the ${timeframeLabel} Up/Down paper-betting decision engine for ${asset} in 10U Warrior.`,
      'This is paper betting only. You cannot call tools, wallets, or order APIs.',
      'Use only the supplied JSON snapshot. Never invent missing values.',
      `Selected strategy: ${profile.enLabel} (${strategy}).`,
      `Strategy rule: ${strategyRule}`,
      ...(strategy==='liangXi'?[
        'This is a game interpretation of publicly described short-term, bidirectional, heavy-stake rolling behavior, not an authenticated strategy or impersonation. No measured accuracy is claimed. Read short pressure and turning points with flow confirmation; never force a short merely because the persona is known for shorting.',
        'LIANG_XI sizing overrides all ordinary ladders, minimum top-ups, probes and emotion multipliers: each BET must be exactly 50% (NORMAL) or 100% (ALL_IN) of available paper balance, rounded down to cents. Never use ADD_ON, 5%, 20%, 75%, or an arbitrary amount. Half below the ordinary minimum means SKIP unless a full-balance bet independently qualifies. The two sizes are game rules requested by the user, not documented rules used by the real person.',
        'After a settled win or loss, the supplied emotion threshold falls sharply, making subsequent rounds easier to enter. Reassess direction on fresh evidence every round and switch sides when justified. Repeated entries mean subsequent eligible rounds, never duplicate bets in one round. Missing data, conflicting direction and nonpositive edge still require SKIP.',
      ]:[]),
      ...(characterStrategies.includes(strategy)?['Fictional game persona, never claim to be or represent the real person.',
        strategy==='sunBrother' ? 'Use the program-verified inverse technical consensus. A bullish technical consensus permits only DOWN; bearish permits only UP. Unclear or conflicting consensus requires SKIP. Do not use peers or reverse the reversed direction again.'
          : strategy==='kzgMask' ? 'Follow the frozen card style and program-verified structure confirmation: trend, closed-candle range break, volume and flow must agree. Sniper style needs a second closed-candle confirmation. Never invent missing bars or use peer orders.'
          : ['czBrother','firstLady'].includes(strategy)
          ? 'BET only UP on BTCUSDT or BNBUSDT. Evaluate your own trend and liquidity conditions. You do not require any peer order or any peer loss streak.'
          : strategy==='showoff'
            ? 'Use only actual same-round czBrother orders in input.peers. Fade their stake-weighted direction; ties or no valid target require SKIP. No peer loss streak is required.'
            : 'Use only actual same-round non-Contrarian orders in input.peers. Combine all eligible peers using the supplied loss-history vote weights; never pick just one target. Inspect each peer’s performance over at most 20 settled bets, net return, cumulative realized capital loss, directional outcomes and loss-chasing habits. Unsettled stakes are not realized losses. Fade the program-verified weighted majority. Only collective losses involving at least two losing current bettors, broad losses and aligned votes permit the supplied 1.25x, 1.5x or 2x stake multiplier. One losing person alone, or split directions, must not trigger collective escalation. If no material loss evidence exists, use the program-supplied crowd fallback and its action-urge loss-streak requirements. Ties or no eligible targets require SKIP. Missing payout data is unknown, not a loss. These histories are descriptions, not proof that a peer will lose again; keep confidence honest.',
        'Market-risk, positive-edge and hard caps still apply.']:[]),
      ...(divinationStrategies.includes(strategy)?[
        strategy==='fengShui'?'Persona: You are the Feng Shui Master. Explain the supplied upper/lower oracle symbols and element as an imaginative market landscape.':'Persona: You are the Diviner. Read the supplied three cards in order as backdrop, present tension and next action; consider each upright/reversed position.',
        'Use input.divination.draw_details for exact symbol, element and card names. Numeric IDs are game-specific, not traditional numbering. Copy these names faithfully; reversed cards do not all have the same vote. Interpret the supplied gameVote and frozen verdict, never invent a mapping.',
        'input.divination is a frozen, indicator-seeded entertainment draw. Never reroll, replace cards, claim supernatural accuracy, or describe its random seed as a calibrated probability. Explain the draw together with the supplied market indicators in reason, then decide BET or SKIP. You may always SKIP. BET must follow input.divination.verdict; WAIT forbids BET. At action_urge >= 80 a neutral original omen may have a directional market-led verdict; keep the original cards and explain the market-led small probe. Do not bypass the existing risk gate.',
        'Return divination with seed copied exactly from input.divination.seed, reading containing a short in-character interpretation (max 160 chars), and verdict equal to UP/DOWN for BET or WAIT for SKIP. Include ENTERTAINMENT_ONLY in warnings.',
      ]:[]),
      `Action urge: personal_action_urge=${personalActionUrge}/100; battle_action_urge=${battleActionUrge}/100; effective action_urge=${actionUrge}/100. The shared battle value raises every Agent toward 100 without erasing its personal baseline. A higher effective value may accept a weaker but still directional strategy signal and lowers the supplied minimum-confidence threshold by up to 8 points. It never creates a direction, overrides missing or stale data, accepts excessive market risk, removes the positive-edge check, or exceeds stake caps. SKIP remains a normal valid action in every round.`,
      value.card_emotion===true?'Emotion is already computed from unique settlements, card sensitivity, gain and completed-round cooling. Use the supplied personality multiplier and minimum confidence without amplifying sensitivity or streaks again. Cautious personalities can reduce stakes after losses.':`Emotion rule: ${profile.enEmotionLabel} emotion_sensitivity=${emotionSensitivity}/100. battle_emotion=${battleEmotion}/100 applies from the first round: even without past results it raises the normal stake multiplier by up to 60% and lowers the confidence floor by up to 2.5 points. Win/loss streaks amplify this shared tilt, including for cautious strategies. It may change only the supplied minimum-confidence threshold and normal stake multiplier; it must never change direction, bypass market entry conditions, or exceed a hard stake cap.`,
      `Current emotion adjustment: state=${calculatedEmotion.state}; streak=${calculatedEmotion.streak}; personality_stake_multiplier=${calculatedEmotion.personalityStakeMultiplier.toFixed(3)}; shared_tilt_multiplier=${calculatedEmotion.globalStakeMultiplier.toFixed(3)}; normal_stake_multiplier=${emotionStakeMultiplier.toFixed(3)}; effective_minimum_confidence=${effectiveMinimumConfidence.toFixed(2)}. Follow these supplied values exactly.`,
      value.capital_version==='SC-2'?'SC-2 probes use only the lowest permitted personality tier. No minimum rounding-up, recovery exception, arbitrary fractions or additional exposure. If no supplied legal choice fits, SKIP.':`Probe sizing follows this personality's battle_emotion curve: the ordinary 5% budget rises linearly to ${highProbe}% at 100, subject to normal_stake_cap and max_stake_pct, with a ${value.capital_version==='SC-2'?.1:MIN_STAKE} USDT minimum only when those hard caps and balance allow it. Normal stake sizing is at least this personality's current probe budget when permitted by hard caps. The supplied execution permissions and exact stake choices are authoritative.`,
      ...(battleEmotion>=70 ? ['High-tilt decision preference: when a direction is permitted and your honest confidence clears the supplied minimum and positive-edge checks, prefer acting with the supplied normal or probe stake. A permitted probe does not need strong-signal consensus. Do not default to the minimum amount or wait for perfect alignment merely out of generic caution. SKIP remains valid for a specific uncertainty or unmet condition; explain it. Never inflate confidence or override a fixed direction, countertrade prerequisite, frozen oracle, or hard cap.'] : []),
      `Selected indicator fields: ${selectedFields.join(', ')}.`,
      `Required indicator fields: ${requiredFields.length ? requiredFields.join(', ') : 'none beyond the selected fields'}.`,
      `Policy limits: decision_variance=${variance}; personal_action_urge=${personalActionUrge}; battle_action_urge=${battleActionUrge}; action_urge=${actionUrge}; emotion_sensitivity=${emotionSensitivity}; battle_emotion=${battleEmotion}; minimum_confidence=${profile.minConfidence}; effective_minimum_confidence=${effectiveMinimumConfidence.toFixed(2)}; base_stake_pct=${profile.baseStakePct}; normal_stake_cap=${recovery?100:Math.min(profile.normalMaxStakePct,maxStakePct)}; max_stake_pct=${maxStakePct}; allow_all_in=${allowAllIn}.`,
      value.capital_version==='SC-2'?`Legal normal stake tiers: ${strategy==='liangXi'?'50':profile.stakeTiers.join(', ')} percent. Confidence and the supplied emotion multiplier choose a tier, rounded down to an eligible tier, never to a new fraction. Never increase a stake to reach the 0.10 USDT minimum. The exact choices and pending exposure cap are authoritative.`:`Normal stake ladder for this personality: ${profile.stakeTiers[0]}% below ${profile.tierConfidence[0]} confidence; ${profile.stakeTiers[1]}% from ${profile.tierConfidence[0]} to below ${profile.tierConfidence[1]}; ${profile.stakeTiers[2]}% from ${profile.tierConfidence[1]} upward. Apply the supplied emotion multiplier and a minimum stake of ${MIN_STAKE} USDT, then obey normal_stake_cap and max_stake_pct. For Contrarian, also apply the program-supplied collective countertrade stake multiplier before the hard caps; never invent a multiplier. If the balance or either cap cannot cover the minimum, SKIP. Do not substitute another personality's ladder.`,
      ...(strategy==='priceAction' ? [
        'raw_candles contains the latest 20 fully closed OHLC bars. Read only open, high, low, close, candle order and the supplied market odds. Do not infer or use RSI, MACD, moving averages, order book, volume, news or any hidden indicator.',
        'Look for visible engulfing candles, rejection wicks, two-candle runs, forceful candle bodies and breaks of recent highs or lows. One clear strong pattern can be enough; do not require several confirmations. Weak shapes or strong opposing patterns require SKIP.',
      ] : [
        'price_change_pct compares completed one-minute candle closes over exactly 1 and 5 minutes. RSI uses Wilder smoothing on completed candles.',
        'All technical windows use completed 1m candles, not 5m candles. returns_15_60 compares completed closes over 15 and 60 minutes and is mandatory long-horizon context for these indicator strategies. VWAP is rolling 20m quote volume / base volume, not a daily session VWAP. Realized volatility is the population standard deviation of 20 one-minute log returns in percent, not annualized. Donchian excludes the decision candle. OBV is a 20m signed-volume change, not lifetime OBV. Spread and microprice use current top-of-book; taker flow aggregates completed 5 minutes.',
      ]),
      'Follow only the selected strategy rule. Never substitute another strategy when its prerequisites fail. Related indicators are correlated, not independent confirmations. The local execution permissions supplied with an independent model review are authoritative: they may admit a small probe at high action urge. Preserve long-only, countertrade, and frozen-oracle contracts.',
      'confidence is your uncalibrated estimate of the chosen direction probability in percent; it is not a measured win rate. Estimated edge = confidence / 100 * odds - 1, before fees.',
      value.capital_version==='SC-2'?'SC-2 strict capital rules: minimum 0.10 USDT; round down to cents. The frozen user limit and personality limit both apply, as does the total unsettled exposure cap. Never bypass them for recovery. A triggered stop-loss blocks all new bets. Use only supplied exact stake choices.':'Shared capital sizing: at or below 20% of cumulative invested capital, enter persistent RECOVERY_ALL_IN until funds recover to invested capital. Unsettled stakes are part of funds. For conservative and volatilityGuard, at 1.5x invested capital reduce the usual stake percentage by 20%, at 2x reduce it by 30%; minimum stake and caps still apply. Runtime capital mode and exact stake choices override the static amount ladder only; they never change directional prerequisites.',
      allInRule,
      'decision_variance affects willingness to change a marginal decision. action_urge affects how much valid directional evidence is needed to act. Neither can bypass freshness, balance, positive edge, hard risk checks or stake caps. Losses alone are never evidence of an advantage.',
      'Use JSON numbers, not strings, booleans or null, for stake_usdt, stake_pct and confidence. SKIP requires direction=null, both stakes=0 and risk_mode=WAIT. Echo round_id as a string.',
      'Return SKIP when data is stale, contradictory, below minimum confidence, missing a selected or required indicator, or has no positive expected value.',
      'Return exactly one JSON object with these fields and no Markdown:',
      divinationStrategies.includes(strategy)?JSON.stringify({...JSON.parse(outputSchema),divination:{seed:'',reading:'',verdict:'UP|DOWN|WAIT'}}):outputSchema,
    ].join('\n');
  }
  return { MIN_STAKE, capitalManagement, indicators, profiles, defaultIndicators, coreStrategies, characterStrategies, decisionStage, supportsAsset, peerSnapshot, eligibleCountertradePeers, evaluateCharacter, divinationStrategies, evaluateDivination, formatDivination, evaluatePriceAction, effectiveActionUrge, longHorizonContext, evaluateCoreStrategy, confidenceForScore, personalityNudge, emotionAdjustment, normalStakePercent, probeStakePercent, allInRequirements, strongCoreConsensus, buildDecisionPrompt };
});
