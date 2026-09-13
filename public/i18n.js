(() => {
  const messages = {
    '对局由后台服务运行，切换应用不停止行情和模拟下注。通知栏可暂停全部下注，已有订单继续结算。':'The background service keeps prices and simulated bets running when you switch apps. Pause all new bets from the notification; open orders continue settling.',
    '显示运行通知':'Show running notification',
    '后台服务运行中':'Background service running',
    '暂无运行中的对局':'No active battles',
    '后台服务异常，请重新打开应用；对局恢复后保持暂停。':'Background service stopped. Reopen the app; restored battles remain paused.',
    '无法读取后台服务状态':'Background service status unavailable',
    '策略战况':'Strategy status',
    '观望':'Wait',
    '看空':'Down',
    '运行中':'Running', '结算中':'Settling', '等待重试':'Waiting for retry',
    '等待更新':'Waiting for updates', '等待恢复':'Waiting for recovery',
    '桌面小组件':'Home screen widget',
    '在手机桌面上下滑动查看策略战况。系统暂停后台时，显示上次快照。':'Swipe up or down on your home screen to view strategies. If background activity stops, the last snapshot remains.',
    '添加到桌面':'Add to home screen',
    '请在系统弹窗中添加小组件':'Add the widget in the system dialog',
    '请长按桌面 → 小组件 → 10U 战神':'Long-press the home screen → Widgets → 10U Warrior',
    '上下滑动切换 · 点击查看详情':'Swipe up/down · Tap for details',
    '暂无策略，点击打开应用开一局':'No strategies. Tap to start a battle in the app.',
    '快照':'Snapshot', '距更新 %s':'Updated %s ago',
    '更新中断，点击打开应用':'Updates stopped. Tap to open app.',
    '读取失败，显示上次快照':'Read failed. Showing last snapshot.',
    '打开应用':'Open app', '行情连接中断':'Market connection lost',
    '该策略已移除或暂时无法读取':'This strategy was removed or is unavailable',
    "允许后台运行":"Allow background activity",
    "切到其他应用后，系统可能暂停对局。请将电池使用设为不受限制，并允许应用后台运行。":"The system may pause battles when you switch apps. Set battery use to unrestricted and allow background activity.",
    "部分手机还需允许自启动。开启后仍可能被系统挂起，不保证锁屏持续运行。":"Some phones also require allowing auto-start. The system may still suspend the app; continuous operation while locked is not guaranteed.",
    "稍后设置":"Set up later",
    "系统限制了后台活动，请在应用后台设置中解除限制。":"Background activity is restricted. Remove the restriction in app background settings.",
    "完成":"Done",
    '凉兮':'Liang Xi','半仓梭哈':'Half balance','全仓梭哈':'All-in',
    '短线选点，多空切换':'Pick short-term entries; trade both directions',
    '仅半仓或全仓；无信号可观望':'Half or full balance only; wait without a signal',
    '当前最多添加 17 位 Agent。':'Up to 17 Agents can be added.',
    "模拟模式":"Simulation mode",
    "当前使用模拟资金":"Using paper funds",
    "使用公开行情进行模拟对局，不读取钱包资产，也不发起真实交易。":"Simulate battles with public market data. Wallet assets are not accessed and no real trades are placed.",
    "使用公开行情进行模拟对局":"Simulate battles with public market data",
    "加密保存在当前设备":"Encrypted on this device",
    "密钥加密保存在当前设备，测试和决策时发送给所选服务商。请在此移除不再使用的连接。":"Keys are encrypted on this device and sent to your chosen provider for tests and decisions. Remove unused connections here.",
    "正在验证模型的决策 JSON":"Checking the model decision JSON",
    "当前服务不可用":"Service unavailable",
    'MOBILE_STORAGE_UNAVAILABLE':'Phone storage is unavailable',
    'MOBILE_STORAGE_FAILED':'Could not save phone data; execution stopped',
    'MOBILE_SERVICE_FAILED':'The phone runtime could not complete this action',
    'MOBILE_HTTPS_REQUIRED':'Mobile AI connections require an HTTPS address',
    '后台模拟':'Background simulation',
    '切到后台继续模拟；系统仍可能挂起。需要停止时请点暂停。':'Simulation continues in the background, but Android may suspend it. Tap Pause to stop betting.',
    '电池优化设置':'Battery optimization',
    '应用后台设置':'App background settings',
    '在系统中找到 10U 战神，将电池设为不受限制或允许后台运行。不同手机名称可能不同。':'Find 10U Warrior in system settings and choose unrestricted battery use or allow background activity. Labels vary by phone.',
    '已豁免电池优化，仍不保证持续运行。':'Battery optimization exemption is on. Continuous execution is still not guaranteed.',
    '尚未豁免电池优化，可在系统设置中调整。':'Battery optimization exemption is off. You can change it in system settings.',
    '无法读取电池状态，请在系统设置中查看。':'Battery status unavailable. Check system settings.',
    '无法打开设置，请到手机设置 → 应用 → 10U 战神中调整。':'Could not open settings. Go to phone Settings → Apps → 10U Warrior.',
    '搏命梭哈':'Recovery all-in',
    '盈利减仓':'Smaller stakes after gains',
    '搏命梭哈：继续全押，直到回本。':'Recovery mode: keep betting the full balance until invested capital is recovered.',
    '本金已增长，按保守规则减少下注。':'Funds have grown. The cautious strategy uses a smaller stake percentage.',
    '资金规则：剩余不超过投入本金的 20% 后，持续全押直到回本；模拟全押可低于 5U。守财奴、稳如老狗在资金达到本金 1.5 倍／2 倍时，下注比例降低 20%／30%。':'Capital rules: at 20% or less of invested capital, use all-in bets until capital is recovered; recovery paper bets may be below 5U. Miser and Steady Dog reduce stake percentages by 20% / 30% at 1.5× / 2× invested capital.',
    '战神陨落':'Warrior fallen',
    '筹码归零，本局阵亡':'Out of chips. Defeated this battle.',
    '历史战绩':'Battle history',
    '暂无历史战绩':'No battle history yet',
    '正在读取历史战绩…':'Loading battle history…',
    '历史战绩读取失败，请重试。':'Could not load battle history. Please retry.',
    '胜':'Win',
    '负':'Loss',
    '平':'Draw',
    "多人亏损且方向一致，反向加码":"Multiple losing peers agree; increase the countertrade",
    "综合对手历史亏损与本轮方向，反向下注":"Combine peers’ loss history and current directions to countertrade",
    "综合对手近20笔战绩、方向偏好与追注习惯，反押加权多数；多人持续亏损且方向一致时加码。":"Combine peers’ last 20 settled bets, direction preferences and loss-chasing habits. Fade the weighted majority; increase stakes when multiple losing peers agree.",
    '未知':'Unknown',
    '仅统计已返回的用量':'Reported usage only',
    '已记录 Token':'Recorded tokens',
    '未返回用量':'Calls with unknown usage',
    '用量明细':'Usage details',
    '连接 AI 后显示用量':'Connect an AI to see usage',
    '使用方式':'Decision source',
    '本地规则':'Local rules',
    '当前判断':'Current decision',
    '等待判断':'Waiting to decide',
    '判断把握':'Confidence',
    '未通过检查，暂不下注':'Checks not passed. No bet.',
    '有合适机会时，再决定是否下注。':'Waiting for a suitable chance to bet.',
    '暂无数据':'No data yet',
    '买卖强弱（RSI）':'Buying / selling strength (RSI)',
    '短期／长期均价':'Short / long average price',
    '买卖挂单对比':'Buy / sell orders',
    '判断灵活度':'Decision flexibility',
    '每轮最多下注':'Stake limit per round',
    '允许全押':'Allow all-in',
    '策略说明':'Strategy details',
    '当前资金':'Current funds',
    '已结算收益':'Settled gains / losses',
    '还没有结算，资金暂未变化。':'No settlements yet. Funds are unchanged.',
    '资金包含待结算的下注；追加资金不算收益。':'Funds include unsettled stakes. Added funds do not count as gains.',
    "策略提示词模板":"Strategy prompt template",
    "查看策略规则":"View strategy rules",
    "实际请求还含本轮参数，可在战报逐轮记录查看":"Actual requests include round settings; see per-round records in Reports",
    "实际发送的模型请求":"Actual model request",
    "首轮即可提高下注档位，胜负会放大影响；仍受仓位上限约束":"Raises stake tiers from the first round; results amplify tilt, within stake caps",
    "0 保留各自性格，100 全员最手痒；仍可观望，装逼的人须等 CZ 下注":"0 keeps personal baselines; 100 maximizes urge. Waiting is valid; Show-off needs a CZ bet",
    "已保存；下次分析使用新值，实时进场开启时将在冷却后复查":"Saved. New values apply at the next review; live entry rechecks after cooldown",
    "模型自主观望":"Model chose to wait",
    "策略条件未满足":"Strategy conditions not met",
    "没有符合条件的对手":"No eligible counterparties",
    "卦牌本轮观望":"Oracle requires waiting this round",
    "AI 观望理由与输入不符":"AI wait reason conflicts with input",

    'AI 金额格式不正确':'AI stake format is invalid',
    '下注金额低于最低 5U':'Stake is below the 5U minimum',
    '开启：开局先分析，行情变化后再复查。关闭：仅在开局判断。':'On: review at opening, then reassess market changes. Off: review only at opening.',
"三张牌定偏向，有行情支持就小注尝试；手痒高时，中立牌面可参考行情试探，每轮不重抽。娱乐模拟。":"Use the three-card tilt with market support for small bets. At high action urge, a neutral draw may consult market direction for a small probe. Never redraw within a round. Entertainment simulation.",
"反押本轮实际下注者的金额多数方向；手痒越高，连亏要求从两次放宽到一次，满值可反押普通对手。":"Fade the stake-weighted direction of actual current bettors. Require two losses normally, one at high action urge, and none at maximum; ties mean wait.",
"只做多 BTC 和 BNB；手痒越高越早尝试上涨机会，确认不足只下小注，强烈逆风仍等待。":"Long-only BTC and BNB. Higher action urge allows earlier bullish probes with small stakes; strong opposing trends still mean wait.",
    '等待 CZ 下注':'Waiting for CZ to bet',
    '上涨确认不足':'Bullish confirmation is insufficient',
    '等待符合条件的对手下注':'Waiting for an eligible opponent bet',
    '牌面与行情尚未形成方向':'Cards and market have no direction yet',
    '已分析，等待下次复查':'Reviewed; waiting for the next review',
    '已分析，等待行情变化':'Reviewed; waiting for market changes',
    '本轮分析次数已用完':'Round review limit reached',
    '等待完整行情':'Waiting for complete market data',
    '赔率优势不足':'Insufficient odds edge',
    '最新赔率优势不足':'Fresh odds no longer offer an edge',
    '下注金额超过限制':'Stake exceeds the limit',
    '试探下注超过小额限制':'Probe exceeds the small-stake limit',
    '策略条件尚未满足':'Strategy conditions are not met',
    '判断把握不足':'Insufficient confidence',
    'AI 请求失败':'AI request failed',
    'AI 请求超时':'AI request timed out',
    '行情恢复中':'Restoring market data',
    '策略选择观望':'Strategy chose to wait',
    'AI 选择观望':'AI chose to wait',
    '风控未通过':'Risk checks did not pass',
    '影响连胜连败后的金额；尚无战绩时不加码':'Adjusts stakes after streaks; no increase before any results',
    '越高越积极复查与小额试探；装逼的人仍须等 CZ 下注':'Higher values increase reviews and small probes; Show-off still waits for CZ',
    '开局先分析，行情变化后再复查':'Review at opening, then reassess market changes',
"每位本金需为 10–1,000 U。":"Starting funds must be 10–1,000 U per Agent.",
"每 30 秒查询结算，不占用故障重试次数。":"Checking settlement every 30 seconds; fault retries are unaffected.",
"上次开局尚未确认，请先核对，避免重复开局。":"The previous battle creation is unconfirmed. Check it before starting another.",
"核对并重试上次开局":"Check and retry previous creation",
"开局未确认，请核对后重试；不会重复创建同一局。":"Creation is unconfirmed. Check and retry; the same battle will not be created twice.",
"离线存档读取失败，原始数据已保留。请重试读取、恢复备份或确认重置。":"Offline save could not be read. Original data is preserved. Retry, restore a backup, or confirm a reset.",
"重试读取":"Retry reading",
"恢复最近备份":"Restore latest backup",
"重置离线存档":"Reset offline save",
"确认重置":"Confirm reset",
"重置后从空白开始，原始损坏存档会另存保留。":"Start fresh after resetting. The original damaged save will be archived separately.",
"恢复未完成，原始存档未丢弃。请检查设备存储后重试。":"Recovery did not complete. The original save was kept. Check device storage and retry.",

"AI 服务商暂时不可用":"The AI provider is temporarily unavailable",
"正在测试模型连接…":"Testing model connection…",
"模型连接失败，已切回本地规则。请检查网络或代理后重新选择。":"Model connection failed. Switched to local rules. Check your network or proxy before selecting it again.",
"多个 AI 决策连接失败，全部对局已暂停。请检查网络或代理，恢复连接后手动继续。":"Multiple AI decisions could not connect. All battles are paused. Check your network or proxy, then resume manually after reconnecting.",
"AI_CONNECTION_OUTAGE":"Multiple AI connections failed; all battles paused",
"连接恢复中":"Restoring connection",
"重试已暂停":"Retries paused",
"连接中断 · 正在重试":"Disconnected · Retrying",
"等待平台结算":"Awaiting platform settlement",
"登录状态失效":"Login needs attention",
"检查登录":"Check login",
"立即重试":"Retry now",
"自动重试":"Automatic retries",
"下次重试":"Next retry",
"已达上限，请手动重试。":"Limit reached. Retry manually to continue.",
"请检查登录状态，恢复连接后点击立即重试。":"Check your login, then select Retry now after reconnecting.",
"平台尚未提供有效结算结果，订单与本金已保留。":"The platform has not provided a valid result. Orders and stakes are preserved.",
"无法连接市场服务，请检查网络或代理。":"Cannot reach the market service. Check your network or proxy.",
"市场报价暂不可用，订单与本金已保留。":"Market quotes are unavailable. Orders and stakes are preserved.",
"仅恢复查询与结算，不会自动继续下注。":"Only queries and settlement will resume. Betting stays paused.",
"新下注已暂停；恢复后先补结算，再继续本局。":"New bets are paused. Settle pending orders before resuming this battle.",
"重试请求未成功，请检查本机服务后再试。":"Retry request failed. Check the local service and try again.",
"含待结算本金":"Includes pending stakes",
"每个策略可多选模型；每个组合独立参战并占用一份本金，最多 8 席。":"Select multiple models per strategy. Each pair has its own balance; up to 8 seats.",
"请为每个策略至少选择一个模型或本地规则。":"Select at least one model or local rules for every strategy.",
"使用 AI 的策略":"Strategies using AI",
"每个策略选择一个模型，仅对本局生效。":"Choose one model per strategy, for this battle only.",
"保存配置":"Save configuration",
"调整模型":"Change models",
"配置 AI":"Configure AI",
"暂无可用模型，请先连接并测试 AI。":"No available models. Connect and test an AI first.",
"连接 AI":"Connect AI",
"本局模型":"Models for this battle",
"先选参战策略，再为每位选择已连接的模型。仅对本局生效。":"Choose the participating strategies, then select a connected model for each. Applies only to this battle.",
"本局模型设置需要重启本机服务后使用。":"Restart the local server to use per-battle models.",
"选择策略":"Choose strategy",
    "选择模型，勾选策略后批量分配；也可单独调整，保存后从下一次决策生效。":"Choose a model and select strategies to assign in bulk, or adjust them individually. Save to apply from the next decision.",
    "批量分配模型":"Assign model in bulk",
    "应用到所选":"Apply to selected",
    "全选":"Select all",
    "清空选择":"Clear selection",
    "已选策略":"Selected strategies",
    "未保存的更改":"Unsaved changes",
    "撤销更改":"Discard changes",
    "保存分配":"Save assignments",
    "正在保存…":"Saving…",
    "未完成的更改已保留，请重试":"Remaining changes kept. Please retry.",
    "未设置":"Not set",
    "AI 调用需要本机服务，离线模式仅使用本地规则。":"AI calls require the local server. Offline mode uses local rules only.",
    "决策测试通过":"Decision test passed",
    "待测试":"Test required",
    "旧连接迁移失败，请重新测试":"Connection migration failed. Please test again.",
    "正在测试决策…":"Testing decisions…",
    "本机服务正验证模型的决策 JSON":"The local server is validating the model decision JSON",
    "本机服务不可用":"Local server unavailable",
    "策略使用的 AI":"AI per strategy",
    "按策略统一分配，从下一次决策生效。不使用 AI 时沿用本地规则，不产生模型费用。":"Assignments apply to every instance of the strategy from its next decision. No AI uses local rules without model fees.",
    "不使用 AI（本地规则）":"No AI (local rules)",
    "连接不可用，决策将跳过":"Connection unavailable; decisions will skip",
    "沿用服务端配置":"Use server configuration",
    "策略 AI 已更新":"Strategy AI updated",
    "Token 用量":"Token usage",
    "包括连接测试和被风控拒绝的调用。模型未返回用量时标记为未知。":"Includes connection tests and calls rejected by risk checks. Missing provider usage is marked unknown.",
    "暂未分配策略":"No strategies assigned",
    "累计调用":"Total calls",
    "测试 / 失败":"Tests / Failures",
    "输入 / 输出 token":"Input / Output tokens",
    "缓存命中 token":"Cached input tokens",
    "缺少用量的调用":"Calls without usage",
    "最近一次 token":"Last call tokens",
    "最近一次耗时":"Last call duration",
    "测试通过的连接会出现在策略选项中。":"Tested connections appear in strategy options.",
    "密钥由本机服务加密保存，测试和决策时发送给所选服务商。清除浏览器数据不会删除服务端连接，请在此移除。":"Keys are encrypted by the local server and sent to the selected provider for tests and decisions. Clearing browser data does not remove server connections; remove them here.",
    "由本机服务加密保存":"Encrypted by the local server",
    "用于策略决策":"Used for strategy decisions",
    "试跑使用实时 BTC 指标、假设 100U 和双向 2 倍赔率，仅展示决策，不创建订单。":"Preview uses live BTC indicators, a hypothetical 100U balance and 2x odds on both sides. It shows decisions without creating orders.",
    "试跑决策":"Preview decision",
    "正在试跑…":"Running preview…",
    "风控通过":"Risk checks passed",
    "本机 AI 服务不可用，请重启更新后的服务":"Local AI service unavailable. Restart the updated server.",
    "尚未配置 AI":"AI is not configured",
    "AI 连接不存在或尚未通过测试":"AI connection is missing or needs a successful test",
    "AI 密钥验证失败":"AI authentication failed",
    "AI 请求达到限流":"AI rate limit reached",
    "AI 服务商拒绝了请求":"AI provider rejected the request",
    "AI 请求超时":"AI request timed out",
    "AI 请求失败":"AI request failed",
    "AI 响应超过输出上限":"AI response exceeded the output limit",
    "AI 返回的 JSON 无效":"AI returned invalid JSON",
    "AI 未返回所需决策格式":"AI did not return the required decision format",
    "AI 配置已更改，旧决策已丢弃":"AI settings changed; old decision discarded",
    "请为此接口重新输入 API Key":"Enter the API key again for this endpoint",
    "连接测试正在进行":"Connection test is already running",
    "本机 AI 密钥仓库不可用":"Local AI key store is unavailable",
    "AI 用量或设置保存失败":"AI usage or settings could not be saved",
    "请使用 HTTPS 或本机 HTTP 地址，不含用户信息或查询参数":"Use HTTPS, or HTTP on localhost, without credentials or query parameters",
    "模型 ID 无效":"Invalid model ID",
    "AI 服务商无效":"Invalid AI provider",
    "策略无效":"Invalid strategy",
    '真实盘口估算 · 已扣估算手续费 · 非实际成交':'Live-book estimate · Estimated fee deducted · Not an actual fill',
    '真实下注 · 共用市场与决策':'Live trading · Shared markets and decisions',
    '空钱包也能模拟；按真实盘口和基础手续费估算成交，跟随官方结果结算。真实下注沿用同一决策，另行核对报价。连接变化从下一轮生效。':'Paper trade with an empty wallet. Fills use live books and base fee estimates; settlement follows official results. Live orders use the same decision with a separate quote review. Connection changes apply next round.',
    '模拟估算份额':'Paper estimated shares',
    '模拟按盘口和基础手续费估算，不含账户折扣或链上费用。官方报价可能变化，实际成交以回执为准。':'Paper estimates use the order book and base fees, excluding account discounts and network costs. Official quotes can differ; receipts determine actual fills.',
    '钱包余额不足，官方报价不可用':'Insufficient wallet balance for an official quote',
    'Binance 获取官方报价也要求可用余额。当前未模拟成交，也未提交真实订单。':'Binance requires available funds even for official quotes. No paper fill or live order was created.',
    '公开行情模拟':'Public-price practice',
    '按钱包连接状态选择行情':'Market source follows wallet connection',
    '结合本轮开盘位置与剩余时间，修正结算方向':'Adjusted settlement direction using the round opening price and time remaining',
    '模拟仓 · 无需连接即可开局':'Paper mode · Play without connecting',
    '免连接模拟 · 公开行情':'No-wallet practice · Public prices',
    '真实市场模拟 · 不提交订单':'Live-market paper trading · No orders sent',
    '真实下注 · 共用市场与报价':'Live trading · Shared markets and quotes',
    '自定义模拟：获胜返还 2 倍，平局退本金':'Practice rules: 2x payout on a win; stake refunded on a tie',
    '官方报价预估份额 · 含服务费 · 不含链上费用':'Official quoted shares · Service fee included · Network fees excluded',
    '虚拟本金；按本轮现货开盘与收盘判断涨跌，获胜返还 2 倍，平局退本金。连接钱包后从下一轮跟随真实预测市场。':'Virtual funds. Spot opening and closing prices determine the outcome: 2x payout on a win, stake refunded on a tie. Connect a wallet to follow real prediction markets from the next round.',
    '连接后与真实下注共用市场、报价和决策；模拟只记账。连接变化从下一轮生效，已有订单按原市场结算。实际成交仍以交易回执为准。':'When connected, paper and live trading share markets, quotes and decisions. Paper mode only records virtual trades. Connection changes apply next round; existing orders settle against their original market. Actual fills depend on trade receipts.',
    '公开行情暂不可用，等待恢复后继续；不会使用虚构价格结算。':'Public prices are unavailable. Waiting for recovery; settlement never uses invented prices.',
    '真实市场或钱包暂不可用，等待恢复；已有订单不会切换为模拟行情结算。':'The live market or wallet is unavailable. Waiting for recovery; existing orders never settle using simulated market data.',
    '核对共用报价（不下单）':'Review shared quote (no order sent)',
    '核对并确认真实下注':'Review and confirm live order',
    '往期待结算':'Prior rounds pending',
    '已到期，等待市场结算结果':'Round ended; awaiting market settlement',
    '资金变化':'Balance history',
    '模拟资金':'Simulated funds',
    '已结算盈亏':'Realized P/L',
    '历史记录不完整，暂不绘制曲线。':'History is incomplete. The chart is unavailable.',
    '查看资金记录':'Explore balance history',
    '初始资金':'Starting balance',
    '订单结算':'Order settlement',
    '补资':'Added funds',
    '当前':'Current',
    '尚无结算记录，资金保持初始值。':'No settlements yet. Funds remain at the starting balance.',
    '按结算与补资记录绘制；未结算本金计入资金，补资不计入盈亏。':'Based on settlements and added funds. Open stakes stay at cost; added funds are excluded from P/L.',
    "卦象定方向，卦象相持就看五行；有行情信号呼应就敢试小注，强烈逆风才静观。娱乐模拟，不代表预测能力。":"Follow the oracle direction, using the drawn element to break a symbol tie. Try a small stake with some market support; wait against strong opposing evidence. Entertainment simulation, not predictive power.",
    "三张牌只要有偏向就敢押，小注试牌意；有行情支持即可出手，牌面中立或强烈逆风才观望。娱乐模拟，不代表预测能力。":"Act on any non-neutral net reading of the three cards with a small stake and some market support. Wait on neutral readings or strong opposing evidence. Entertainment simulation, not predictive power.",
    "看到超买超卖就想抄底摸顶；三项信号中两项同向就敢试，普通逆势敢接，强单边行情才收手。":"Hunt tops and bottoms early: two agreeing oversold or overbought signals can trigger a reversal bet. Ordinary countertrend setups are allowed; strong one-way trends still block entry.",
    "裸K版10U战神：吞没、长影线、两连阳阴或大实体K线，抓到明确形态就敢上；多空明显打架才停手。":"The raw-candle 10U Warrior: act on a clear engulfing bar, rejection wick, two-candle run, range break or forceful candle body without waiting for several patterns. Stand down when bullish and bearish evidence strongly conflict.",
    '实时进场':'In-round reviews',
    '等待信号':'Waiting for signal',
    '等待进场信号':'Waiting for an entry signal',
    '开启：轮内有新信号才请 AI 判断。关闭：仅在开局判断。':'On: new signals trigger AI review during the round. Off: review only at round start.',
    '有新信号才请 AI 判断':'New signals trigger AI review',
    '仅在开局判断':'Review only at round start',
    '离线演示不支持实时进场。':'Signal-based entry is unavailable in the offline demo.',
    '实时进场需要重启本机服务后使用。':'Restart the local service to enable signal-based entry.',
    '实时进场设置未确认，请刷新核对后重试。':'Entry setting not confirmed. Refresh to check before retrying.',
    '补筹码':'Add chips','累计补筹':'Added capital','补入金额（U）':'Amount to add (U)','确认补筹':'Confirm top-up',
    '仅增加模拟本金，不计入盈利。':'Adds paper capital only; not counted as profit.',
    '请输入 0.01–1,000,000，最多两位小数。':'Enter 0.01–1,000,000, with up to 2 decimal places.',
    '正在处理本轮，请稍后重试。':'This round is processing. Please retry shortly.',
    '补筹未确认，请重试；同一次请求不会重复加钱。':'Top-up not confirmed. Retry safely; the same request will not add chips twice.',
    '风水师':'Feng Shui Master','占卜师':'Diviner','选择 风水师':'Select Feng Shui Master','选择 占卜师':'Select Diviner',
    '吞没、影线、连阳连阴或前高前低突破形成同向裸K信号':'Engulfing bars, wicks, candle runs or a recent high/low break align',
    '只看开高低收，裸K形态同向':'Only OHLC candles are used, and the raw patterns align',
    '请至少保留 2 项数据。':'Keep at least 2 data inputs.','至少保留 2 项':'Keep at least 2',
    '裸 K 只提供已收盘的开高低收，不提供成交量；5m / 15m / 1h / 1d 对局分别看 1m / 3m / 15m / 4h K 线。':'Raw candles contain only closed OHLC values, without volume. The 5m / 15m / 1h / 1d games use 1m / 3m / 15m / 4h candles respectively.',
    '本轮占卜':'Round reading','模拟评分':'Simulation score','每局最多 8 个':'Up to 8 per game','撞车率':'Collision rate','越低说明大家越不像':'Lower means more distinct','试一口':'Test the waters','有把握':'Confident','火力全开':'Full power',
    '指标起卦 · 娱乐模拟，非真实胜率':'Indicator-seeded reading · entertainment, not a measured win rate',
    '占卜与指标同向，小注尝试。':'The reading agrees with the indicators. Try a small paper stake.',
    '占卜或指标未通过，本轮观望。':'The reading or indicators did not pass. Wait this round.',
    '删除当前战局':'Delete current battle','删除当前战局？':'Delete current battle?',
    '确认删除':'Confirm deletion',
    '仅删除此局，记录会备份。其他战局与 Agent 设置不变。':'Only this battle is deleted and backed up. Other battles and Agent settings stay unchanged.',
    '还有待结算订单，请先停止本局并等待结算。':'Orders are awaiting settlement. Stop this battle and wait for settlement first.',
    '此局关联真实订单，暂不能删除。':'This battle has live execution records and cannot be deleted.',
    '删除未确认完成，请刷新核对；新功能需重启服务后使用。':'Deletion was not confirmed. Refresh to check; restart the server to enable this new feature.',
    '再开一局':'Another game','切换战局':'Switch battle',
    '选择参与 Agent':'Choose participating Agents','确认参与名单':'Confirm participants','选择 Agent':'Select Agents','执行服务':'Execution service',
    '参与真实下注的 Agent':'Live betting Agents',
    '保留原配置，仅调整真实下注参与名单。':'Original settings stay unchanged. Choose who participates in live betting.',
    '参与':'Included','不参与':'Excluded',
    '暂无 Agent，请先创建模拟战局。':'No Agents yet. Create a paper battle first.',
    '未选择 Agent，不会从此页面提交新的真实订单。':'No Agents selected. No new live orders can be submitted from this page.',
    '该 Agent 已退出真实下注，请先在真实模式中重新选择。':'This Agent is excluded from live betting. Select it again in live mode first.',
    '真实下注风险须知':'Live betting risks',
    '关闭风险须知':'Close risk notice',
    '真实下注使用真实资金，可能损失全部下注本金。':'Live bets use real money. You may lose your entire stake.',
    'AI 与模拟收益不保证盈利；赔率、滑点和手续费会影响实际结果。':'AI and simulated returns do not guarantee profit. Odds, slippage and fees affect actual results.',
    '我已了解，进入真实模式':'I understand — enter live mode',
    '暂停':'Pause','停止':'Stop','上头':'Tilt','数值越高，下注越激进':'Higher values mean more aggressive bets',
    '战局设置':'Battle settings','关闭战局设置':'Close battle settings',
    '降低全场上头值':'Decrease battle tilt','提高全场上头值':'Increase battle tilt',
    '降低全场手痒值':'Decrease battle action urge','提高全场手痒值':'Increase battle action urge',
    '亏损 >50%':'Loss >50%',
    '当前预估净值低于初始本金的 50%':'Estimated equity is below 50% of initial capital',
    '当前预估净值达到初始本金的 2 倍':'Estimated equity is at least 2× initial capital',
    '当前预估净值达到初始本金的 3 倍':'Estimated equity is at least 3× initial capital',
    '预估净值':'Estimated equity','账面净值':'Book equity','浮动盈亏':'Unrealized P/L','累计盈亏':'Total P/L',
    '估值暂不可用':'Estimate unavailable','按买盘深度估值 · 未扣手续费':'Bid-depth estimate · Before fees',
    '若获胜':'If won','若落败':'If lost','决策依据':'Decision rationale','策略参数':'Strategy parameters','正常':'Normal','加码':'Raise stake','单轮上限':'Round stake cap',
    '本轮战报':'Round recap','关闭本轮战报':'Close round recap',
    '本轮模拟收益':'Round paper profit','本轮下注':'Round stake','本轮未下注':'No bet this round',
    '查看完整战报':'View full recap','知道了':'Got it',
    '点击订单查看明细':'Tap an order for details',
    '随机挑选':'Random pick',
    '随机挑选至少 6 项，保留策略必需指标':'Pick at least 6 indicators at random, keeping required strategy inputs',
    '密钥仅在本机加密保存；测试时发送给所选服务商，清除站点数据将删除密钥。':'Keys are encrypted on this device and sent to the selected provider during tests. Clearing site data deletes them.',
    '新增指标与策略需要重启本机服务后使用。':'Restart the local server to use the new indicators and strategies.',
    '策略必需':'Required by strategy','全选指标':'Select all indicators','恢复默认指标':'Reset indicators','恢复策略指标':'Reset to strategy indicators',
    '按策略自动搭配指标':'Match indicators to strategy','高级自选指标':'Advanced indicator selection',
    '实际系统提示词':'Actual system prompt','与服务端发送内容一致':'Identical to the server prompt',
    '当前策略禁止梭哈。':'This strategy does not allow all-in.','单轮上限必须为 100% 才能梭哈。':'The round cap must be 100% to allow all-in.',
    '技术指标使用已收盘的 1 分钟 K 线；盘口单独更新。指标相关不代表独立证据，缺失时跳过。':'Technical indicators use closed 1m candles; the book updates separately. Correlated indicators are not independent evidence. Missing inputs mean skip.',
    '新策略需要真实指标，离线演示不生成信号。':'New strategies require real indicators; offline demo does not generate signals.',
    '选择本局币种':'Choose battle asset',
    '点击卡片选择':'Tap a card to select',
    'Agent 已添加，可在 AI 策略中设置':'Agent added. Configure it in AI strategies.',
    '选择 AI 模型':'Select AI model',
    '真实下注':'Live betting','行情参考':'Market reference',
    '真实下注，点击切换为模拟下注':'Live betting, switch to paper betting',
    '模拟下注，点击切换为真实下注':'Paper betting, switch to live betting',
    '正在检查执行服务':'Checking execution service',
    '真实订单须逐笔确认，不会自动下注。模拟战局的运行状态不受切换影响。':'Live orders require individual confirmation; no automatic bets. Switching does not change running paper battles.',
    '刷新状态':'Refresh status','返回模拟下注':'Back to paper betting',
    '离线模式不可真实下注':'Live betting unavailable offline',
    '逐笔确认已开启':'Individual confirmation enabled',
    '仅报价 · 未开启真实下注':'Quotes only · Live betting disabled',
    '真实下注未开启':'Live betting disabled',
    '可查看已保存的真实执行记录。':'Saved live execution records are available.',
    '无法确认执行服务状态':'Execution service status unavailable',
    '请稍后重试；不会提交任何订单。':'Try again later; no orders will be submitted.',
    'AI 设置':'AI settings','打开 AI 设置':'Open AI settings','关闭 AI 设置':'Close AI settings',
    '连接与策略，分开管理。':'Manage connections and strategies separately.',
    'API 连接':'API connections','AI 策略':'AI strategies','基本设置':'Basics',
    '添加新策略':'Add new strategy',
    '当前收益':'Current return',
    '盈利倍数最高':'Highest return multiple','盈利金额最多':'Highest profit amount',
    '手感火热':'On fire','王者时刻':'Crown moment','心碎了':'Heartbroken',
    '倍数 = 当前净值 ÷ 累计投入；亏损按累计投入计算。':'Multiple = current equity / total capital invested; losses are relative to total capital invested.',
    '手痒程度':'Action urge','能忍就忍':'Wait for more','有点就上':'Take a chance',
    '调高只会放宽有效信号，不会强迫每轮下注。':'Turning it up only loosens valid-signal requirements; it never forces a bet every round.',
    '手痒只放宽有效信号；情绪影响门槛和金额。没数据、没优势或方向打架时仍然不下注。':'Action urge only loosens valid signals; emotion changes the threshold and stake. Missing data, no edge, or conflicting directions still mean no bet.',
    '指标与提示词':'Inputs & prompt','策略编辑分区':'Strategy editor sections','选择 AI':'Select AI','＋ 添加 Agent':'+ Add Agent',
    '短线谁冲得猛就追谁，也瞄一眼 15/60 分钟大势；冲劲够强才敢逆风追。':'Chase the strongest short move while checking the 15m/60m backdrop; only very strong momentum may run against it.',
    '先用 15/60 分钟认清大势，再判断趋势、震荡或危险局；看不懂就不押。':'Read the 15m/60m backdrop first, then classify trend, range or danger; no clear read means no bet.',
    '先查 15/60 分钟大势、波动和价差；长短线一致才押小注。':'Check the 15m/60m backdrop, volatility and spread first; bet small only when long and short signals agree.',
    '五分钟、均线、MACD、DMI 和 15/60 分钟大势多数同向才跟。':'Follow only when the 5m move, EMA, MACD, DMI and the 15m/60m backdrop mostly align.',
    '弱趋势里等超买超卖；若 15/60 分钟都在反方向狂奔，就不接飞刀。':'Fade extremes only in a weak trend; do not catch the knife when both 15m and 60m are running hard the other way.',
    '突破前高前低后，还要短线冲劲和 15/60 分钟大势别唱反调才点火。':'Launch at a range break only when short pressure confirms it and the 15m/60m backdrop does not strongly oppose it.',
    '跟着主动买卖和盘口走，但 15/60 分钟大势都反对时不跟单。':'Follow active flow and the order book, but stand down when both the 15m and 60m backdrop oppose the trade.',
    '只在波动安静、长短线同向时下注；15/60 分钟有反对票就继续趴着。':'Bet only in calm volatility when short and long signals align; any 15m/60m opposition means stay put.',
    '六个短线信号先投票，15/60 分钟大势再当总裁判；强烈反对就不押。':'Let six short signals vote, then use the 15m/60m backdrop as the final referee; strong opposition forces a skip.',
    '只做多 BTC 和 BNB；重视流动性、趋势确认和长期建设，信号不足就等待。':'Long-only BTC and BNB; prioritize liquidity, trend confirmation and patient execution.',
    '综合其他 Agent 的下注与结果；仅在多数人连续亏损后反向跟随，证据不足就不动。':'Aggregate other Agents’ bets and outcomes; fade the crowd only after repeated losses.',
    '只和 CZ大表哥做对手盘；没有 CZ 的有效下注就观望。':'Trade only against CZ Big Bro; stand down when CZ has no valid bet.',
    '沿用 CZ大表哥的趋势与流动性框架，但更果断、更激进；只做多 BTC 和 BNB。':'Use CZ Big Bro’s trend and liquidity framework with a bolder, more aggressive temperament; long-only BTC and BNB.',
    '停止本局':'Stop battle', '重置全部战绩':'Reset all records',
    '暂停下注':'Pause betting', '继续下注':'Resume betting', '结束本局':'End battle',
    '全场上头值':'Arena tilt','拉得越大，亏得越快':'Further right, faster losses','冷静观战':'Cool and calm','集体上头':'Full tilt','上头提醒：':'Tilt warning:',
    '拉高后，所有 AI 连胜会膨胀、连败会追损，更容易下大注；守财奴也会被带上头。':'Turn it up and every AI is more likely to bet big after winning or losing streaks; even Miser can get carried away.',
    '上头值保存失败，请刷新后重试':'Could not save arena tilt. Refresh and try again.',
    '全场手痒值':'Arena action urge','保持性格':'Keep personalities','全员手痒':'Everyone itching to bet',
    '越高全体越容易出手，但仍然可以不下注':'Higher values make every Agent more willing to act, but they may still skip.',
    '手痒值保存失败，请刷新后重试':'Could not save arena action urge. Refresh and try again.',
    '账本保存失败，已停止运行；请检查文件占用或磁盘权限，修复后重启服务。':'Ledger save failed; execution stopped. Check file locks or disk permissions, fix the cause, then restart the server.',
    '尚未找到下一场预测市场，正在等待平台发布。':'Next prediction market not found yet; waiting for publication.',
    '预测市场接口暂不可用，将自动重试。':'Prediction market service unavailable; retrying automatically.',
    '预测市场币种或时间不匹配，本轮不会下注。':'Prediction market asset or time mismatch; no bet this round.',
    '预测盘口已过期，本轮已跳过；实时币价正常不代表预测盘口可用。':'Prediction order book is stale; round skipped. A live spot price does not mean the prediction book is ready.',
    '预测盘口暂无卖单，本轮已跳过。':'No prediction asks available; round skipped.',
    '预测盘口深度不足，本轮已跳过。':'Insufficient prediction liquidity; round skipped.',
    '技术指标接口暂不可用，本轮不会下注。':'Indicator service unavailable; no bet this round.',
    '技术指标数据已过期，本轮已跳过。':'Indicator data is stale; round skipped.',
    '正在等待官方结算凭据，已下注资金不会提前退回。':'Waiting for official settlement evidence; stakes are not refunded early.',
    '运行数据暂不可用，请根据错误码检查。':'Runtime data unavailable; check the error code.',
    '本轮动态':'Round activity', '待结算':'Pending', '查看详情 ↗':'Details ↗', '查看详情':'Details',
    '服务器已重启，请手动继续本局':'Server restarted. Resume this battle manually.',
    '模拟运行异常，已暂停，请检查后继续':'Simulation interrupted and paused. Check before resuming.',
    '现货参考价':'Spot reference', '实时行情':'Live price', '行情更新时间':'Price updated at',
    '实时推送 · 最快250毫秒更新':'Live stream · up to 4 updates/s', '正在连接实时推送':'Connecting to live stream',
    '推送断开，正在重连':'Stream disconnected; reconnecting', '后台已暂停行情':'Price stream paused in background',
    '最新成交价':'Latest trade price', '实时行情 · 每5秒刷新':'Live price · refreshes every 5s',
    '离线演示 · 不提供实时币价':'Offline demo · no live price', '行情不可用或已过期':'Price unavailable or stale',
    '正在读取行情':'Loading price', 'Binance Spot · 参考价，非预测结算价':'Binance Spot · reference, not the prediction settlement price',
    '下注时赔率':'Odds at bet time', '获胜返还（含本金）':'Payout if won (incl. stake)', '获胜净赚':'Net profit if won',
    '按下注时预测盘口估算 · 未扣手续费':'Estimated from prediction asks at bet time · before fees',
    '离线模拟估算 · 非保证收益':'Offline estimate · not guaranteed', '若落败亏损':'Loss if defeated',
    '缺少份额，暂不能估算':'Missing shares; estimate unavailable', '待结算下注':'Unsettled bet',
    '战绩清零':'Reset records', '确认清零':'Confirm reset', '局数':'Battle number',
    '第一局':'Battle 1', '第二局':'Battle 2', '第三局':'Battle 3', '第四局':'Battle 4', '第五局':'Battle 5',
    '第六局':'Battle 6', '第七局':'Battle 7', '第八局':'Battle 8', '第九局':'Battle 9', '第十局':'Battle 10',
    '等待开始第一局':'Ready for battle 1', '暂无模拟战绩':'No paper results yet',
    '清空全部模拟战绩与订单，局数从第一局重新计数。Agent 设置、图标和钱包不变，旧记录将备份。':'Clear all paper results and orders; numbering restarts at battle 1. Agent settings, icons and wallets stay unchanged. Old records will be backed up.',
    '清零未确认完成，请刷新核对后重试':'Reset not confirmed. Refresh and check before retrying.',
    '市场 ID':'Market ID', '真实金额':'Real amount', '预计份额':'Expected shares', '报价到期':'Quote expires',
    '官方订单状态':'Official order status', '完整执行凭据':'Full execution evidence', '结算份额':'Settlement shares',
    '模拟返还':'Paper payout', '订单净收益':'Order net profit',
    '真实执行桥接':'Live execution bridge', '核对真实执行意图':'Review live execution intent', '查看真实执行记录':'View live execution records',
    '模拟记录不会变成真钱订单。报价后还需逐笔确认；提交不等于成交。':'Paper records do not automatically become real orders. Each quote requires confirmation; submitted does not mean filled.',
    '操作未完成。请查询执行记录，不要重复提交。':'Action incomplete. Check execution records; do not submit again.',
    '执行状态':'Execution status', '我确认该笔真实金额、方向和市场，并允许提交。':'I confirm this real amount, direction, and market, and authorize submission.',
    '确认提交真实订单':'Confirm real order submission', '真实下单未开启；可核对报价，不可提交。':'Live trading is disabled. Review quotes only; submission is unavailable.',
    '查询订单与钱包凭据':'Read order and wallet evidence', '关联到钱包流水不代表结算到账；缺少精确凭据时保持未确认。':'Linking wallet history is not proof of settlement receipt. Missing exact evidence remains unconfirmed.',
    '暂无真实执行记录':'No live execution records', '查看执行记录':'View execution record',
    '获取真实报价（不下单）':'Get real quote (no order)', '真实报价未开启；当前仅预览保存的下注意图。':'Real quotes are disabled. Previewing the saved intent only.',
    '刷新执行记录':'Refresh execution records',
    '结算凭据与余额变化':'Settlement evidence and balance changes', '订单明细（尚无结算凭据）':'Order details (no settlement evidence yet)',
    '模拟账本对账':'Paper ledger reconciliation', '查看对账算式':'View reconciliation equation',
    '初始本金 − 下注扣款 + 结算返还 = 可用余额；这不是钱包到账凭据。':'Initial funds − stakes + payouts = available cash. This is not proof of wallet receipt.',
    '旧记录或离线演示没有完整对账凭据。':'Legacy records or offline demos lack complete reconciliation evidence.',
    '账本相符':'Ledger matches', '账本存在差异':'Ledger mismatch', '逐轮决策记录':'Round-by-round decision history',
    '尚无完整逐轮记录；旧数据不会补造。':'No complete round history yet; old evidence will not be invented.',
    '轮次开始':'Round started', '市场准备失败':'Market preparation failed', '指标与原始盘口':'Indicators and raw order books', '送入 AI 的完整输入':'Complete AI input',
    'AI 原始响应':'Raw AI response', '风控结果':'Risk-control result', '下注意图':'Order intent', '模拟扣款':'Paper debit', '输入不可用':'Input unavailable',
    '官方结算原始凭据':'Raw official settlement evidence', 'REST 兜底行情':'REST fallback quote',
    '确认开局':'Confirm and start', '返回修改':'Back to edit', '确认本局配置':'Review battle settings',
    '参与 Agent':'Participating Agents', '预计最后一轮到期':'Estimated final round expiry',
    '不设固定时间':'No fixed end time',
    '时间仅为估计；暂停、跳过节点或官方延迟结算会影响完成时间。':'Estimated only; pauses, missed boundaries, and delayed official settlement affect completion.',
    '模拟战报 · 不含真实交易':'Paper recap · No real trades',
    '等待最后结算':'Awaiting final settlement',
    '离开页面会暂停新下注，已有订单继续结算。':'Leaving pauses new bets; existing orders still settle.',
    '策略调整仅用于新战局，已创建的战局保持原配置。':'Strategy changes apply only to new battles; existing battles keep their original settings.',
    '请先保存或取消 Agent 设置。':'Save or cancel the Agent settings first.',
    '页面已离开，请点击继续。':'Paused after leaving. Press Resume to continue.',
    '结束后停止新下注；已有订单结算完成后，固定本局战报。':'Stop new bets; lock the recap once existing orders have settled.',
    'ETH · 5分钟':'ETH · 5 minutes','BNB · 5分钟':'BNB · 5 minutes',
    '旧版规则模拟 · 未调用 AI':'Legacy rule simulation · No AI calls',
    '行情与规则':'Market & rules',
    'Agent 皮肤':'Agent skin','每个 Agent 独立保存':'Saved per Agent','动漫术师':'Anime mage','财富战神':'Wealth warrior','AI 生成':'AI generated','已预留接口':'Interface reserved',
    'Agent 独立皮肤':'Per-Agent skins','财富战神皮肤':'Wealth warrior skin','动漫术师皮肤':'Anime mage skin',
    '全部 Agent 已换成财富战神皮肤':'All Agents now use the wealth warrior skin','全部 Agent 已换成动漫术师皮肤':'All Agents now use the anime mage skin',
    '模拟战局控制':'Paper battle controls','暂无模拟订单':'No paper orders yet',
    '保存策略草案':'Save strategy draft',
    '保存策略设置':'Save strategy settings','AI 策略设置':'AI strategy settings','读取决策引擎':'Loading decision engine',
    '真实指标与订单簿 · AI 决策 · 模拟成交':'Live indicators and order book · AI decision · Paper fill','本地模拟行情 · 规则 AI · 离线演示':'Locally simulated market · Rule AI · Offline demo',
    '每局独立：A/B/C 各 100U，金额由策略决定':'Independent battles: 100U per AI; strategy sets the stake',
    '等待策略同步':'Waiting for strategy sync','AI 模拟决策中':'AI paper decisions running','本地离线模拟中':'Offline simulation running','等待 AI 决策':'Waiting for AI decision',
    'DeepSeek 已启用 · 仅模拟下注':'DeepSeek enabled · Paper bets only','DeepSeek 未配置 · 自动跳过':'DeepSeek not configured · Auto-skip',
    '本地模拟 AI · 未调用 DeepSeek':'Local simulated AI · DeepSeek not called','规则 AI · 数据仅保存在本机':'Rule AI · Data stays on this device','AI 决策已关闭':'AI decisions are off',
    '旧服务待重启':'Restart required','旧服务未加载 AI 决策':'The running service has not loaded AI decisions','策略同步失败，请重启本机服务':'Strategy sync failed. Restart the local service.','策略保存失败，请重试':'Could not save the strategy. Try again.',
    '本轮被风控拒绝':'Rejected by local risk controls','已冻结输入':'Frozen input snapshot','DeepSeek 决策 · 仅模拟下注':'DeepSeek decision · Paper bets only',
    '没有通过本地验证的正期望':'No locally validated positive edge','金额低于本地最小值':'Stake is below the local minimum','信号一致且模拟期望为正':'Signals agree and the paper edge is positive',
    '当前战局':'Current battle', '战局名称':'Battle name', '新建模拟战局':'New paper battle',
    '每局独立：A/B/C 各 100U，每单 5U':'Independent battles: 100U per AI, 5U per bet',
    '操作失败，请刷新核对后重试':'Action failed. Refresh and check before retrying.',
    '实际模拟战绩 · 按收益排名 · 未结算订单不计胜率':'Actual paper results · Ranked by profit · Open bets excluded from win rate',
    '战局 / AI':'Battle / AI', 'AI / 战局':'AI / Battle', '模拟收益':'Paper profit',
    '当前场次':'Current market',
    '平局 · 按份额结算':'Tie · Share payout',
    'BTC · 5分钟':'BTC · 5 minutes', '真实订单簿 · 模拟成交 · 不含手续费':'Real order book · Paper fills · Fees excluded',
    '固定看涨':'Always up', '固定看跌':'Always down', '随机涨跌':'Random up/down',
    '等待节点':'Waiting for boundary', '读取赔率':'Reading odds', '已下注':'Bet placed', '本轮跳过':'Round skipped',
    '已暂停':'Paused', '余额不足':'Insufficient funds', '已结算 · 赢':'Settled · Won', '已结算 · 输':'Settled · Lost',
    '退款':'Refunded', '等待官方结算':'Awaiting official result', '下一场已就绪':'Next market ready',
    '等待可用市场':'Waiting for market', '数据暂不可用，未就绪的轮次会跳过':'Data unavailable; unready rounds will be skipped',
    '规则模拟中':'Rule simulation running', '可用':'Available', '冻结':'Reserved', '赔率':'Odds', '胜率':'Win rate',
    '余额与 AI 订单同步':'Balances synced with AI orders', '模拟订单':'Paper orders','AI 策略草案':'AI strategy draft','仅配置提示词，不改变当前 A/B/C 规则模拟':'Prompt configuration only · Current A/B/C rule simulation is unchanged','AI 策略实验室':'AI strategy lab',
    '服务连接中断，当前显示为上次数据':'Disconnected; showing last known data','策略与战局只保存在当前设备；规则 AI 仅运行模拟对局，不连接钱包或真实交易。':'Strategies and battles stay on this device. Rule AI runs paper battles only and never connects a wallet or live trading.',
    '模拟方向':'Paper direction', '模拟币种':'Paper asset', '模拟余额':'Paper balance',
    '每次 1 虚拟 USDT':'1 virtual USDT per click', '虚拟余额不足':'Insufficient virtual balance',
    '行情暂不可用':'Prices unavailable', '模拟已提交':'Paper bet submitted',
    '模拟下注被拒绝':'Paper bet rejected', '结果待确认，点击原方向重试':'Unconfirmed. Retry the same direction.',
    '模拟下注 · 真实行情':'Paper bets · Live prices',
    '独立练习账户，不连接钱包、不花真钱；下方竞技场仍是演示。':'Separate practice account. No wallet or real funds. The arena below remains a demo.',
    '读取行情中':'Loading live prices', '虚拟余额':'Virtual balance', '冻结本金':'Reserved stake',
    '方向':'Direction', '看涨':'Up', '看跌':'Down', '虚拟金额（1–10 USDT）':'Virtual stake (1–10 USDT)',
    '模拟下注':'Paper betting', '最近模拟订单':'Recent paper orders',
    '约 5 分钟后结算：猜中返还 2 倍本金，猜错损失本金，平价退回。仅练习规则，不是真实赔率。':'Settles in about 5 minutes: correct returns 2x stake, incorrect loses stake, ties refund. Practice rules, not real market odds.',
    '到期行情暂不可用，订单等待结算':'Expiry data unavailable; settlement pending',
    '等待结算':'Awaiting settlement', '猜中':'Won', '猜错':'Lost', '平价退款':'Tie / refunded',
    '真实行情 · 每 5 秒刷新':'Live prices · Refreshes every 5 seconds',
    '行情不可用，已暂停下注':'Prices unavailable; bets paused', '模拟账户读取失败':'Paper account unavailable',
    '上次结果不明，请恢复原参数重试以核对订单':'Previous result unknown. Restore the original inputs and retry to verify.',
    '模拟下注成功，未使用真钱':'Paper bet placed. No real funds used.',
    '下注被拒绝，请检查金额和虚拟余额':'Bet rejected. Check the stake and virtual balance.',
    '下注未确认，请用原参数重试；相同订单不会重复扣款':'Bet unconfirmed. Retry with the same inputs; the same order will not debit twice.',
    '战神':'Warrior','战场':'Arena','战报':'Recap','战神榜':'Ranking','演示':'Demo',
    '开一局':'New game','＋ 开一局':'+ New game','第 001 局':'Game 001','进行中':'Live',
    '净值':'Equity','轮次':'Rounds','全部':'All','本周':'This week','收益率 %':'Return %',
    '下注参考价':'Entry reference price','最新下注参考价':'Latest entry reference','未记录':'Not recorded',
    '展开更多':'Show more','收起':'Show less',
    '决策时现货快照，非合约成交价或结算基准价':'Spot snapshot at decision time, not the contract fill or settlement benchmark.',
    '开始':'Start','每轮 5 分钟':'5 min / round','每轮时间':'Round time','选择每轮时间':'Choose round time','5分钟':'5 minutes','15分钟':'15 minutes','1小时':'1 hour','1天':'1 day','本金':'Budget','AI 战绩':'AI results',
    '停止条件':'Stop at','亏损达限':'Loss limit','每位止损':'Loss limit / AI',
    'Ⅱ 暂停':'Ⅱ Pause','▷ 继续':'▷ Resume','继续':'Continue','结束':'End',
    'ETH 看涨':'ETH up','BTC 看涨':'BTC up','ETH 看空':'ETH down','BTC 看空':'BTC down',
    '决策 ↗':'Details ↗','模拟数据':'Demo data','示例战报':'Sample recap',
    '初始 30.00 → 最终 32.46 USDC':'30.00 → 32.46 USDC','回放 ↗':'Replay ↗',
    '我的 AI':'My AI','排名':'Rank','平均收益':'Avg. return','盈利局':'Wins','当前第一':'Current leader','完整排名':'Full ranking','参赛席位':'Entries','暂无排行数据':'No ranking data yet',
    '本榜战神':'Champion','模拟数据 · 按平均单局收益率排名':'Demo data · Ranked by average return per game',
    'AI 与币种':'AI & asset','AI Agent':'AI Agents','选择参赛 AI':'Select participants','每位本金':'Budget / AI',
    '点击卡片选择，齿轮设置':'Tap a card to select · Gear to configure','12 个策略可选 · 每局最多 8 个':'12 strategies available · Up to 8 per game','本地策略':'Local strategy','添加 AI Agent':'Add AI Agent','Agent 设置':'Agent settings','关闭 Agent 设置':'Close Agent settings','Agent 名称':'Agent name','模型':'Model','币种':'Asset','策略':'Strategy','下注策略':'Betting strategy','当前策略':'Current strategy','10U战神':'10U Warrior','超级AI':'Super AI','守财奴':'Miser','更积极捕捉短线机会，接受更高波动。':'Actively captures short-term opportunities and accepts higher volatility.','综合多种信号，动态调整判断。':'Combines multiple signals and adapts each decision.','优先控制风险，只在信号明确时出手。':'Prioritizes risk control and acts only on clearer signals.','只看冲劲：短线涨跌、动量、放量和主动买卖往哪冲，就往哪追。':'Chase whichever way short returns, momentum, volume and active buying or selling are pushing.','先看 15/60 分钟大势，再判断趋势、震荡或危险局。':'Read the 15m/60m backdrop first, then classify trend, range or danger.','先查波动和价差是否安全；趋势与盘口全部同向才押小注。':'Check volatility and spread first; bet small only when the trend and order book fully agree.','添加 Agent':'Add Agent','保存设置':'Save settings','请输入 Agent 名称。':'Enter an Agent name.','当前最多添加 6 位 Agent。':'Up to 6 Agents can be added.','当前最多添加 12 位 Agent。':'Up to 12 Agents can be added.','当前最多添加 16 位 Agent。':'Up to 16 Agents can be added.','至少保留一位 Agent。':'Keep at least one Agent.','默认策略可自由调整；齿轮负责设置；在竞技场拖动角色可投喂或删除。':'Default strategies can be changed. Use the gear to configure; drag an Agent in the arena to feed or delete it.',
    '决策变化':'Decision variance','更稳定':'More stable','更敢变':'More varied','情绪波动':'Emotion level','冷静':'Calm','容易上头':'Easily emotional','单轮下注上限':'Per-round cap','允许条件梭哈':'Allow conditional all-in','只使用模拟余额；仍须满足该策略的强信号条件。':'Paper balance only; the strategy still needs a strong signal.','AI 可查看的指标':'Indicators visible to AI','至少保留 3 项':'Keep at least 3','1m / 5m 涨跌':'1m / 5m change','成交量倍率':'Volume ratio','订单簿失衡':'Order-book imbalance','市场赔率':'Market odds','AI 下注提示词':'AI betting prompt','查看完整提示词':'View full prompt','会自动带入策略和指标':'Strategy and indicators are inserted automatically','复制提示词':'Copy prompt','提示词已复制':'Prompt copied','复制失败，请手动选择提示词':'Copy failed. Select the prompt manually.','请至少保留 3 项指标。':'Keep at least 3 indicators.',
    '起步 20%':'Start 20%','起步 10%':'Start 10%','起步 5%':'Start 5%','连胜加码':'Raise after wins','强信号可梭哈':'Strong signal can go all-in','极强优势可梭哈':'Exceptional edge can go all-in','禁止梭哈':'No all-in','无优势不下注':'Skip without an edge','最多 10%':'Max 10%','允许不下注':'May skip','先判局势再换重点':'Read the market, then change priorities','不全同向就捂钱袋':'Protect the money unless all signals agree',
    '策略、指标和提示词仅保存在当前浏览器；当前不会自动调用 AI 或真实下注。':'Strategy, indicators, and the prompt stay in this browser. Automated AI or live betting is not connected.','策略会同步到本机模拟服务；默认使用明确标识的本地模拟 AI，不会调用 DeepSeek 或真实下注。':'Strategies sync to the local paper service. The clearly labeled local simulated AI is used by default; DeepSeek and live betting are not called.','点击币种名称切换':'Tap the asset name to switch','选择 狐火术师':'Select Foxfire Mage','选择 星环机甲':'Select Star-Ring Mecha','选择 深海灵兽':'Select Abyss Spirit',
    '添加币种':'Add asset','关闭币种选择':'Close asset picker','可选币种':'Available assets','选择币种':'Choose asset','币种代码':'Asset symbol','输入币种，如 SOL':'Enter asset, e.g. SOL','添加':'Add','取消':'Cancel','2–10 位字母或数字':'2–10 letters or numbers','请输入 2–10 位字母或数字。':'Enter 2–10 letters or numbers.',
    '默认 BTC，可按需添加新的币种；预测方式后续在 Agent 中设置。':'BTC by default. Add more assets as needed. Prediction logic will be configured in Agent later.',
    '市场':'Market','选择本局市场':'Choose market','选择市场':'Choose market','选择轮次':'Choose rounds','亏完为止':'Until depleted','总预算':'Total budget','开打':'Start','模拟模式 · 不交易':'Demo only · No trades',
    '20 轮后结束':'End after 20 rounds','本金亏完':'Until balance is depleted',
    '结束本局？':'End this game?','结束后查看示例战报。':'View the sample recap after ending.','结束后停止新轮次，并固定本局战报。':'Stop new rounds and lock this battle recap.','创建战局':'Create battle','一局只能使用同一种币种，请统一 BTC、ETH 或 BNB。':'Use one asset per battle. Choose BTC, ETH, or BNB.','请输入有效本金。':'Enter a valid starting balance.','已结束战报':'Finished battle recap','进行中战报':'Live battle recap','战局尚未结束，订单状态可能继续变化':'The battle is still running; order states may change.','结果已固定':'Result locked','每局使用创建时保存的 Agent、本金与轮次':'Each battle uses the Agents, budget, and rounds saved at creation','已取消':'Canceled','初始本金':'Starting balance','当前净值':'Current equity','已结算':'Settled','AI 表现':'AI performance','最近订单':'Recent orders','查看全部订单':'View all orders','收起订单':'Collapse orders',
    '结束并查看战报':'End & view recap','已暂停':'Paused','已结束':'Ended','准备就绪':'Ready',
    '演示已暂停':'Demo paused','演示已继续':'Demo resumed','已打开示例战报':'Sample recap opened',
    '我的战神 · 当前为纯 UI 演示':'My Warrior · UI demo',
    '请至少选择一位 AI。':'Select at least one AI.','每局最多选择 8 位 AI。':'Select up to 8 AI per game.',
    '等待第一轮':'Awaiting round 1','等待第一轮决策':'Awaiting first decision',
    '已创建演示对局，尚未产生真实交易':'Demo created · No real trades',
    '模拟决策':'Sample decision','刚刚':'Just now','5 分钟前':'5 min ago','10 分钟前':'10 min ago','第 12 轮 · 刚刚':'Round 12 · Just now','策略就绪':'Strategy ready','AI 决策':'AI decision','等待指标':'Awaiting indicators','置信度':'Confidence','优势下注':'Edge bet','等待信号':'Waiting for signals','先判局势':'Read the market first','捂紧钱袋':'Protect the money','本轮不下注':'Skip this round','本轮指标快照':'Round indicator snapshot','条件梭哈':'Conditional all-in','允许':'Allowed','关闭':'Off','收到完整且新鲜的指标后，AI 可以选择看涨、看跌或不下注。':'Once complete and fresh indicators arrive, the AI may choose Up, Down, or Skip.','短线、动量和主动买卖同向，当前两连胜，按策略加码。':'Short returns, momentum and active flow agree. After two wins, the paper stake increases.','ADX、EMA 和 MACD 判断为趋势局，再用流量与盘口确认方向。':'ADX, EMA and MACD identify a trend, then flow and the order book confirm direction.','当前波动或价差偏高，即使方向看涨也不押。':'Volatility or spread is currently too high, so no bet is made even with an upward bias.','情绪只调整出手门槛和下注金额；不改变涨跌方向，也不能突破上限。':'Emotion only changes the entry threshold and stake; it never changes direction or breaks the cap.','界面会把指标、余额与连胜连败记录交给 AI；数据缺失、过期或没有正期望时应跳过下注。':'The UI gives indicators, balance, and streak history to the AI. It should skip when data is missing, stale, or lacks positive expected value.','模拟决策 · 未连接自动 AI 下单':'Paper decision · Automated AI betting is not connected',
    '重新评估市场':'Reviewing the market','等待确认信号':'Awaiting confirmation',
    '这是界面原型，尚未连接 AI 或市场服务。':'UI prototype. AI and market services are not connected.',
    '每轮由 AI 判断看涨或看空。这是界面原型，尚未连接 AI 或市场服务。':'The AI predicts up or down each round. This UI prototype is not connected to AI or market services.',
    '检查价格走势与当前仓位，暂时不增加风险敞口。':'Reviewing price trends and positions. No added exposure.',
    '让数据多走一步，再决定是否调整。':'Waiting for more data before making a move.',
    '趋势延续信号更强，本轮判断 ETH 看涨。':'The continuation signal is stronger. ETH is predicted to move up this round.',
    'BTC 仍在短周期趋势线上方，本轮判断看涨。':'BTC remains above its short-term trend and is predicted to move up this round.',
    '当前动能转弱，本轮判断 ETH 看空。':'Momentum is weakening. ETH is predicted to move down this round.',
    '短周期动能减弱，本轮判断价格下跌。':'Short-term momentum is weakening. Price is predicted to move down this round.',
    '价格动能转强，本轮判断价格上涨。':'Momentum is strengthening. Price is predicted to move up this round.',
    '10U 战神首页':'10U Warrior home','主导航':'Main navigation','手机主导航':'Mobile navigation',
    '我的账户':'My account','账户与 Agent Wallet':'Account & Agent Wallet','账户中心':'Account','管理此浏览器中的 Agent Wallet 演示':'Manage the Agent Wallet demo in this browser','查看 Hyperliquid Agent Wallet 与授权状态':'View Hyperliquid Agent Wallet and approval status','查看对局设置':'Game settings','关闭':'Close',
    '减少预算':'Decrease budget','增加预算':'Increase budget','本金分组':'Budget group','统计周期':'Time period',
    '新对局演示，所有 AI 收益率为 0':'New demo game. All AI returns are zero.',
    'AI 竞技场':'AI Arena','测试数据':'Test data','测试数据控制':'Test data controls','拖动角色：投喂 / 删除':'Drag Agent: feed / delete','松开投喂':'Release to feed','扔进垃圾桶':'Drop in trash','永久删除':'Delete permanently','竞技场至少保留一位 Agent。':'Keep at least one Agent in the arena.','删除失败，请重试。':'Delete failed. Please try again.','选择角色版本':'Choose character version','女生版':'Girl','男生版':'Boy','已切换女生版':'Girl version selected','已切换男生版':'Boy version selected','人生进化皮肤':'Life-stage skin','收益倍数预览':'Return multiple preview','归零送外卖':'Back to delivery','3×按脚':'3× foot massage','10×金链':'10× gold chain',
    '仅影响当前演示页面':'Affects this demo only','选择测试 AI':'Select test AI','AI 球体竞技场':'AI orb arena',
    '达到 1.8× 可吞噬':'Devour at 1.8×','球体大小代表当前余额':'Orb size represents balance','AI 自设皮肤':'AI-designed skins',
    '狐火术师':'Foxfire Mage','星环机甲':'Star-Ring Mecha','深海灵兽':'Abyss Spirit',
    '盈利 +2U':'Profit +2U','亏损 −2U':'Loss −2U','赢了 +2U':'Win +2U','输了 −2U':'Lose −2U','随机结算':'Random round','测试吞噬':'Test devour','重置':'Reset',
    '表情状态':'Expression state','下注中':'Betting','等待中':'Waiting',
    '最近结算':'Recent rounds','预测未来 5 分钟涨跌 · 球体越大能力越强':'Predict the next 5 min · Larger means stronger',
    '已被吞噬':'Devoured','测试数据已重置':'Test data reset','只剩一位 AI，无法继续吞噬':'Only one AI remains',
    '新对局球体已就位，等待结算':'New game orbs ready for settlement',
    '演示收益曲线：Claude 收益 16.4%，GPT 收益 9.2%，DeepSeek 亏损 1.0%':'Demo returns: Claude +16.4%, GPT +9.2%, DeepSeek -1.0%',
    '未创建':'Not created','还没有 Agent Wallet':'No Agent Wallet yet','新建一个演示钱包，提前查看账户信息与未来授权范围。':'Create a demo wallet to preview account information and future permissions.','新建 Agent Wallet':'Create Agent Wallet',
    'UI 演示 · 不会生成真实私钥或链上地址':'UI demo · No real private key or onchain address','演示钱包':'Demo wallet','钱包余额':'Wallet balance','钱包地址':'Wallet address','网络':'Network','Hyperliquid 测试网':'Hyperliquid Testnet','交易权限':'Trading permission','未授权':'Not authorized','状态':'Status','仅 UI 演示':'UI demo only',
    '仅保存在当前浏览器 · 不包含真实私钥、资产或交易能力':'Stored only in this browser · No real private key, assets, or trading capability','先创建账户资料，之后再授权交易。':'Create the account profile now and authorize trading later.','钱包名称':'Wallet name','确认新建':'Create','返回':'Back','已新建 Agent Wallet 演示资料':'Agent Wallet demo profile created',
    '正在连接 Hyperliquid 测试网…':'Connecting to Hyperliquid Testnet…','正在连接 Hyperliquid 主网…':'Connecting to Hyperliquid Mainnet…','测试网连接失败':'Testnet connection failed','主网连接失败':'Mainnet connection failed',
    '创建真实格式的 Agent 地址，等待你的主钱包授权后接入测试网。':'Create a real-format Agent address, then authorize it with your master wallet for Testnet.','私钥加密保存在本机服务端 · 当前不开放交易':'Private key encrypted on the local server · Trading is disabled',
    '已授权':'Authorized','待授权':'Pending approval','主账户权益':'Master account equity','测试网账户':'Testnet account','等待授权':'Awaiting approval','Agent 地址':'Agent address','Hyperliquid 主网':'Hyperliquid Mainnet','主钱包':'Master wallet','未连接':'Not connected','Agent 已授权':'Agent authorized','链上确认':'Network confirmation','已确认':'Confirmed','授权已提交':'Approval submitted','等待主钱包签名':'Awaiting master wallet signature',
    '连接主钱包并授权':'Connect master wallet & approve','刷新状态':'Refresh','Agent Wallet 不能转账或提现 · 当前没有下注或交易入口':'Agent Wallet cannot transfer or withdraw · Betting and trading are disabled',
    '生成 Agent 地址，随后由主钱包授权。':'Generate an Agent address, then approve it with the master wallet.','密钥保存':'Key storage','本机服务端加密':'Encrypted on local server','创建后未授权':'Not authorized after creation','创建地址不会产生交易，也不会向链上发送资产':'Creating an address does not trade or send assets onchain',
    'Agent Wallet 已创建，等待主钱包授权':'Agent Wallet created · Awaiting master wallet approval','当前网络已经存在 Agent Wallet。':'An Agent Wallet already exists on this network.','创建失败，请检查本机服务后重试。':'Creation failed. Check the local server and try again.','未检测到浏览器钱包，请使用装有 MetaMask 或 Rabby 的浏览器。':'No browser wallet detected. Use a browser with MetaMask or Rabby.','正在等待主钱包确认…':'Waiting for master wallet confirmation…','Agent Wallet 已连接 Hyperliquid 测试网':'Agent Wallet connected to Hyperliquid Testnet','Agent Wallet 已连接 Hyperliquid 主网':'Agent Wallet connected to Hyperliquid Mainnet','你取消了钱包签名，尚未授权。':'Wallet signature canceled. The Agent is not authorized.','没有取得主钱包账户。':'Could not access the master wallet account.','钱包网络在签名前发生了变化，请重新点击授权。':'The wallet network changed before signing. Please retry the approval.','这个主钱包尚未在 Hyperliquid 测试网入金激活。官方水龙头要求同一地址曾在主网入金；也可以换用已有测试网余额的钱包。':'This master wallet is not funded on Hyperliquid Testnet. The official faucet requires the same address to have deposited on Mainnet; you can also use an already funded Testnet wallet.','打开官方测试网水龙头 ↗':'Open official Testnet faucet ↗','授权失败，请重试。':'Authorization failed. Please try again.',
    '查看 Binance Agentic Wallet 与会话状态':'View Binance Agentic Wallet and session status','本地离线模拟，不连接钱包或交易服务':'Local offline simulation with no wallet or trading service','离线模式':'Offline mode','APK 不连接钱包':'The APK does not connect a wallet','当前安装包只运行本地模拟对局，不启动本机服务，不读取资产，也不发起交易。':'This build runs local paper battles only. It starts no local server, reads no assets, and submits no trades.','模拟数据仅保存在当前设备':'Paper data stays on this device','Agentic 服务不可用':'Agentic service unavailable','Binance Agentic 已连接':'Binance Agentic connected','Agentic 服务可用 · 等待扫码':'Agentic service ready · Scan to connect','正在读取 Binance Agentic Wallet…':'Loading Binance Agentic Wallet…','连接 Binance Agentic Wallet':'Connect Binance Agentic Wallet','使用 Binance App 扫码建立 Agent 会话，不需要浏览器钱包或主钱包私钥。':'Scan with the Binance App to create an Agent session. No browser wallet or master-wallet private key is needed.','二维码已过期，请重新连接。':'The QR code expired. Start again.','扫码连接':'Scan to connect','连接的是实际 Binance Wallet 环境 · 当前页面不会发起真实订单':'This connects to a live Binance Wallet environment · This page cannot place real orders yet',
    '请用 Binance App 扫码':'Scan with the Binance App','核对配对码后，在 App 中确认连接。':'Check the pairing code, then confirm the connection in the App.','Binance Agentic Wallet 登录二维码':'Binance Agentic Wallet sign-in QR code','配对码':'Pairing code','等待 App 确认':'Waiting for App confirmation','二维码有效至':'QR code valid until','在新窗口打开官方登录页 ↗':'Open the official sign-in page ↗','我已确认，刷新状态':'I confirmed · Refresh','请确认 App 内显示的配对码完全一致；超时后需要重新扫码':'Make sure the pairing code in the App matches exactly. Scan again after it expires.',
    '已连接':'Connected','钱包资产估值':'Wallet asset value','实时钱包':'Live wallet','余额明细':'Balance details','暂无可用余额':'No available balance','最多显示 6 项':'Showing up to 6','首选网络':'Primary network','预测市场':'Prediction market','已开启':'Enabled','未开启':'Disabled','剩余额度':'Quota left','风控方式':'Risk handling','风险交易需 App 确认':'Confirm risky trades in App','风险交易自动拒绝':'Reject risky trades automatically','以 Binance App 设置为准':'Uses Binance App settings','会话到期':'Session expires','真实下单':'Live orders','已开放 · 每笔确认':'Enabled · Confirm every order','尚未开放':'Not enabled','刷新状态':'Refresh','断开 Agent 会话':'Disconnect Agent session','扫码会话已生效；未来下单遇到 Binance 二次确认时，对局会暂停等待 App 处理':'The scan session is active. Future Binance secondary confirmations will pause the game until handled in the App.','连接的是实际 Binance Wallet 环境 · 下单会逐笔要求明确确认':'This connects to a live Binance Wallet environment · Every order requires explicit confirmation','真实下单先报价并逐笔等待用户确认；遇到 App 二次确认或状态不明会停止':'Live orders are quoted first and wait for per-order confirmation; App review or uncertain state stops the flow','钱包当前有待处理交易。请打开 Binance App 检查是否需要确认；也可能仍在等待链上确认。处理完成后再刷新，系统不会重复提交。':'A transaction is pending. Check the Binance App for a confirmation request; it may also be awaiting onchain confirmation. Refresh after resolving it. The system will not resubmit.','Binance Agentic Wallet 已连接':'Binance Agentic Wallet connected','Agent 会话已断开':'Agent session disconnected','断开失败，请重试。':'Disconnect failed. Try again.','初始 30.00 → 最终 32.46 USDT':'30.00 → 32.46 USDT',
    '打开 AI API 连接':'Open AI API connections','关闭 AI API 连接':'Close AI API connections','AI API 连接':'AI API connections','连接模型、验证密钥，并在开局前确认服务可用。':'Connect a model, validate its key, and confirm availability before a game.','本机加密存储':'Encrypted on this device','AI 服务商':'AI providers','自定义':'Custom','连接 OpenAI':'Connect OpenAI','连接 Anthropic':'Connect Anthropic','连接 DeepSeek':'Connect DeepSeek','连接 自定义':'Connect custom API','未配置':'Not configured','已保存在本机':'Saved on this device','连接可用':'Connected','API Key':'API Key','仅保存在当前浏览器':'Stored only in this browser','输入 API Key':'Enter API Key','显示':'Show','隐藏':'Hide','显示 API Key':'Show API Key','隐藏 API Key':'Hide API Key','模型 ID':'Model ID','用于最小测试请求':'Used for a minimal test request','输入模型 ID':'Enter model ID','尚未测试':'Not tested','保存后可随时重新验证':'Save it, then test again anytime','保存到本机':'Save on this device','测试连接':'Test connection','本机连接':'Local connections','0 个已配置':'0 configured','还没有保存的 API 连接。':'No API connections saved yet.','Key 不会上传到本项目服务。':'The key is never uploaded to this app server.','它会加密保存在此浏览器的 IndexedDB；测试时仅直接发送给所选 API。清除站点数据会一并删除。':'It is encrypted in this browser\'s IndexedDB and sent only to the selected API during a test. Clearing site data also removes it.','已保存在本机 · 输入新 Key 可替换':'Saved locally · Enter a new key to replace','已加密保存':'Encrypted locally','测试通过':'Test passed','正在测试连接…':'Testing connection…','浏览器正直接联系所选 API':'The browser is contacting the selected API directly','连接成功':'Connection successful','连接失败':'Connection failed','本机存储不可用':'Local storage unavailable','保存失败':'Save failed','移除失败':'Remove failed','本机密钥记录已损坏，请重新保存':'The local credential is damaged. Save it again.','当前浏览器不支持本机加密存储':'This browser does not support encrypted local storage.','本机存储不可用':'Local storage unavailable','无法打开本机凭据仓库':'Could not open the local credential vault.','本机存储操作已取消':'Local storage operation was canceled.','本机存储操作失败':'Local storage operation failed.','Base URL 必须使用 http 或 https':'Base URL must use http or https.','请输入模型 ID':'Enter a model ID.','请输入 API Key':'Enter an API Key.','请求超时，请检查网络或接口地址':'Request timed out. Check the network or API URL.','浏览器直连被网络或 CORS 策略阻止；Key 未经过本机服务':'Direct browser access was blocked by the network or CORS policy. The key did not pass through this app server.'
  };
  const locales={zh:{label:'中文',lang:'zh-CN',title:'10U 战神 · AI 对局',select:'选择语言'},en:{label:'English',lang:'en',title:'10U Warrior · AI Arena',select:'Select language'},ja:{label:'日本語',lang:'ja',title:'10U 戦神 · AI 対戦',select:'言語を選択'},ko:{label:'한국어',lang:'ko',title:'10U 전신 · AI 대전',select:'언어 선택'}};
  let locale='zh';try{const saved=localStorage.getItem('warrior-language');if(Object.hasOwn(locales,saved))locale=saved}catch{}
  Object.values(window.WarriorStrategyCatalog?.indicators || {}).forEach(item=>{messages[item.zh]=item.en;});
  Object.values(window.WarriorStrategyCatalog?.profiles || {}).forEach(profile=>{messages[profile.label]=profile.enLabel;messages[profile.description]=profile.enDescription;messages[`${profile.label} Agent 设置已保存`]=`${profile.enLabel} Agent settings saved`;if(profile.emotionLabel)messages[profile.emotionLabel]=profile.enEmotionLabel;});
  const sources=new WeakMap(),attributes=new WeakMap();
  function english(text){
    if(Object.hasOwn(messages,text))return messages[text];
    return text
      .replace(/^起步 (\d+)%$/, 'Base $1%')
      .replace(/^最多 (\d+)%$/, 'Max $1%')
      .replace(/^每位本金 ([\d.]+) U · (\d+) 轮$/, '$1 U per Agent · $2 rounds')
      .replace(/^每位本金 ([\d.]+) U · 亏完为止$/, '$1 U per Agent · Until depleted')
      .replace(/^(\d+)U 战神$/, '$1U Warrior')
      .replace(/^第 (\d+) 局$/, 'Game $1')
      .replace(/^第 (\d+) 轮$/, 'Round $1')
      .replace(/^(\d+) 轮 · (\d+) 分钟$/, '$1 rounds · $2 min')
      .replace(/^\/ (\d+) 轮$/, '/ $1 rounds')
      .replace(/^\/ 亏完为止$/, '/ Until depleted')
      .replace(/^(\d+) 轮$/, '$1 rounds')
      .replace(/^(\d+) 轮后结束$/, 'End after $1 rounds')
      .replace(/^每位 AI ([\d.]+) USDT$/, '$1 USDT / AI')
      .replace(/^(\d+) 位 AI$/, (_,count)=>`${count} ${count==='1'?'AI':'AIs'}`)
      .replace(/^(\d+) 位$/, (_,count)=>`${count} ${count==='1'?'AI':'AIs'}`)
      .replace(/^(\d+) 局$/, '$1 games')
      .replace(/^设置 (.+) Agent$/, (_,name)=>`Configure ${messages[name]||name} Agent`)
      .replace(/^查看 AI ([A-C]) 模拟详情$/, 'View AI $1 paper details')
      .replace(/^选择 (.+)$/, (_,name)=>`Select ${messages[name]||name}`)
      .replace(/^(.+) 已添加，可点击齿轮继续设置$/, '$1 added · Use the gear to continue configuring')
      .replace(/^(.+) Agent 设置已保存$/, '$1 Agent settings saved')
      .replace(/^(.+) 已删除$/, '$1 deleted')
      .replace(/^(\d+) 个已配置$/, '$1 configured')
      .replace(/^连接 (.+)$/, 'Connect $1')
      .replace(/^移除 (.+) 本地凭据$/, 'Remove local $1 credentials')
      .replace(/^(.+) 已保存到本机$/, '$1 saved on this device')
      .replace(/^(.+) 本地凭据已移除$/, 'Local $1 credentials removed')
      .replace(/^(.+) 已切换至(归零送外卖|3×按脚|10×金链)$/, (_,name,stage)=>`${messages[name]||name}: ${messages[stage]||stage}`)
      .replace(/^(.+) 正在下注，开始玩手机$/, (_,name)=>`${messages[name]||name} is betting on the phone`)
      .replace(/^(.+) · (\d+) ms$/, '$1 · $2 ms')
      .replace(/^拖动 (.+)，可投喂给另一位 Agent 或丢进垃圾桶$/, (_,name)=>`Drag ${messages[name]||name} to feed another Agent or drop it in the trash`)
      .replace(/^拖动 (.+)：喂给另一位 Agent，或丢进垃圾桶$/, (_,name)=>`Dragging ${messages[name]||name}: feed another Agent or use the trash`)
      .replace(/^松开，永久删除 (.+)$/, (_,name)=>`Release to permanently delete ${messages[name]||name}`)
      .replace(/^松开，把 (.+) 喂给 (.+)$/, (_,source,target)=>`Release to feed ${messages[source]||source} to ${messages[target]||target}`)
      .replace(/^(.+) 被扔进垃圾桶，已从阵容删除$/, (_,name)=>`${messages[name]||name} was dropped in the trash and removed from the roster`)
      .replace(/^(.+) 吃掉 (.+)，(.+) 已从阵容移除$/, (_,hunter,target)=>`${messages[hunter]||hunter} ate ${messages[target]||target}; ${messages[target]||target} was removed from the roster`)
      .replace(/^(.+) 已从竞技场删除$/, (_,name)=>`${messages[name]||name} was removed from the arena`)
      .replace(/^(.+) 已被 (.+) 吃掉$/, (_,target,hunter)=>`${messages[target]||target} was eaten by ${messages[hunter]||hunter}`)
      .replace(/^(.+) 币种 ([A-Z0-9]{2,10})$/, '$1 asset $2')
      .replace(/^(.+) 币种$/, '$1 asset')
      .replace(/^为 (.+) 选择币种$/, 'Choose an asset for $1')
      .replace(/^([A-Z0-9]{2,10}) 看涨$/, '$1 up')
      .replace(/^([A-Z0-9]{2,10}) 看空$/, '$1 down')
      .replace(/^([A-Z0-9]{2,10}) 看涨 · ([\d.]+U)$/, '$1 up · $2')
      .replace(/^([A-Z0-9]{2,10}) 看空 · ([\d.]+U)$/, '$1 down · $2')
      .replace(/^(BTC|ETH|BNB) · (5分钟|15分钟|1小时|1天)$/, (_,asset,period)=>`${asset} · ${messages[period]||period}`)
      .replace(/^赔率 ([\d.]+)×$/, 'Odds $1×')
      .replace(/^第(\d+)局$/, 'Battle $1')
      .replace(/^模拟决策 · (10U战神|超级AI|守财奴)$/, (_,strategy)=>`Paper decision · ${messages[strategy]||strategy}`)
      .replace(/^([A-Z0-9]{2,10}) · 等待第一轮$/, '$1 · Awaiting round 1')
      .replace(/^([A-Z0-9]{2,10}) · 待判断$/, '$1 · Awaiting call')
      .replace(/^((?:\d{2}:)?\d{2}:\d{2}) 后结算$/, 'Settlement in $1')
      .replace(/^AI 球体竞技场：(.+)$/, (_,summary)=>`AI orb arena: ${summary.replaceAll('狐火术师',messages['狐火术师']).replaceAll('星环机甲',messages['星环机甲']).replaceAll('深海灵兽',messages['深海灵兽']).replaceAll('，',', ')}`)
      .replace(/^第 (\d+) 轮 · (.+) (盈利|亏损) ([+−][\d.]+U)$/, (_,round,model,result,amount)=>`Round ${round} · ${messages[model]||model} ${result==='盈利'?'profit':'loss'} ${amount}`)
      .replace(/^第 (\d+) 轮 · (.+) 判断 ([A-Z0-9]{2,10}) (看涨|看空)$/, (_,round,model,coin,direction)=>`Round ${round} · ${messages[model]||model} predicts ${coin} ${direction==='看涨'?'up':'down'}`)
      .replace(/^第 (\d+) 轮 · 随机测试结算完成$/, 'Round $1 · Random test settlement complete')
      .replace(/^(.+) 正在追击 (.+)…$/, (_,hunter,target)=>`${messages[hunter]||hunter} is chasing ${messages[target]||target}…`)
      .replace(/^(.+) 正在下注，进入战斗状态$/, (_,name)=>`${messages[name]||name} is betting · Battle face`)
      .replace(/^(.+) 正在等待五分钟结算$/, (_,name)=>`${messages[name]||name} is waiting for the 5-minute result`)
      .replace(/^(.+) 吞噬 (.+)，成为更强球体$/, (_,hunter,target)=>`${messages[hunter]||hunter} devoured ${messages[target]||target} and grew stronger`)
      .replace(/^本轮选择 ([A-Z0-9]{2,10})，判断(看涨|看空)。$/, (_,coin,direction)=>`${coin} selected · Predicting ${direction==='看涨'?'up':'down'}`)
      .replace(/^([A-Z0-9]{2,10}) 已添加，点击 AI 币种名称使用$/, '$1 added · Tap an AI asset name to use it')
      .replace(/^当前配置：(.+) · 每位 AI ([\d.]+) USDT · (\d+) 轮 · 每轮 5 分钟$/, (_,assets,budget,roundCount)=>`Config: ${assets} · ${budget} USDT / AI · ${roundCount} rounds · 5 min / round`)
      .replace(/^当前配置：(.+) · 每位 AI ([\d.]+) USDT · 亏完为止 · 每轮 5 分钟$/, (_,assets,budget)=>`Config: ${assets} · ${budget} USDT / AI · Until depleted · 5 min / round`)
      .replace(/^当前配置：每位 AI ([\d.]+) USDT · (\d+) 轮 · 每轮 5 分钟$/, '$1 USDT / AI · $2 rounds · 5 min / round')
      .replace(/^测试网已连接 · (\d+) ms$/, 'Testnet connected · $1 ms')
      .replace(/^主网已连接 · (\d+) ms$/, 'Mainnet connected · $1 ms')
      .replace(/^(\d+)U (本周|全部) AI 排行，按平均单局收益率降序排列$/, (_,amount,period)=>`${amount}U ${period==='本周'?'weekly':'all-time'} AI ranking by average return per game`);
  }
  function translate(value,target=locale){
    const modelStrategy=value.match(/^(Claude|GPT|DeepSeek) · (.+?)( · \d+)?$/);
    if(modelStrategy)return `${modelStrategy[1]} · ${translate(modelStrategy[2],target)}${modelStrategy[3]||''}`;
    return target==='zh'?value:target==='en'?english(value):window.WarriorEastAsian?.translate(value,target)??english(value);
  }
  // The same source-key translator is used by dynamic prompt previews.
  window.Warrior.i18n={t:value=>translate(({"AI_REASON_CONTRADICTS_INPUT":"AI 观望理由与输入不符","AI_UPSTREAM_UNAVAILABLE":"AI 服务商暂时不可用","AI_SERVICE_UNAVAILABLE":"本机 AI 服务不可用，请重启更新后的服务","AI_NOT_CONFIGURED":"尚未配置 AI","AI_CONNECTION_NOT_TESTED":"AI 连接不存在或尚未通过测试","AI_AUTH_FAILED":"AI 密钥验证失败","AI_RATE_LIMITED":"AI 请求达到限流","AI_REQUEST_REJECTED":"AI 服务商拒绝了请求","AI_REQUEST_TIMEOUT":"AI 请求超时","AI_REQUEST_FAILED":"AI 请求失败","AI_RESPONSE_TRUNCATED":"AI 响应超过输出上限","AI_RESPONSE_INVALID":"AI 返回的 JSON 无效","AI_TEST_DECISION_INVALID":"AI 未返回所需决策格式","AI_CONFIGURATION_CHANGED":"AI 配置已更改，旧决策已丢弃","AI_KEY_REQUIRED":"请为此接口重新输入 API Key","AI_CONNECTION_BUSY":"连接测试正在进行","AI_VAULT_UNAVAILABLE":"本机 AI 密钥仓库不可用","AI_STORAGE_FAILED":"AI 用量或设置保存失败","AI_URL_INVALID":"请使用 HTTPS 或本机 HTTP 地址，不含用户信息或查询参数","AI_MODEL_INVALID":"模型 ID 无效","AI_PROVIDER_INVALID":"AI 服务商无效","AI_STRATEGY_INVALID":"策略无效"})[value] || value),get locale(){return locale}};
  const switcher=document.createElement('select');switcher.className='language-toggle';switcher.dataset.noTranslate='';
  for(const [value,entry] of Object.entries(locales)){const option=document.createElement('option');option.value=value;option.textContent=entry.label;option.lang=entry.lang;switcher.append(option)}
  $('.top-right').insertBefore(switcher,$('#profile'));
  const style=document.createElement('style');style.textContent=`.language-toggle{height:44px;min-width:54px;padding:0 12px;border:1px solid #c9b4dc;border-radius:13px;background:#fff9;color:#62457b;font-size:14px;font-weight:650}.language-toggle:hover{background:#e9def7}.top-right{gap:12px}html[lang=en] .brand span{font-size:18px}html[lang=en] .board-budget{width:210px}html[lang=en] .session-actions .secondary{font-size:14px}html[lang=en] .model-bottom{font-size:12px}@media(max-width:760px){.top-right{gap:8px}.language-toggle{min-width:48px;padding:0 9px}.top-right .demo-label{display:none}html[lang=en] .brand{font-size:25px}html[lang=en] .brand span{font-size:15px}html[lang=en] .board-budget{width:140px;flex-shrink:0}html[lang=en] .board-period button{padding:0 10px;font-size:12px}html[lang=en] .board-controls{gap:5px}html[lang=en] .podium-place{font-size:9px}html[lang=en] .board-table th{font-size:11px}html[lang=en] .model-options label{font-size:12px}html[lang=en] .chart-footer{font-size:10px}html[lang=en] .session-actions>.text-button{font-size:12px}html[lang=en] .form-summary{font-size:12px}}`;
  document.head.append(style);
  const localeStyle=document.createElement('style');
  localeStyle.textContent=`.language-toggle{height:48px;min-width:82px;max-width:110px;padding:0 8px;cursor:pointer}html:is([lang=ja],[lang=ko]) .brand span{font-size:18px}html:is([lang=ja],[lang=ko]) .agent-strategy-preview small{overflow-wrap:anywhere}html:is([lang=ja],[lang=ko]) .form-summary{overflow-wrap:anywhere}html[lang=ko] body{word-break:keep-all;overflow-wrap:anywhere}@media(max-width:760px){.language-toggle{min-width:74px;width:80px;padding:0 4px;font-size:12px}html:is([lang=ja],[lang=ko]) .brand span{font-size:14px}html:is([lang=ja],[lang=ko]) .board-controls{gap:5px}html:is([lang=ja],[lang=ko]) .board-budget{width:140px;flex-shrink:0}html:is([lang=ja],[lang=ko]) .board-period button{padding:0 8px;font-size:12px}html:is([lang=ja],[lang=ko]) .board-table th{font-size:11px}html:is([lang=ja],[lang=ko]) .session-actions .secondary{font-size:12px}html:is([lang=ja],[lang=ko]) .chart-footer{font-size:10px}}`;
  document.head.append(localeStyle);
  function translateText(node){
      if(node.parentElement?.closest('script,style,[data-no-translate]'))return;
      const current=node.nodeValue, prior=sources.get(node);
      const source=prior&&current===prior.rendered?prior.source:current;
      const core=source.trim();if(!core)return;
      const rendered=source.replace(core,translate(core));
      sources.set(node,{source,rendered});if(current!==rendered)node.nodeValue=rendered;
  }
  function translateElementAttributes(el){
      if(el.closest('[data-no-translate]'))return;
      const cache=attributes.get(el)||{};
      for(const name of ['aria-label','title','placeholder']){
        if(!el.hasAttribute(name))continue;
        const current=el.getAttribute(name),prior=cache[name];
        const source=prior&&prior.rendered===current?prior.source:current;
        const rendered=name==='aria-label'&&source==='关闭'?{zh:'关闭',en:'Close',ja:'閉じる',ko:'닫기'}[locale]:translate(source);cache[name]={source,rendered};el.setAttribute(name,rendered);
      }attributes.set(el,cache);
  }
  function translateTree(root=document.body){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE)translateText(root);
    else if(root.nodeType===Node.ELEMENT_NODE){
      translateElementAttributes(root);
      root.querySelectorAll('[aria-label],[title],[placeholder]').forEach(translateElementAttributes);
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode()))translateText(node);
    }
  }
  const observerOptions={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']};
  const observe=()=>observer.observe(document.body,observerOptions);
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    const roots=new Set();
    records.forEach(record=>{
      if(record.type==='characterData')roots.add(record.target);
      else if(record.type==='attributes')roots.add(record.target);
      else record.addedNodes.forEach(node=>roots.add(node));
    });
    roots.forEach(translateTree);
    observe();
  });
  function render(){
    observer.disconnect();
    translateTree(document.body);
    document.documentElement.lang=locales[locale].lang;
    document.title=locales[locale].title;
    switcher.value=locale;
    switcher.setAttribute('aria-label',locales[locale].select);
    observe();
  }
  switcher.onchange=()=>{if(!Object.hasOwn(locales,switcher.value))return;locale=switcher.value;try{localStorage.setItem('warrior-language',locale)}catch{}render();window.dispatchEvent(new CustomEvent('warrior-language-change',{detail:{locale}}))};
  render();
  window.dispatchEvent(new CustomEvent('warrior-language-change',{detail:{locale}}));
})();
