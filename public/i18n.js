(() => {
  if (document.documentElement.dataset.cardLab === 'true') return;
  const messages = {
    '网页体验版：行情与资金均为模拟，记录仅保存在当前浏览器。':'Web demo: prices and funds are simulated. Records stay in this browser only.',
    '网页体验版不连接外部 AI，请在 AI 策略中调整本地规则。':'This web demo does not connect to external AI. Adjust local rules in AI strategies.',
    '取消连接':'Cancel connection',
    '正在等待币安 App 授权':'Waiting for Binance App authorization',
    '授权已过期或被拒绝，请重新连接。':'Authorization expired or was rejected. Please connect again.',
    '币安连接失败，请检查网络后重试。':'Could not connect to Binance. Check your network and retry.',
    '连接币安钱包':'Connect Binance Wallet',
    '打开官方授权页，在币安 App 中核对配对码并确认连接。':'Open the official authorization page, then check the pairing code and confirm in the Binance App.',
    '此入口只提供钱包查询和赔率读取，对局仍使用模拟资金。':'This connection provides wallet queries and market odds. Battles still use paper funds.',
    '打开币安授权':'Open Binance authorization',
    '核对配对码后授权，返回这里自动刷新。未唤起 App 时，请使用官方页面或扫码。':'Check the pairing code and authorize. Return here to refresh automatically. If the app does not open, use the official page or scan the QR code.',
    '无法打开授权页，请使用下方官方链接。':'Unable to open authorization. Use the official link below.',
    '更新于':'Updated',
    '下一轮提前计算中':'Preparing next round',
    '下一轮策略已就绪':'Next-round strategy ready',
    '提前计算未完成，开局重试':'Preparation incomplete; retry at start',
    'PRECOMPUTE_PRICE_MOVED':'Price changed since preparation',
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
    '小组件已添加到桌面':'Widget added to home screen',
    '尚未确认添加。若没有弹窗，请从桌面手动添加。':'Addition not confirmed. If no dialog appeared, add the widget from your home screen.',
    '请确认系统添加提示；若没有弹窗，可从桌面手动添加。':'Confirm the system prompt. If no dialog appears, add the widget from your home screen.',
    '当前桌面未接受添加请求，请手动添加。':'Your launcher did not accept the request. Add the widget manually.',
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
// Current card application copy: Chinese, English, Japanese, Korean.
(() => {
  window.WarriorCardLocales = {zh:{index:0,lang:"zh-CN"},en:{index:1,lang:"en"},ja:{index:2,lang:"ja"},ko:{index:3,lang:"ko"}};
  window.WarriorCardCopy = {
  "deviceSettings": ["设备设置", "Device settings", "端末設定", "기기 설정"],
  "deviceBackground": ["后台运行", "Background operation", "バックグラウンド動作", "백그라운드 실행"],
  "deviceBackgroundNote": ["对局由后台服务运行。通知栏可暂停新下注，已有订单继续结算；系统仍可能限制后台活动。", "The background service runs battles. Pause new bets from notifications; existing orders still settle. The system may restrict background activity.", "対戦はバックグラウンドサービスで実行します。通知から新規ベットを停止でき、既存分は決済を続けます。OSによる制限は残ります。", "대전은 백그라운드 서비스에서 실행됩니다. 알림에서 신규 베팅을 일시 정지할 수 있으며 기존 주문은 정산됩니다. 시스템이 백그라운드를 제한할 수 있습니다."],
  "deviceServiceError": ["后台服务异常，请重新打开应用；恢复后保持暂停。", "Service error. Reopen the app; restored battles stay paused.", "サービスエラーです。アプリを開き直してください。復旧後も一時停止を維持します。", "서비스 오류입니다. 앱을 다시 여세요. 복구된 대전은 일시 정지 상태를 유지합니다."],
  "deviceServiceRunning": ["后台服务运行中", "Background service running", "バックグラウンドサービス実行中", "백그라운드 서비스 실행 중"],
  "deviceServiceIdle": ["暂无运行中的对局", "No running battles", "実行中の対戦はありません", "진행 중인 대전 없음"],
  "deviceServiceUnknown": ["无法读取后台服务状态", "Service status unavailable", "サービス状態を取得できません", "서비스 상태를 확인할 수 없습니다"],
  "deviceRestricted": ["系统限制了后台活动，请在应用设置中解除限制。", "Background activity is restricted. Review app settings.", "バックグラウンド動作が制限されています。アプリ設定を確認してください。", "백그라운드 활동이 제한되었습니다. 앱 설정을 확인하세요."],
  "deviceBatteryAllowed": ["已豁免电池优化，仍不保证持续运行。", "Battery optimization exemption is enabled; continuous operation is not guaranteed.", "電池最適化の対象外です。継続動作は保証されません。", "배터리 최적화에서 제외되었지만 지속 실행이 보장되지는 않습니다."],
  "deviceBatteryNeeded": ["尚未豁免电池优化，可在系统设置中调整。", "Battery optimization is active. Adjust it in system settings.", "電池最適化が有効です。システム設定で変更できます。", "배터리 최적화가 활성화되어 있습니다. 시스템 설정에서 변경할 수 있습니다."],
  "deviceBatteryUnknown": ["无法读取电池状态，请在系统设置中查看。", "Battery status unavailable. Check system settings.", "電池状態を取得できません。システム設定を確認してください。", "배터리 상태를 확인할 수 없습니다. 시스템 설정을 확인하세요."],
  "deviceBattery": ["电池优化设置", "Battery optimization", "電池最適化設定", "배터리 최적화 설정"],
  "deviceApp": ["应用后台设置", "App background settings", "アプリのバックグラウンド設定", "앱 백그라운드 설정"],
  "deviceNotifications": ["显示运行通知", "Show service notifications", "実行通知を表示", "실행 알림 표시"],
  "deviceWidget": ["桌面小组件", "Home screen widget", "ホーム画面ウィジェット", "홈 화면 위젯"],
  "deviceWidgetNote": ["上下滑动查看策略战况，点击进入详情。系统暂停后台时显示上次快照。", "Scroll through strategies and tap for details. When background activity stops, the widget shows its last snapshot.", "スクロールで戦況を確認し、タップで詳細を開きます。バックグラウンド停止時は最後のスナップショットを表示します。", "스크롤하여 전략 전황을 보고 탭하여 상세 화면을 여세요. 백그라운드가 중단되면 마지막 스냅샷이 표시됩니다."],
  "devicePin": ["添加到桌面", "Add to home screen", "ホーム画面に追加", "홈 화면에 추가"],
  "devicePinManual": ["也可长按桌面 → 小组件 → 10U 战神。", "Or long-press the home screen → Widgets → 10U Warrior.", "ホーム画面を長押し → ウィジェット → 10U 戦神からも追加できます。", "홈 화면을 길게 누르기 → 위젯 → 10U 전신에서도 추가할 수 있습니다."],
  "devicePinConfirm": ["请确认系统添加提示；若没有弹窗，可从桌面手动添加。", "Confirm the system prompt, or add the widget manually from your home screen.", "システムの追加確認を承認するか、ホーム画面から手動で追加してください。", "시스템 추가 알림을 확인하거나 홈 화면에서 수동으로 추가하세요."],
  "devicePinDone": ["小组件已添加到桌面", "Widget added to home screen", "ウィジェットを追加しました", "홈 화면에 위젯이 추가되었습니다"],
  "devicePinUnknown": ["尚未确认添加，请检查桌面或手动添加。", "Addition is unconfirmed. Check your home screen or add manually.", "追加を確認できません。ホーム画面を確認するか手動で追加してください。", "추가가 확인되지 않았습니다. 홈 화면을 확인하거나 수동으로 추가하세요."],
  "deviceTargetMissing": ["该策略已移除或暂时无法读取", "This strategy was removed or is unavailable", "この戦略は削除済みか取得できません", "전략이 삭제되었거나 불러올 수 없습니다"],
  "deviceSettingsFailed": ["无法打开或读取设置，请到手机设置中调整。", "Unable to open or read settings. Use system settings.", "設定を開くか取得できません。端末の設定を使用してください。", "설정을 열거나 읽을 수 없습니다. 기기 설정을 이용하세요."],
  "deviceLater": ["稍后设置", "Set up later", "後で設定", "나중에 설정"],
  "deviceWord0": ["更新于", "Updated", "更新", "업데이트"],
  "deviceWord1": ["下一轮提前计算中", "Preparing next round", "次ラウンドを計算中", "다음 라운드 계산 중"],
  "deviceWord2": ["下一轮策略已就绪", "Next round ready", "次ラウンドの準備完了", "다음 라운드 준비 완료"],
  "deviceWord3": ["提前计算未完成，开局重试", "Preparation incomplete; retry at opening", "事前計算未完了・開始時に再試行", "사전 계산 미완료, 시작 시 재시도"],
  "deviceWord4": ["模拟资金", "Paper funds", "仮想資金", "모의 자금"],
  "deviceWord5": ["已结算收益", "Settled profit", "確定損益", "정산 손익"],
  "deviceWord6": ["本轮下注", "Current bet", "今回のベット", "현재 베팅"],
  "deviceWord7": ["可用", "Available", "利用可能", "사용 가능"],
  "deviceWord8": ["冻结", "Reserved", "拘束中", "예약됨"],
  "deviceWord9": ["往期待结算", "Earlier pending bets", "過去の決済待ち", "이전 정산 대기"],
  "deviceWord10": ["下注参考价", "Entry reference", "エントリー参考値", "진입 참고가"],
  "deviceWord11": ["胜率", "Win rate", "勝率", "승률"],
  "deviceWord12": ["查看详情", "View details", "詳細を見る", "상세 보기"],
  "deviceWord13": ["看涨", "Up", "上昇", "상승"],
  "deviceWord14": ["看空", "Down", "下落", "하락"],
  "deviceWord15": ["观望", "Wait", "様子見", "관망"],
  "deviceWord16": ["等待结算", "Awaiting settlement", "決済待ち", "정산 대기"],
  "deviceWord17": ["行情连接中断", "Market connection lost", "相場接続切断", "시세 연결 끊김"],
  "deviceWord18": ["等待恢复", "Awaiting recovery", "復旧待ち", "복구 대기"],
  "deviceWord19": ["运行中", "Running", "実行中", "실행 중"],
  "deviceWord20": ["已暂停", "Paused", "一時停止", "일시 정지"],
  "deviceWord21": ["已结束", "Ended", "終了", "종료"],
  "deviceWord22": ["结算中", "Settling", "決済中", "정산 중"],
  "deviceWord23": ["连接恢复中", "Reconnecting", "再接続中", "다시 연결 중"],
  "deviceWord24": ["等待重试", "Awaiting retry", "再試行待ち", "재시도 대기"],
  "deviceWord25": ["策略战况", "Strategy status", "戦略の戦況", "전략 전황"],
  "deviceWord26": ["上下滑动切换 · 点击查看详情", "Scroll to browse · Tap for details", "スクロールで切替・タップで詳細", "스크롤로 전환 · 탭하여 상세 보기"],
  "deviceWord27": ["暂无策略，点击打开应用开一局", "No strategies. Open the app to start a battle.", "戦略がありません。アプリで対戦を開始してください。", "전략이 없습니다. 앱을 열어 대전을 시작하세요."],
  "deviceWord28": ["快照", "Snapshot", "スナップショット", "스냅샷"],
  "deviceWord29": ["距更新 %s", "Updated %s ago", "更新から %s", "업데이트 후 %s"],
  "deviceWord30": ["更新中断，点击打开应用", "Updates stopped. Open the app.", "更新停止・アプリを開いてください", "업데이트 중단, 앱을 여세요"],
  "deviceWord31": ["读取失败，显示上次快照", "Read failed; showing last snapshot", "取得失敗・最後のスナップショットを表示", "읽기 실패, 마지막 스냅샷 표시"],
  "deviceWord32": ["模拟", "Paper", "シミュレーション", "모의"],
  "deviceWord33": ["打开应用", "Open app", "アプリを開く", "앱 열기"],
  "deviceWord34": ["等待更新", "Awaiting update", "更新待ち", "업데이트 대기"],
  "battlePendingDamaged": ["开局请求记录损坏，请先恢复记录后再开局。", "The pending creation record is damaged. Restore it before starting another battle.", "作成待ちの記録が破損しています。復元してから対戦を開始してください。", "생성 대기 기록이 손상되었습니다. 기록을 복원한 뒤 대전을 시작하세요."],
  "battleNoDecision": ["暂无决策记录", "No decision recorded yet", "判断記録はまだありません", "아직 판단 기록이 없습니다"],
  "battleDefaultModel": ["默认模型", "Default model", "既定のモデル", "기본 모델"],
  "battleLocalRules": ["本地规则", "Local rules", "ローカルルール", "로컬 규칙"],
  "battleLatestBet": ["最近下注", "Latest bet", "直近のベット", "최근 베팅"],
  "battleWon": ["获胜", "Won", "勝ち", "승리"],
  "battleLost": ["未获胜", "Lost", "負け", "패배"],
  "battleNoSession": ["尚未开局", "No battle started", "対戦未開始", "시작한 대전 없음"],
  "battleSelect": ["选择对局", "Select battle", "対戦を選択", "대전 선택"],
  "battlePause": ["暂停", "Pause", "一時停止", "일시 정지"],
  "battleResume": ["继续", "Resume", "再開", "재개"],
  "battleEnd": ["结束本局", "End battle", "対戦を終了", "대전 종료"],
  "battleLoadFailed": ["战场更新失败，当前显示上次读取的记录。", "Update failed. Showing the last loaded records.", "更新に失敗しました。前回取得した記録を表示しています。", "업데이트 실패. 마지막으로 불러온 기록을 표시합니다."],
  "battleEmpty": ["暂无对局，选择人物后开一局。", "No battles yet. Choose your characters to start.", "まだ対戦がありません。キャラクターを選んで開始してください。", "아직 대전이 없습니다. 캐릭터를 선택하고 시작하세요."],
  "battleActionFailed": ["操作未完成，请重试。", "Operation not completed. Please retry.", "操作が完了していません。再試行してください。", "작업이 완료되지 않았습니다. 다시 시도하세요."],
  "battlePendingCreation": ["开局结果待确认；重试将继续同一次请求。", "Battle creation is unconfirmed. Retry continues the same request.", "対戦作成の結果を確認中です。再試行では同じリクエストを使用します。", "대전 생성 결과가 미확인입니다. 재시도하면 같은 요청을 이어갑니다."],
  "battleRetryCreation": ["确认开局结果", "Confirm creation result", "作成結果を確認", "생성 결과 확인"],
  "battleCreating": ["正在开局…", "Starting battle…", "対戦を開始中…", "대전 시작 중…"],
  "setupModelUnverified": ["请先在 API 设置中验证所选模型，或选择本地规则。", "Verify the selected model in API settings, or choose local rules.", "API設定で選択したモデルを確認するか、ローカルルールを選んでください。", "API 설정에서 선택한 모델을 확인하거나 로컬 규칙을 선택하세요."],
  "battleStatus_running": ["进行中", "Running", "進行中", "진행 중"],
  "battleStatus_paused": ["已暂停", "Paused", "一時停止中", "일시 정지됨"],
  "battleStatus_ended": ["已结束", "Ended", "終了", "종료됨"],
  "battleStatus_settling": ["等待结算", "Awaiting settlement", "決済待ち", "정산 대기"],
  "battleStatus_awaiting-settlement": ["等待结算", "Awaiting settlement", "決済待ち", "정산 대기"],
  "battleStatus_retry-paused": ["等待重试", "Waiting to retry", "再試行待ち", "재시도 대기"],
  "battleStatus_reconnecting": ["正在重连", "Reconnecting", "再接続中", "재연결 중"],
  "rankLoading": ["正在读取战绩…", "Loading results…", "戦績を読み込み中…", "전적 불러오는 중…"],
  "rankLoadFailed": ["暂时无法读取战绩", "Results are currently unavailable", "戦績を読み込めません", "전적을 불러올 수 없습니다"],
  "rankRetry": ["重试", "Retry", "再試行", "다시 시도"],
  "rankEmpty": ["暂无对局战绩", "No battle results yet", "対戦成績はまだありません", "아직 대전 전적이 없습니다"],
  "rankNeutralBets": ["平分结算", "Split settlements", "分割決済", "분할 정산"],
  "apiConnected": ["连接已验证", "Connection verified", "接続確認済み", "연결 확인됨"],
  "apiConnectionFailed": ["连接检查失败", "Connection check failed", "接続確認に失敗", "연결 확인 실패"],
  "apiLoading": ["正在读取设置…", "Loading settings…", "設定を読み込み中…", "설정 불러오는 중…"],
  "apiSaving": ["正在保存…", "Saving…", "保存中…", "저장 중…"],
  "apiChecking": ["正在检查连接…", "Checking connection…", "接続を確認中…", "연결 확인 중…"],
  "apiTestConnection": ["保存并检查连接", "Save and check connection", "保存して接続を確認", "저장 및 연결 확인"],
  "apiKeepKey": ["留空保留已保存的密钥", "Leave blank to keep the saved key", "空欄で保存済みキーを維持", "비워 두면 저장된 키 유지"],
  "apiKeyRequired": ["请输入密钥；更改地址后需要重新填写。", "Enter a key. A changed endpoint requires re-entry.", "キーを入力してください。接続先を変更した場合は再入力が必要です。", "키를 입력하세요. 주소를 변경하면 다시 입력해야 합니다."],
  "apiUnavailable": ["连接服务不可用，请从正式应用打开或稍后重试。", "Connection service unavailable. Open the app or retry later.", "接続サービスを利用できません。アプリから開くか、後でもう一度お試しください。", "연결 서비스를 사용할 수 없습니다. 앱에서 열거나 나중에 다시 시도하세요."],
  "apiRequestFailed": ["操作失败，请检查设置后重试。", "Request failed. Check settings and retry.", "操作に失敗しました。設定を確認して再試行してください。", "요청에 실패했습니다. 설정을 확인하고 다시 시도하세요."],
  "apiRemoved": ["已移除连接", "Connection removed", "接続を削除しました", "연결 삭제됨"],
  "brand": [
    "10U 战神",
    "10U Warrior",
    "10U 戦神",
    "10U 전신"
  ],
  "workspace": [
    "我的策略空间",
    "YOUR STRATEGY SPACE",
    "自分の戦略スペース",
    "내 전략 공간"
  ],
  "oneCard": [
    "一个策略，一张人物卡。",
    "One strategy. One character.",
    "ひとつの戦略に、ひとりのキャラクター。",
    "전략 하나에 캐릭터 카드 한 장."
  ],
  "sideHint": [
    "人设不变，性格各异。让每一位战神，按自己的方式判断。",
    "The same identity. A different temperament. Every warrior reads the market their own way.",
    "個性はそのまま、気質はさまざま。それぞれの戦神が自分の方法で判断します。",
    "정체성은 그대로, 성격은 다양하게. 각 전사가 자신의 방식으로 판단합니다."
  ],
  "localConcept": [
    "本地设计预览",
    "Local design preview",
    "ローカルデザインプレビュー",
    "로컬 디자인 미리보기"
  ],
  "concept": ["模拟模式", "Simulation", "シミュレーション", "시뮬레이션"],
  "skip": [
    "跳到主要内容",
    "Skip to content",
    "本文へ移動",
    "본문으로 이동"
  ],
  "nav_draw": [
    "抽取战神",
    "Draw a warrior",
    "戦神を引く",
    "전사 뽑기"
  ],
  "nav_collection": [
    "我的卡册",
    "My collection",
    "カード一覧",
    "내 카드첩"
  ],
  "nav_arena": [
    "战场",
    "Arena",
    "アリーナ",
    "경기장"
  ],
  "nav_ai": [
    "AI 决策",
    "AI decisions",
    "AI 判断",
    "AI 결정"
  ],
  "nav_reports": [
    "战报",
    "Reports",
    "レポート",
    "보고서"
  ],
  "nav_ranking": [
    "战神榜",
    "Leaderboard",
    "ランキング",
    "랭킹"
  ],
  "lineup": [
    "我的阵容",
    "Lineup",
    "マイチーム",
    "내 편성"
  ],
  "demoNote": ["模拟对局 · 仅使用模拟资金", "Paper battles · Simulated funds only", "模擬対戦 · シミュレーション資金のみ", "모의 대전 · 모의 자금만 사용"],
  "eyebrow": [
    "同一个人物，另一种可能",
    "SAME CHARACTER. NEW POSSIBILITIES.",
    "同じ人物の、もうひとつの可能性",
    "같은 인물의 또 다른 가능성"
  ],
  "heroFirst": [
    "每一张，都是",
    "Every card.",
    "一枚ごとに、",
    "카드마다 만나는,"
  ],
  "heroSecond": [
    "不一样的战神。",
    "A different warrior.",
    "違う戦神との出会い。",
    "색다른 전사."
  ],
  "heroDesc": [
    "一张卡，一套策略。人设不变，属性可以重抽。",
    "One card, one strategy. Identity stays; stats can be rerolled.",
    "一枚のカードに、ひとつの戦略。個性はそのまま、能力値は引き直せます。",
    "카드 한 장에 전략 하나. 정체성은 그대로, 능력치는 다시 뽑을 수 있어요."
  ],
  "draw": [
    "再抽一张",
    "Draw another",
    "もう一枚引く",
    "한 장 더 뽑기"
  ],
  "drawing": [
    "正在揭晓…",
    "Revealing…",
    "公開中…",
    "공개 중…"
  ],
  "browse": [
    "查看卡册",
    "View collection",
    "カード一覧へ",
    "카드첩 보기"
  ],
  "freeDraw": [
    "属性抽定后固定 · 稀有不代表更高胜率",
    "Attributes stay fixed · Rarity is not better odds",
    "引いた能力値は固定 · レア度は勝率を示しません",
    "뽑은 능력치는 고정 · 희귀도가 승률을 뜻하지는 않습니다"
  ],
  "characters": [
    "人物原型",
    "Characters",
    "キャラクター原型",
    "캐릭터 원형"
  ],
  "wholeCard": [
    "完整策略",
    "Whole strategy",
    "戦略の全体像",
    "전체 전략"
  ],
  "limits": [
    "人设不变",
    "Core stays",
    "個性はそのまま",
    "정체성 유지"
  ],
  "reveal": [
    "本次遇见的战神",
    "YOUR NEXT WARRIOR",
    "今回出会った戦神",
    "이번에 만난 전사"
  ],
  "fixedCore": [
    "核心人设锁定",
    "SIGNATURE LOCKED",
    "コア設定は固定",
    "핵심 설정 고정"
  ],
  "cardVersion": [
    "策略卡 / 02",
    "STRATEGY / 02",
    "戦略カード / 02",
    "전략 카드 / 02"
  ],
  "save": [
    "收藏这张卡",
    "Save this card",
    "このカードを保存",
    "이 카드 저장"
  ],
  "saved": [
    "已收藏",
    "Saved",
    "保存済み",
    "저장됨"
  ],
  "compare": [
    "对比原版",
    "Compare original",
    "オリジナルと比較",
    "원본과 비교"
  ],
  "recent": [
    "最近收藏",
    "Recently collected",
    "最近のコレクション",
    "최근 수집 카드"
  ],
  "recentHint": [
    "挑一位，看看他有什么不同",
    "Meet their different sides",
    "ひとり選んで、違いを見てみよう",
    "한 명 골라 어떤 점이 다른지 살펴보세요"
  ],
  "allCards": [
    "查看全部",
    "View all",
    "すべて見る",
    "전체 보기"
  ],
  "urge": [
    "手痒",
    "Urge",
    "行動欲",
    "진입 욕구"
  ],
  "sensitivity": [
    "情绪敏感",
    "Sensitivity",
    "感情の敏感さ",
    "감정 민감도"
  ],
  "variance": [
    "变化",
    "Variance",
    "変動性",
    "변동성"
  ],
  "tilt": [
    "上头",
    "Tilt",
    "過熱",
    "과열"
  ],
  "original": [
    "原版",
    "Original",
    "オリジナル",
    "원본"
  ],
  "newVariant": [
    "本次变体",
    "This variant",
    "今回のバリエーション",
    "이번 변형"
  ],
  "unchanged": [
    "保持不变",
    "Unchanged",
    "変更なし",
    "변경 없음"
  ],
  "core": [
    "核心人设",
    "Core identity",
    "コア設定",
    "핵심 설정"
  ],
  "indicators": [
    "参考指标",
    "Indicator inputs",
    "参考指標",
    "참고 지표"
  ],
  "traitEffects": [
    "性格词条",
    "Personality traits",
    "性格特性",
    "성격 특성"
  ],
  "model": [
    "决策模型",
    "Decision model",
    "判断モデル",
    "판단 모델"
  ],
  "modelHint": [
    "每张卡可为本局选择不同模型。",
    "Choose a model for each card in this battle.",
    "この対戦では、カードごとにモデルを選べます。",
    "이번 대전에서 카드마다 다른 모델을 선택할 수 있습니다."
  ],
  "detail": [
    "查看详情",
    "Details",
    "詳細を見る",
    "상세 보기"
  ],
  "addLineup": [
    "加入阵容",
    "Add to lineup",
    "チームに追加",
    "편성에 추가"
  ],
  "inLineup": [
    "已在阵容",
    "In lineup",
    "編成済み",
    "편성됨"
  ],
  "remove": [
    "移出阵容",
    "Remove",
    "チームから外す",
    "편성에서 제외"
  ],
  "close": [
    "关闭",
    "Close",
    "無効",
    "비활성"
  ],
  "collectionTitle": [
    "每一种你，都值得收藏。",
    "A collection of possibilities.",
    "どの個性も、集める価値がある。",
    "어떤 개성이든, 모을 가치가 있어요."
  ],
  "collectionDesc": [
    "已拥有的随时出场，未拥有的等你抽到。",
    "Field your owned cards. Discover the characters still waiting to be drawn.",
    "持っているカードはいつでも出場。まだないカードは抽選で。",
    "보유 카드는 언제든 출전하고, 없는 카드는 뽑기로 만나보세요."
  ],
  "filter_all": [
    "全部卡片",
    "All cards",
    "すべてのカード",
    "모든 카드"
  ],
  "filter_technical": [
    "技术派",
    "Technical",
    "テクニカル派",
    "기술파"
  ],
  "filter_oracle": [
    "占卜派",
    "Oracle",
    "占い派",
    "점술파"
  ],
  "filter_peers": [
    "反押派",
    "Countertrade",
    "逆張り派",
    "역베팅파"
  ],
  "filter_originals": [
    "原型图鉴",
    "All originals",
    "原型図鑑",
    "원형 도감"
  ],
  "emptyTitle": [
    "这里还没有卡片",
    "No cards here yet",
    "カードがありません",
    "카드가 없습니다"
  ],
  "emptyDesc": [
    "试试其他筛选，或去抽一位新的战神。",
    "Try another filter, or draw a new warrior.",
    "条件を変えるか、新しい戦神を引いてみましょう。",
    "필터를 바꾸거나 새로운 전사를 뽑아보세요."
  ],
  "collectToast": [
    "这张完整策略已加入卡册",
    "Saved to your collection",
    "戦略カードをコレクションに追加しました",
    "전략 카드를 카드첩에 추가했습니다"
  ],
  "alreadySaved": [
    "这张卡已经在卡册里了",
    "This card is already saved",
    "このカードは保存済みです",
    "이미 카드첩에 있는 카드입니다"
  ],
  "addedToast": [
    "已加入阵容，并收藏完整卡片",
    "Added to lineup and saved",
    "チームに追加し、カードを保存しました",
    "편성에 추가하고 카드를 저장했습니다"
  ],
  "removedToast": [
    "已从本次阵容移出",
    "Removed from this lineup",
    "今回のチームから外しました",
    "이번 편성에서 제외했습니다"
  ],
  "lineupFull": [
    "每场最多 8 张人物卡",
    "A lineup holds up to 8 cards",
    "一度に編成できるのは8枚までです",
    "대전당 최대 8장을 편성할 수 있습니다"
  ],
  "storageError": [
    "浏览器未能保存；当前修改仅在本次页面有效",
    "Browser storage failed. Changes last for this page session only.",
    "保存できませんでした。変更はこのページ内のみ有効です",
    "저장하지 못했습니다. 변경 사항은 현재 페이지에서만 유효합니다"
  ],
  "rosterTitle": [
    "组一场，有性格的对局。",
    "A lineup with personality.",
    "個性あふれる対戦を組もう。",
    "개성 넘치는 대전을 꾸려보세요."
  ],
  "rosterDesc": [
    "为整张卡选择模型，保留每个人的独立判断。",
    "Choose a model per card. Keep each character’s own judgment.",
    "カードごとにモデルを選び、それぞれの判断を尊重します。",
    "카드마다 모델을 선택하고 각자의 독립적인 판단을 유지합니다."
  ],
  "rosterBoard": [
    "出场人物",
    "Your lineup",
    "出場キャラクター",
    "출전 캐릭터"
  ],
  "rosterSettings": [
    "对局设置",
    "Battle settings",
    "対戦設定",
    "대전 설정"
  ],
  "asset": [
    "币种",
    "Asset",
    "通貨",
    "코인"
  ],
  "period": [
    "每轮时间",
    "Round length",
    "1ラウンドの時間",
    "라운드 시간"
  ],
  "budget": [
    "每位本金",
    "Budget per character",
    "ひとりあたりの元手",
    "캐릭터별 원금"
  ],
  "battleName": [
    "对局名称",
    "Battle name",
    "対戦名",
    "대전 이름"
  ],
  "fiveMin": [
    "5 分钟",
    "5 minutes",
    "5分",
    "5분"
  ],
  "fifteenMin": [
    "15 分钟",
    "15 minutes",
    "15分",
    "15분"
  ],
  "oneHour": [
    "1 小时",
    "1 hour",
    "1時間",
    "1시간"
  ],
  "oneDay": [
    "1 天",
    "1 day",
    "1日",
    "1일"
  ],
  "totalBudget": [
    "总模拟本金",
    "Total paper budget",
    "模擬元手の合計",
    "총 모의 원금"
  ],
  "rosterSize": [
    "出场人数",
    "Characters",
    "出場人数",
    "출전 인원"
  ],
  "previewArena": [
    "预览战场",
    "Preview arena",
    "戦場をプレビュー",
    "전장 미리보기"
  ],
  "needCard": [
    "请先加入至少一张卡",
    "Add at least one card first",
    "カードを1枚以上追加してください",
    "카드를 한 장 이상 추가하세요"
  ],
  "bindCz": [
    "选择参考的 CZ",
    "Select the CZ target",
    "参照するCZを選択",
    "참조할 CZ 선택"
  ],
  "noCz": [
    "缺少 CZ，请先加入",
    "Add a CZ character first",
    "先にCZを追加してください",
    "먼저 CZ를 추가하세요"
  ],
  "dependencyMissing": [
    "装逼的人需要绑定阵容中的 CZ",
    "Show-off needs a CZ target in this lineup",
    "気取り屋にはチーム内のCZの指定が必要です",
    "허세꾼은 편성 내 CZ를 지정해야 합니다"
  ],
  "unsupportedAsset": [
    "CZ 与一姐只支持 BTC、BNB",
    "CZ and First Lady only support BTC and BNB",
    "CZと姉御はBTC・BNBのみ対応です",
    "CZ와 언니는 BTC·BNB만 지원합니다"
  ],
  "invalidBudget": [
    "本金需为 10–1000 之间的数字",
    "Budget must be a number from 10 to 1000",
    "元手は10～1000の数値で入力してください",
    "원금은 10~1000 사이의 숫자로 입력하세요"
  ],
  "apiSettings": [
    "API 连接设置",
    "API connection settings",
    "API 接続設定",
    "API 연결 설정"
  ],
  "apiProvider": [
    "服务商",
    "Provider",
    "プロバイダー",
    "제공업체"
  ],
  "apiCustom": [
    "自定义",
    "Custom",
    "カスタム",
    "사용자 지정"
  ],
  "apiUnconnected": [
    "未连接",
    "Not connected",
    "未接続",
    "미연결"
  ],
  "apiSavedStatus": ["已保存 · 待验证", "Saved · Not verified", "保存済み · 未確認", "저장됨 · 미확인"],
  "apiModelId": [
    "模型 ID",
    "Model ID",
    "モデル ID",
    "모델 ID"
  ],
  "apiModelPlaceholder": [
    "输入模型 ID",
    "Enter a model ID",
    "モデル ID を入力",
    "모델 ID 입력"
  ],
  "apiShowKey": [
    "显示",
    "Show",
    "表示",
    "표시"
  ],
  "apiHideKey": [
    "隐藏",
    "Hide",
    "非表示",
    "숨기기"
  ],
  "apiClear": [
    "清除",
    "Clear",
    "クリア",
    "지우기"
  ],
  "apiSaveSettings": [
    "保存设置",
    "Save settings",
    "設定を保存",
    "설정 저장"
  ],
  "apiPreviewNote": ["密钥加密保存在当前设备。检查连接会调用所选模型。", "Keys are encrypted on this device. Checking a connection calls the selected model.", "キーはこのデバイスに暗号化して保存されます。接続確認では選択したモデルを呼び出します。", "키는 이 기기에 암호화하여 저장됩니다. 연결 확인 시 선택한 모델을 호출합니다."],
  "apiSavedNote": ["设置已保存，请检查连接后使用。", "Settings saved. Check the connection before use.", "設定を保存しました。使用前に接続を確認してください。", "설정을 저장했습니다. 사용 전에 연결을 확인하세요."],
  "walletLabel": [
    "钱包",
    "Wallet",
    "ウォレット",
    "지갑"
  ],
  "walletLoading": ["正在读取钱包…", "Loading wallet…", "ウォレットを読み込み中…", "지갑 불러오는 중…"],
  "walletRefresh": ["刷新状态", "Refresh status", "状態を更新", "상태 새로고침"],
  "walletConnected": ["已连接", "Connected", "接続済み", "연결됨"],
  "walletUnconnected": ["未连接", "Not connected", "未接続", "연결 안 됨"],
  "walletValue": ["钱包资产估值", "Wallet asset value", "ウォレット資産評価額", "지갑 자산 평가액"],
  "walletBalances": ["余额明细", "Balances", "残高明細", "잔액 내역"],
  "walletBalancesUnavailable": ["余额暂时无法读取", "Balances are unavailable", "残高を取得できません", "잔액을 불러올 수 없습니다"],
  "walletNoBalance": ["暂无可用余额", "No available balance", "利用可能な残高はありません", "사용 가능한 잔액 없음"],
  "walletAddress": ["Agent 地址", "Agent address", "Agent アドレス", "Agent 주소"],
  "walletChain": ["首选网络", "Preferred network", "優先ネットワーク", "기본 네트워크"],
  "walletPrediction": ["预测市场权限", "Prediction permission", "予測市場の権限", "예측 시장 권한"],
  "walletEnabled": ["已开启", "Enabled", "有効", "활성화됨"],
  "walletDisabled": ["未开启", "Disabled", "無効", "비활성화됨"],
  "walletQuota": ["剩余额度", "Remaining quota", "残りの利用枠", "남은 한도"],
  "walletPolicy": ["风控方式", "Risk handling", "リスク管理", "위험 관리"],
  "walletConfirmRisk": ["风险交易需 App 确认", "Risky transactions require App confirmation", "リスク取引はアプリでの確認が必要", "위험 거래는 앱 확인 필요"],
  "walletRejectRisk": ["风险交易自动拒绝", "Risky transactions are rejected", "リスク取引は自動拒否", "위험 거래 자동 거부"],
  "walletAppSettings": ["以 Binance App 设置为准", "See Binance App settings", "Binance アプリの設定に従います", "Binance 앱 설정에 따름"],
  "walletExpiry": ["有效至", "Expires", "有効期限", "만료 시간"],
  "walletLocked": ["有待处理交易，请在 Binance App 中查看并处理后刷新。", "A transaction is pending. Check it in Binance App, then refresh.", "処理待ちの取引があります。Binance アプリで確認後、更新してください。", "처리 중인 거래가 있습니다. Binance 앱에서 확인 후 새로고침하세요."],
  "walletDisconnect": ["断开 Agent 会话", "Disconnect Agent session", "Agent セッションを切断", "Agent 세션 연결 해제"],
  "walletScanTitle": ["在 Binance App 中确认连接", "Confirm in Binance App", "Binance アプリで接続を確認", "Binance 앱에서 연결 확인"],
  "walletScanNote": ["扫码或打开官方授权页，核对配对码后确认。返回这里自动刷新。", "Scan or open the official authorization page. Verify the pairing code and confirm. Status refreshes when you return.", "QRコードまたは公式認証ページを開き、ペアリングコードを確認してください。戻ると状態を更新します。", "QR 코드를 스캔하거나 공식 인증 페이지를 여세요. 페어링 코드를 확인하고 승인하세요. 돌아오면 상태가 갱신됩니다."],
  "walletQrAlt": ["Binance 钱包授权二维码", "Binance wallet authorization QR code", "Binance ウォレット認証QRコード", "Binance 지갑 인증 QR 코드"],
  "walletPair": ["配对码", "Pairing code", "ペアリングコード", "페어링 코드"],
  "walletWaiting": ["等待 App 确认", "Waiting for App confirmation", "アプリの確認待ち", "앱 확인 대기 중"],
  "walletOpen": ["打开币安授权", "Open Binance authorization", "Binance 認証を開く", "Binance 인증 열기"],
  "walletOfficial": ["打开官方登录页", "Open official login page", "公式ログインページを開く", "공식 로그인 페이지 열기"],
  "walletInvalidLink": ["授权链接不可用，请取消后重新连接。", "Authorization link unavailable. Cancel and reconnect.", "認証リンクが無効です。キャンセルして再接続してください。", "인증 링크를 사용할 수 없습니다. 취소 후 다시 연결하세요."],
  "walletConfirmed": ["我已确认，刷新状态", "I confirmed, refresh status", "確認済み・状態を更新", "확인 완료, 상태 새로고침"],
  "walletCancel": ["取消连接", "Cancel connection", "接続をキャンセル", "연결 취소"],
  "walletConnectNote": ["使用 Binance App 授权连接，钱包会话由当前服务保存。", "Authorize with Binance App. The current service stores your wallet session.", "Binance アプリで接続を認証します。現在のサービスがセッションを保存します。", "Binance 앱에서 연결을 승인하세요. 현재 서비스가 지갑 세션을 보관합니다."],
  "walletConnect": ["连接币安钱包", "Connect Binance wallet", "Binance ウォレットに接続", "Binance 지갑 연결"],
  "walletUnavailable": ["钱包服务暂不可用，请检查网络或服务后刷新。", "Wallet service unavailable. Check your network or service and refresh.", "ウォレットサービスを利用できません。接続を確認して更新してください。", "지갑 서비스를 사용할 수 없습니다. 네트워크나 서비스를 확인 후 새로고침하세요."],
  "walletUnconfirmed": ["操作结果尚未确认，请刷新状态后继续。", "Operation result unconfirmed. Refresh status before continuing.", "操作結果が未確認です。状態を更新してから続行してください。", "작업 결과가 확인되지 않았습니다. 상태를 새로고침한 뒤 계속하세요."],
  "walletExpired": ["授权已过期或被拒绝，请重新连接。", "Authorization expired or rejected. Reconnect to continue.", "認証が期限切れか拒否されました。再接続してください。", "인증이 만료되었거나 거부되었습니다. 다시 연결하세요."],
  "walletOpenFailed": ["无法打开授权页，请使用官方链接或扫码。", "Unable to open authorization. Use the official link or QR code.", "認証ページを開けません。公式リンクまたはQRコードをご利用ください。", "인증 페이지를 열 수 없습니다. 공식 링크나 QR 코드를 이용하세요."],
  "walletReadOnly": ["此入口用于钱包授权和资产查询；对局仍使用模拟资金。", "This entry authorizes the wallet and reads assets. Battles still use paper funds.", "ここではウォレット認証と資産照会を行います。対戦は引き続き仮想資金を使用します。", "이 메뉴는 지갑 인증과 자산 조회용입니다. 대전은 계속 모의 자금을 사용합니다."],
  "newBattle": [
    "开一局",
    "New battle",
    "新規対戦",
    "새 대전"
  ],
  "numberedBattle": [
    "第{n}局",
    "Battle {n}",
    "第{n}戦",
    "제{n}전"
  ],
  "betThisRound": [
    "本轮下注",
    "This round",
    "今回のベット額",
    "이번 라운드 베팅액"
  ],
  "betWaiting": [
    "等待信号",
    "Waiting for signal",
    "シグナル待ち",
    "신호 대기"
  ],
  "betNoOrder": [
    "本轮未下注",
    "No bet this round",
    "今回はベットなし",
    "이번 라운드 베팅 없음"
  ],
  "betWaitHint": [
    "有合适机会时再出手",
    "Waiting for a suitable opportunity",
    "好機を待ってから行動",
    "적절한 기회가 오면 진입"
  ],
  "betReference": [
    "下注参考价",
    "Reference price",
    "ベット参照価格",
    "베팅 기준 가격"
  ],
  "betOdds": [
    "下注时赔率",
    "Odds at entry",
    "ベット時のオッズ",
    "베팅 시 배당률"
  ],
  "betReturn": [
    "获胜返还（含本金）",
    "Return if won (incl. stake)",
    "勝利時の払戻額（元金含む）",
    "적중 시 반환액(원금 포함)"
  ],
  "betAvailable": [
    "可用",
    "Available",
    "利用可能",
    "사용 가능"
  ],
  "betFrozen": [
    "冻结",
    "Reserved",
    "確保中",
    "잠금"
  ],
  "betWinRate": [
    "胜率",
    "Win rate",
    "勝率",
    "승률"
  ],
  "betDemo": ["模拟资金", "Simulation funds", "模擬資金", "모의 자금"],
  "betDetails": [
    "查看详情",
    "Details",
    "詳細を見る",
    "상세 보기"
  ],
  "betPreviewNote": ["模拟下注记录，不代表钱包交易。", "Simulation bets, not wallet transactions.", "模擬ベットの記録です。ウォレット取引ではありません。", "모의 베팅 기록이며 지갑 거래가 아닙니다."],
  "betMarketReference": [
    "行情参考",
    "Market reference",
    "参考相場",
    "시세 참고"
  ],
  "betNoMarket": ["暂无已记录的指标数据。", "No recorded indicator data yet.", "記録された指標データはまだありません。", "아직 기록된 지표 데이터가 없습니다."],
  "betStrategyNotes": [
    "策略说明",
    "Strategy notes",
    "戦略の説明",
    "전략 설명"
  ],
  "rankLatest": [
    "最近一局",
    "Latest battle",
    "直近1戦",
    "최근 1전"
  ],
  "rankThree": [
    "最近三局",
    "Last 3 battles",
    "直近3戦",
    "최근 3전"
  ],
  "rankAll": [
    "全部",
    "All battles",
    "すべて",
    "전체"
  ],
  "rankRange": [
    "排名范围",
    "Ranking range",
    "ランキング範囲",
    "순위 범위"
  ],
  "rankDemoNote": ["模拟战绩 · 按净收益排名", "Simulation results · Ranked by net profit", "模擬戦績 · 純利益順", "모의 전적 · 순이익 순"],
  "rankBattles": [
    "对局数",
    "Battles",
    "対戦数",
    "대전 수"
  ],
  "rankBattleUnit": [
    "局",
    "battles",
    "戦",
    "전"
  ],
  "rankHistoryDemo": ["模拟资金 · 已保存的战绩", "Simulation funds · Saved results", "模擬資金 · 保存済み戦績", "모의 자금 · 저장된 전적"],
  "rankInvested": [
    "累计投入",
    "Total starting capital",
    "累計投入額",
    "누적 투입액"
  ],
  "rankRecovered": [
    "累计收回",
    "Total closing capital",
    "累計回収額",
    "누적 회수액"
  ],
  "rankRecentResults": [
    "战况与资金变化",
    "Results & capital changes",
    "戦績と資金推移",
    "전적 및 자금 변화"
  ],
  "rankSettled": [
    "已结算",
    "Settled",
    "精算済み",
    "정산 완료"
  ],
  "rankOpening": [
    "开局资金",
    "Opening balance",
    "開始時の資金",
    "시작 자금"
  ],
  "rankClosing": [
    "结束资金",
    "Closing balance",
    "終了時の資金",
    "종료 자금"
  ],
  "rankWon": [
    "赢",
    "Won",
    "勝ち",
    "승"
  ],
  "rankLost": [
    "输",
    "Lost",
    "負け",
    "패"
  ],
  "rankFlat": [
    "平",
    "Draw",
    "引き分け",
    "무"
  ],
  "rankStake": [
    "下注",
    "Stake",
    "ベット額",
    "베팅액"
  ],
  "rankPayout": [
    "返还（含本金）",
    "Payout (incl. stake)",
    "払戻額（元手込み）",
    "반환액 (원금 포함)"
  ],
  "rankBalance": [
    "资金变化",
    "Balance change",
    "資金の推移",
    "자금 변화"
  ],
  "arenaSettings": [
    "战局设置",
    "Battle settings",
    "対戦設定",
    "대전 설정"
  ],
  "setupChoose": [
    "选择出场人物",
    "Choose characters",
    "出場キャラクターを選択",
    "출전 캐릭터 선택"
  ],
  "setupRounds": [
    "轮次",
    "Rounds",
    "ラウンド",
    "라운드"
  ],
  "tenRounds": [
    "10 轮",
    "10 rounds",
    "10 ラウンド",
    "10 라운드"
  ],
  "twentyRounds": [
    "20 轮",
    "20 rounds",
    "20 ラウンド",
    "20 라운드"
  ],
  "untilLoss": [
    "亏完为止",
    "Until depleted",
    "資金が尽きるまで",
    "잔액 소진까지"
  ],
  "decreaseBudget": [
    "减少本金",
    "Decrease budget",
    "元手を減らす",
    "원금 줄이기"
  ],
  "increaseBudget": [
    "增加本金",
    "Increase budget",
    "元手を増やす",
    "원금 늘리기"
  ],
  "realtimeEntry": [
    "实时进场",
    "Intraround entry",
    "シグナルで参加",
    "신호 기반 진입"
  ],
  "setupRealtimeHint": [
    "开启：轮内出现新信号时判断；关闭：仅在每轮开始时判断。",
    "On: assess new signals during a round. Off: assess only at the start of each round.",
    "オン：ラウンド中の新シグナルで判断。オフ：各ラウンド開始時のみ判断。",
    "켜기: 라운드 중 새 신호가 나오면 판단. 끄기: 각 라운드 시작 시에만 판단."
  ],
  "startDemo": [
    "开打",
    "Start",
    "対戦開始",
    "대전 시작"
  ],
  "setupDemoOnly": ["使用模拟资金；所选模型会在对局中自动判断。", "Uses simulation funds. Selected models make decisions during the battle.", "模擬資金を使用します。選択したモデルが対戦中に判断します。", "모의 자금을 사용합니다. 선택한 모델이 대전 중 판단합니다."],
  "arenaOverview": [
    "对局概览",
    "Battle overview",
    "対戦概要",
    "대전 개요"
  ],
  "arenaEquity": [
    "模拟净值",
    "Demo equity",
    "模擬純資産",
    "모의 순자산"
  ],
  "arenaRound": [
    "轮次",
    "Round",
    "ラウンド",
    "라운드"
  ],
  "arenaPeople": [
    "人物战况",
    "Strategy performance",
    "キャラクターの戦況",
    "캐릭터 전황"
  ],
  "arenaTitle": [
    "性格碰撞，判断各异。",
    "Different characters. Different calls.",
    "個性がぶつかり、判断が分かれる。",
    "개성이 부딪치고, 판단이 갈립니다."
  ],
  "arenaDesc": [
    "查看每位人物的决定与依据。",
    "See each character’s decision and evidence.",
    "各キャラクターの判断と根拠を見てみよう。",
    "각 캐릭터의 판단과 근거를 확인하세요."
  ],
  "round": [
    "第 07 轮 / 20",
    "ROUND 07 / 20",
    "第07ラウンド / 20",
    "07 라운드 / 20"
  ],
  "global": [
    "全局气氛",
    "Arena mood",
    "全体の雰囲気",
    "전체 분위기"
  ],
  "nextRound": [
    "预览下一轮",
    "Preview next round",
    "次ラウンドをプレビュー",
    "다음 라운드 미리보기"
  ],
  "pending": [
    "设置已保存，将用于后续下注",
    "Settings saved for upcoming bets",
    "今後のベット用に設定を保存しました",
    "이후 베팅에 사용할 설정을 저장했습니다"
  ],
  "currentSettings": [
    "当前生效",
    "Applied now",
    "現在の設定",
    "현재 적용 중"
  ],
  "balance": [
    "模拟余额",
    "Paper balance",
    "模擬残高",
    "모의 잔액"
  ],
  "frozen": [
    "冻结",
    "Reserved",
    "確保中",
    "잠금"
  ],
  "up": [
    "看涨",
    "UP",
    "上昇",
    "상승"
  ],
  "down": [
    "看空",
    "DOWN",
    "下落",
    "하락"
  ],
  "wait": [
    "观望",
    "WAIT",
    "様子見",
    "관망"
  ],
  "reason_liangXi": [
    "短线冲劲给出机会；人设仍只允许半仓或全仓。",
    "Short pressure offers a setup. Only half or full balance remains legal.",
    "短期の勢いが好機を示します。ベットは半額か全額のみです。",
    "단기 추진력이 기회를 제시합니다. 설정상 절반 또는 전액만 베팅합니다."
  ],
  "reason_kzgMask": [
    "结构尚待量能确认，先等下一次有效机会。",
    "Structure still needs flow confirmation. Waiting for a valid setup.",
    "値動きの構造に出来高の裏付けが必要です。次の好機を待ちます。",
    "가격 구조에 거래량 확인이 더 필요합니다. 다음 유효한 기회를 기다립니다."
  ],
  "reason_diviner": [
    "塔罗偏向看涨；行情确认不足，本轮等待。",
    "Tarot leans up. Market confirmation is insufficient; waiting.",
    "タロットは上昇寄りですが、相場の裏付けが不足しているため待機します。",
    "타로는 상승 쪽이지만 시세 확인이 부족해 이번에는 기다립니다."
  ],
  "reason_fengShui": [
    "卦象偏向看涨，指标检查决定是否执行。",
    "Oracle leans up. Market checks decide whether to act.",
    "卦は上昇寄り。指標の確認で実行を判断します。",
    "괘는 상승 쪽입니다. 지표 확인 후 실행 여부를 판단합니다."
  ],
  "reason_czBrother": [
    "上涨趋势获得量能支持；只在允许资产上做多。",
    "Bullish trend has volume support. Long-only on allowed assets.",
    "上昇トレンドを出来高が支持。許可された銘柄でのみロングします。",
    "상승 추세를 거래량이 뒷받침합니다. 허용된 자산에서만 롱을 취합니다."
  ],
  "reason_showoff": [
    "参考本轮 CZ 的有效看涨下注，候选方向看空。",
    "References CZ’s valid up bet this round; candidate is down.",
    "今回のCZの有効な上昇ベットを参照し、下落を候補にします。",
    "이번 CZ의 유효한 상승 베팅을 참고해 하락을 후보로 정합니다."
  ],
  "reason_contrarian": [
    "参考其他人的已结算表现和本轮方向，形成反向候选。",
    "Uses settled peer history and current bets to form a countertrade.",
    "他の参加者の決済済み成績と今回の方向を参考に、逆方向を候補にします。",
    "다른 참가자의 정산 전적과 이번 방향을 참고해 반대 방향을 후보로 정합니다."
  ],
  "reason_generic": [
    "指标与人物规则共同限定候选；AI 再权衡是否出手。",
    "Indicators and identity constrain candidates. AI weighs whether to act.",
    "指標とキャラクタールールで候補を絞り、AIが行動の可否を検討します。",
    "지표와 캐릭터 규칙으로 후보를 제한하고 AI가 진입 여부를 판단합니다."
  ],
  "showEvidence": [
    "查看决策依据",
    "See decision evidence",
    "判断根拠を見る",
    "판단 근거 보기"
  ],
  "aiTitle": [
    "让 AI 判断，让规则守边界。",
    "AI makes the call. Rules set the bounds.",
    "AIが判断し、ルールが境界を守る。",
    "AI는 판단하고, 규칙은 경계를 지킵니다."
  ],
  "aiDesc": [
    "人物决定风格，AI 判断方向、是否出手和下注金额。",
    "Characters define the style. AI assesses direction, whether to act and the stake.",
    "キャラクターがスタイルを定め、AIが方向・行動・金額を判断します。",
    "캐릭터가 스타일을 정하고 AI가 방향·진입 여부·금액을 판단합니다."
  ],
  "step1Title": [
    "读懂这一轮",
    "Read the round",
    "今回の状況を読む",
    "이번 상황 읽기"
  ],
  "step1Desc": [
    "读取指标、价格结构、资金和已结算历史。",
    "Read indicators, structure, capital and settled history.",
    "指標、価格構造、資金、決済履歴を読み取ります。",
    "지표, 가격 구조, 자금, 정산 이력을 읽습니다."
  ],
  "step2Title": [
    "带着性格判断",
    "Apply the persona",
    "個性に沿って判断",
    "성격에 따라 판단"
  ],
  "step2Desc": [
    "结合完整卡片、词条、上头与手痒，权衡矛盾信号。",
    "Weigh conflicting signals through the card, traits, tilt and urge.",
    "カード、特性、熱中度、行動欲から相反するシグナルを検討します。",
    "카드, 특성, 흥분도, 진입 욕구를 바탕으로 상충하는 신호를 검토합니다."
  ],
  "step3Title": [
    "提出决定",
    "Propose an action",
    "判断を提案",
    "판단 제안"
  ],
  "step3Desc": [
    "选择下注或观望，并在合法范围提出金额。",
    "Choose a bet or skip and propose an amount within legal bounds.",
    "ベットか待機かを選び、許可範囲内で金額を提案します。",
    "베팅 또는 관망을 선택하고 허용 범위 내 금액을 제안합니다."
  ],
  "step4Title": [
    "程序核验",
    "Validate the call",
    "プログラムで検証",
    "프로그램 검증"
  ],
  "step4Desc": [
    "检查人设、数据、来源、资金。违规决定不执行。",
    "Check identity, data, sources and capital. Reject invalid actions.",
    "設定、データ、根拠、資金を確認。違反する判断は実行しません。",
    "설정, 데이터, 출처, 자금을 확인합니다. 규칙 위반 판단은 실행하지 않습니다."
  ],
  "aiSummary": [
    "AI 决策摘要",
    "AI decision summary",
    "AI判断の要約",
    "AI 판단 요약"
  ],
  "aiQuestion": [
    "狙击版 KZG 为什么选择等待？",
    "Why does Sniper KZG wait?",
    "スナイパー版KZGはなぜ待機を選んだ？",
    "저격형 KZG는 왜 기다리기로 했을까요?"
  ],
  "aiAnswer": [
    "趋势偏多，但突破后的成交确认还不充分。狙击性格更重视确认，因此先观望；即使全员手痒提高，也不能编造量能支持。",
    "The trend leans bullish, but post-breakout volume confirmation is weak. The sniper temperament values confirmation and waits. Higher arena urge cannot invent volume support.",
    "トレンドは上昇寄りですが、突破後の出来高の確認が不十分です。確認を重視するため待機します。全員の行動欲が上がっても、出来高の根拠は捏造できません。",
    "추세는 상승 쪽이지만 돌파 후 거래량 확인이 부족합니다. 확인을 중시하므로 관망합니다. 전체 진입 욕구가 높아져도 거래량 근거를 지어낼 수는 없습니다."
  ],
  "evidence": [
    "支持依据",
    "Supporting evidence",
    "支持する根拠",
    "뒷받침 근거"
  ],
  "counterEvidence": [
    "反向证据",
    "Counter-evidence",
    "反対する根拠",
    "반대 근거"
  ],
  "personaInfluence": [
    "人物影响",
    "Persona effect",
    "個性の影響",
    "캐릭터 영향"
  ],
  "evidenceText": [
    "EMA 向上 · DMI 偏多",
    "EMA points up · DMI leans bullish",
    "EMA上向き · DMIは上昇寄り",
    "EMA 상승 · DMI 상승 우세"
  ],
  "counterText": [
    "成交量确认不足 · 突破仍待验证",
    "Weak volume confirmation · Breakout unconfirmed",
    "出来高の確認不足 · 突破は検証待ち",
    "거래량 확인 부족 · 돌파 검증 대기"
  ],
  "personaText": [
    "技术确认 · 耐心等位 · 手痒较低",
    "Technical confirmation · Patience · Lower urge",
    "テクニカル確認 · 辛抱強く待機 · 低めの行動欲",
    "기술적 확인 · 인내심 있는 대기 · 낮은 진입 욕구"
  ],
  "bindModels": [
    "为阵容选择模型",
    "Choose lineup models",
    "チームのモデルを選ぶ",
    "편성 모델 선택"
  ],
  "connections": [
    "模型接入设计",
    "Model integration",
    "モデル接続デザイン",
    "모델 연결 디자인"
  ],
  "connectionNote": [
    "接入后可查看模型调用记录与失败原因。",
    "Once connected, view model calls and failure reasons.",
    "接続後は呼び出し履歴や失敗理由を確認できます。",
    "연결 후 모델 호출 이력과 실패 이유를 확인할 수 있습니다."
  ],
  "reportsTitle": [
    "每一个决定，都有来处。",
    "Every decision has a source.",
    "すべての判断に、根拠がある。",
    "모든 판단에는 근거가 있습니다."
  ],
  "reportsDesc": [
    "人物规则、指标、AI 权衡与执行限制，逐层看清。",
    "Follow identity, indicators, AI judgment and execution limits.",
    "キャラクタールール、指標、AIの検討、実行制限を順に確認。",
    "캐릭터 규칙, 지표, AI 검토, 실행 제한을 단계별로 확인합니다."
  ],
  "traceSource": [
    "方向来源",
    "Direction source",
    "方向の根拠",
    "방향 출처"
  ],
  "traceIndicators": [
    "行情依据",
    "Market evidence",
    "相場の根拠",
    "시세 근거"
  ],
  "traceTraits": [
    "卡片与全局",
    "Card and mood",
    "カードと全体設定",
    "카드 및 전체 설정"
  ],
  "traceAI": [
    "AI 权衡",
    "AI judgment",
    "AIの検討",
    "AI 검토"
  ],
  "traceGate": [
    "程序检查",
    "Program validation",
    "プログラム検証",
    "프로그램 확인"
  ],
  "traceResult": [
    "本轮结果",
    "Round result",
    "今回の結果",
    "이번 결과"
  ],
  "trace1": [
    "人物方法先确定候选范围；占卜与反押角色保留各自来源。",
    "The character’s method defines candidates. Oracles and countertraders keep their own sources.",
    "キャラクターの方法で候補を絞ります。占い・逆張りはそれぞれの根拠を保持します。",
    "캐릭터의 방법으로 후보를 정합니다. 점술·역베팅은 각자의 출처를 유지합니다."
  ],
  "trace2": [
    "展示支持与反对证据；缺失数据不以 0 代替。",
    "Show supporting and opposing evidence. Missing data is never replaced with zero.",
    "支持・反対の根拠を表示し、欠損データを0で代用しません。",
    "찬성·반대 근거를 표시하며 누락 데이터를 0으로 대체하지 않습니다."
  ],
  "trace3": [
    "卡片属性固定，全局气氛只影响本场有效值。",
    "Card attributes stay fixed. Arena mood only affects this battle.",
    "カードの能力値は固定。全体の雰囲気は今回の有効値にのみ影響します。",
    "카드 능력치는 고정이며 전체 분위기는 이번 대전의 유효값에만 영향을 줍니다."
  ],
  "trace4": [
    "模型可以认为机会不值得，主动选择观望。",
    "The model may judge the opportunity unworthy and choose to skip.",
    "モデルは好機でないと判断し、自ら待機を選べます。",
    "모델은 기회가 적절하지 않다고 판단해 관망을 선택할 수 있습니다."
  ],
  "trace5": [
    "合法方向、人物依赖、仓位与资金必须全部通过。",
    "Direction, character dependencies, stakes and capital must all be valid.",
    "方向、キャラクター依存、ポジション、資金のすべてを検証します。",
    "방향, 캐릭터 의존 관계, 포지션, 자금이 모두 검증을 통과해야 합니다."
  ],
  "rankingTitle": [
    "看看哪一种性格，更合拍。",
    "Find the temperament that fits.",
    "どの個性が、相性ぴったり？",
    "어떤 개성이 더 잘 맞을까요?"
  ],
  "rankingDesc": [
    "在相同对局条件下比较表现。",
    "Compare performance under the same battle conditions.",
    "同じ対戦条件で成績を比べます。",
    "동일한 대전 조건에서 성과를 비교합니다."
  ],
  "rank": [
    "排名",
    "Rank",
    "順位",
    "순위"
  ],
  "character": [
    "人物策略",
    "Character strategy",
    "キャラクター戦略",
    "캐릭터 전략"
  ],
  "net": [
    "净收益",
    "Net result",
    "純利益",
    "순이익"
  ],
  "rounds": [
    "已结算",
    "Settled",
    "精算済み",
    "정산 완료"
  ],
  "conditions": [
    "条件",
    "Conditions",
    "条件",
    "조건"
  ],
  "sameConditions": [
    "同周期 · 同气氛",
    "Same period · Same mood",
    "同じ期間 · 同じ雰囲気",
    "동일 기간 · 동일 분위기"
  ],
  "globalDesc": [
  "应用后影响即将提交的下注，已提交的下注保持不变。",
  "Applies to upcoming bets. Submitted bets remain unchanged.",
  "今後送信するベットに適用します。送信済みのベットは変わりません。",
  "이후 제출할 베팅에 적용합니다. 이미 제출한 베팅은 바뀌지 않습니다."
],
  "preset_original": [
    "保持本色",
    "Stay true",
    "元の個性",
    "본래 성격"
  ],
  "preset_social": [
    "热闹一点",
    "More lively",
    "少し賑やかに",
    "조금 활기차게"
  ],
  "preset_chaos": [
    "全员上头",
    "Full tilt",
    "全員熱中",
    "모두 흥분"
  ],
  "globalUrge": [
    "全员手痒",
    "Arena urge",
    "全員の行動欲",
    "전체 진입 욕구"
  ],
  "globalTilt": [
    "全场上头",
    "Arena tilt",
    "全体の熱中度",
    "전체 흥분도"
  ],
  "amplify": [
    "情绪放大",
    "Emotion gain",
    "感情の増幅",
    "감정 증폭"
  ],
  "coolSpeed": [
    "冷静速度",
    "Cooling speed",
    "冷静になる速さ",
    "진정 속도"
  ],
  "globalVariance": [
    "全场变化",
    "Arena variance",
    "全体の変動性",
    "전체 변동성"
  ],
  "urgeHint": [
    "0 保留各自性格，100 全员最手痒；仍可观望。",
    "0 preserves each temperament; 100 maximizes urge. Skipping stays valid.",
    "0は各自の個性を保持、100は全員の行動欲が最大。待機も可能です。",
    "0은 각자의 성격을 유지하고 100은 모두의 진입 욕구를 최대로 합니다. 관망도 가능합니다."
  ],
  "tiltHint": [
    "影响合法出手和仓位，不解除人物与资金限制。",
    "Influences legal participation and stake choices, never identity or capital limits.",
    "許可範囲内の行動・金額に影響します。設定や資金制限は解除しません。",
    "허용된 진입·금액에 영향을 줍니다. 캐릭터·자금 제한을 해제하지 않습니다."
  ],
  "gainHint": [
    "调整胜负带来的情绪增量。",
    "Scales emotion changes from settled wins and losses.",
    "勝敗による感情の変化量を調整します。",
    "승패에 따른 감정 변화량을 조절합니다."
  ],
  "varianceHint": [
    "调整合法选择与受支持模型的温度，不增加预测准确率。",
    "Varies legal choices and temperature on supported models, not predictive accuracy.",
    "許可された選択と対応モデルの温度を調整します。予測精度は上がりません。",
    "허용된 선택과 지원 모델의 온도를 조절하며 예측 정확도는 높이지 않습니다."
  ],
  "slow": [
    "慢",
    "Slow",
    "遅い",
    "느림"
  ],
  "normal": [
    "标准",
    "Standard",
    "標準",
    "보통"
  ],
  "fast": [
    "快",
    "Fast",
    "速い",
    "빠름"
  ],
  "impact": [
  "手痒预览",
  "Urge preview",
  "行動欲求プレビュー",
  "행동 욕구 미리보기"
],
  "applyNext": [
    "应用",
    "Apply",
    "適用",
    "적용"
  ],
  "appliedToast": [
    "已应用新的下注设置",
    "New betting settings applied",
    "新しいベット設定を適用しました",
    "새 베팅 설정을 적용했습니다"
  ],
  "pendingToast": [
    "已保存，已下注不受影响",
    "Saved. Placed bets are unaffected.",
    "保存しました。確定済みベットに影響はありません",
    "저장했습니다. 이미 접수된 베팅에는 영향이 없습니다"
  ],
  "noRequest": [
    "未发送模型请求",
    "No model requests",
    "モデルリクエスト未送信",
    "모델 요청 미전송"
  ],
  "nameHint": [
    "自定义名称不会翻译",
    "Custom names are not translated",
    "カスタム名は翻訳しません",
    "사용자 지정 이름은 번역하지 않습니다"
  ],
  "aiLink": [
    "了解 AI 如何参与",
    "How AI participates",
    "AIの役割を見る",
    "AI 역할 알아보기"
  ],
  "dismissNotice": [
    "关闭提示",
    "Dismiss notice",
    "お知らせを閉じる",
    "안내 닫기"
  ],
  "lockText": [
    "指标可调整，人设不可替换",
    "Indicators may vary. Identity stays.",
    "指標は調整可能、コア設定は変更不可",
    "지표는 조정 가능, 핵심 설정은 변경 불가"
  ],
  "boundaries": [
    "不变的边界",
    "Fixed boundaries",
    "変わらない境界",
    "변하지 않는 경계"
  ],
  "stake_liangXi": [
    "仅半仓 / 全仓",
    "Half / full balance only",
    "半額か全額のみ",
    "절반 또는 전액만"
  ],
  "stake_default": [
    "服从人物与用户上限",
    "Within character and user caps",
    "キャラクター・ユーザーの上限を遵守",
    "캐릭터·사용자 한도 준수"
  ],
  "trait_eager": [
    "手痒难耐",
    "Eager to act",
    "行動せずにいられない",
    "참기 힘든 진입 욕구"
  ],
  "trait_snowball": [
    "连胜膨胀",
    "Win-streak swagger",
    "連勝で強気",
    "연승 후 자신감 상승"
  ],
  "trait_stubborn": [
    "急于翻本",
    "Eager to recover",
    "損を急いで取り返す",
    "빠른 손실 만회 욕구"
  ],
  "trait_patient": [
    "耐心等位",
    "Patient entry",
    "辛抱強く待機",
    "인내심 있는 대기"
  ],
  "trait_confirm": [
    "技术确认",
    "Evidence first",
    "テクニカル確認",
    "기술적 확인"
  ],
  "trait_rethink": [
    "失效重判",
    "Reassess invalidation",
    "無効なら再評価",
    "무효 시 재평가"
  ],
  "trait_retreat": [
    "输了缩手",
    "Scale down after losses",
    "負けたら控える",
    "패배 후 자제"
  ],
  "trait_protect": [
    "利润护体",
    "Protect gains",
    "利益を守る",
    "수익 보호"
  ],
  "trait_core": [
    "原版人设",
    "Original identity",
    "オリジナル設定",
    "원본 설정"
  ],
  "style_wild": [
    "疯狂版",
    "Wild",
    "大胆版",
    "과감형"
  ],
  "style_patient": [
    "隐忍版",
    "Patient",
    "忍耐版",
    "인내형"
  ],
  "style_sniper": [
    "狙击版",
    "Sniper",
    "スナイパー版",
    "저격형"
  ],
  "style_chase": [
    "追击版",
    "Chaser",
    "追撃版",
    "추격형"
  ],
  "style_cautious": [
    "谨慎版",
    "Cautious",
    "慎重版",
    "신중형"
  ],
  "style_stubborn": [
    "执着版",
    "Persistent",
    "執着版",
    "집착형"
  ],
  "style_precise": [
    "精算版",
    "Calculated",
    "精密版",
    "정밀형"
  ],
  "style_trend": [
    "趋势版",
    "Trend",
    "トレンド版",
    "추세형"
  ],
  "style_original": [
    "原版",
    "Original",
    "オリジナル",
    "원본"
  ],
  "core_liangXi": [
    "偏爱梭哈，短线双向；出手只用半仓或全仓",
    "Loves going all in; short-term, both sides, half or full balance only",
    "全額勝負を好む短期の両方向派。ベットは半額か全額のみ",
    "전액 승부를 즐기는 단기 양방향파. 절반 또는 전액만 베팅"
  ],
  "core_kzgMask": [
    "技术派，先看结构，再看量能确认",
    "Technical trader: structure first, then volume confirmation",
    "テクニカル派。構造を見てから出来高で確認",
    "기술파. 구조를 먼저 보고 거래량으로 확인"
  ],
  "core_diviner": [
    "塔罗定方向 · 行情来确认",
    "Tarot sets direction · Markets confirm",
    "タロットで方向 · 相場で確認",
    "타로로 방향 결정 · 시세로 확인"
  ],
  "core_fengShui": [
    "卦象与五行 · 行情来确认",
    "Oracle and elements · Markets confirm",
    "卦と五行 · 相場で確認",
    "괘와 오행 · 시세로 확인"
  ],
  "core_showoff": [
    "只反押 CZ 的本轮有效下注",
    "Only counter CZ’s valid current-round bet",
    "今回のCZの有効なベットにのみ逆張り",
    "이번 CZ의 유효한 베팅에만 역베팅"
  ],
  "core_contrarian": [
    "参考众人战绩 · 加权反押",
    "Read peer history · Weighted countertrade",
    "皆の戦績を参照 · 加重逆張り",
    "다른 참가자 전적 참고 · 가중 역베팅"
  ],
  "core_czBrother": [
    "仅做多 BTC / BNB",
    "Long-only BTC / BNB",
    "BTC / BNBのロングのみ",
    "BTC / BNB 롱만"
  ],
  "core_firstLady": [
    "独立判断 · 仅做多 BTC / BNB",
    "Independent · Long-only BTC / BNB",
    "独立判断 · BTC / BNBのロングのみ",
    "독립적 판단 · BTC / BNB 롱만"
  ],
  "core_aggressive": [
    "短线追冲劲 · 信号成立才出手",
    "Chase short pressure · Only valid signals",
    "短期の勢いを追う · 有効シグナルで行動",
    "단기 추진력 추격 · 유효 신호에 진입"
  ],
  "core_smart": [
    "先分局势 · 再权衡指标",
    "Read the regime · Weigh the evidence",
    "局面を分類 · 指標を検討",
    "국면 분류 · 지표 검토"
  ],
  "core_conservative": [
    "小仓谨慎 · 保护利润",
    "Small stakes · Protect profits",
    "少額で慎重に · 利益を守る",
    "소액으로 신중하게 · 수익 보호"
  ],
  "core_trendFollowing": [
    "跟随趋势 · 等待确认",
    "Follow the trend · Wait for confirmation",
    "トレンドに追随 · 確認を待つ",
    "추세 추종 · 확인 대기"
  ],
  "core_meanReversion": [
    "寻找反转 · 不硬顶强单边",
    "Hunt reversals · Respect strong trends",
    "反転を探す · 強い一方向相場には逆らわない",
    "반전 탐색 · 강한 단방향 추세에 맞서지 않음"
  ],
  "core_breakout": [
    "捕捉突破 · 成交确认",
    "Catch breakouts · Confirm with volume",
    "突破を捉える · 出来高で確認",
    "돌파 포착 · 거래량 확인"
  ],
  "core_orderFlow": [
    "主动买卖流 · 盘口确认",
    "Active flow · Order-book confirmation",
    "成行注文の流れ · 板で確認",
    "시장가 주문 흐름 · 호가창 확인"
  ],
  "core_volatilityGuard": [
    "低波动 · 小仓位",
    "Calm volatility · Small stakes",
    "低ボラティリティ · 小さなポジション",
    "낮은 변동성 · 작은 포지션"
  ],
  "core_consensus": [
    "六项共识 · 背景过滤",
    "Six-signal consensus · Context filter",
    "6指標の合意 · 大局で絞る",
    "6개 지표 합의 · 배경 필터"
  ],
  "core_priceAction": [
    "纯裸 K · 形态给方向",
    "Raw candles · Patterns set direction",
    "ローソク足のみ · パターンで方向を判断",
    "캔들만 활용 · 패턴으로 방향 판단"
  ],
  "source_technical": [
    "技术证据",
    "TECHNICAL",
    "テクニカル根拠",
    "기술적 근거"
  ],
  "source_oracle": [
    "占卜来源",
    "ORACLE",
    "占いの根拠",
    "점술 근거"
  ],
  "source_peers": [
    "人物依赖",
    "COUNTERTRADE",
    "キャラクター依存",
    "캐릭터 의존"
  ],
  "kzg": [
    "KZG 口罩哥",
    "KZG Mask Bro",
    "KZG マスク兄貴",
    "KZG 마스크 형님"
  ],
  "viewAi": [
    "查看 AI 分工",
    "Explore AI’s role",
    "AIの役割分担を見る",
    "AI 역할 분담 보기"
  ],
  "brandBadge": [
    "战神",
    "Warrior",
    "戦神",
    "전신"
  ],
  "drawAvailable": [
    "可抽次数",
    "Draws available",
    "残り抽選回数",
    "남은 뽑기 횟수"
  ],
  "drawFull": [
    "次数已满",
    "Fully recharged",
    "回数は上限です",
    "횟수 가득 참"
  ],
  "drawNext": [
    "下次恢复",
    "Next recharge",
    "次の回復",
    "다음 충전"
  ],
  "drawCooling": [
    "冷却中",
    "Recharging",
    "回復待ち",
    "충전 대기"
  ],
  "drawEmpty": [
    "次数已用完，倒计时结束后可再抽一次",
    "No draws left. One draw returns when the timer ends.",
    "回数を使い切りました。回復後にもう一度引けます",
    "횟수를 모두 사용했습니다. 충전 후 다시 뽑을 수 있습니다"
  ],
  "drawRule": [
    "每 10 分钟恢复 1 次，最多 5 次；抽到自动收藏。",
    "Recover 1 draw every 10 min, up to 5. Cards save automatically.",
    "10分ごとに1回回復、最大5回。引いたカードは自動保存。",
    "10분마다 1회 충전, 최대 5회. 뽑은 카드는 자동 저장됩니다."
  ],
  "owned": [
    "已拥有",
    "Owned",
    "所持済み",
    "보유 중"
  ],
  "unowned": [
    "未拥有",
    "Not owned",
    "未所持",
    "미보유"
  ],
  "filter_owned": [
    "已拥有",
    "Owned",
    "所持済み",
    "보유 중"
  ],
  "filter_unowned": [
    "未拥有",
    "Not owned",
    "未所持",
    "미보유"
  ],
  "goDraw": [
    "去抽卡",
    "Draw a card",
    "カードを引く",
    "카드 뽑기"
  ],
  "viewOwned": [
    "查看已拥有",
    "View owned",
    "所持カードを見る",
    "보유 카드 보기"
  ],
  "drawToOwn": [
    "先通过抽卡获得这位人物",
    "Draw this character to add it to your collection.",
    "抽選でこのキャラクターを獲得してください",
    "뽑기로 이 캐릭터를 획득하세요"
  ],
  "unownedPreview": [
    "未拥有 · 可查看原版介绍，抽到后解锁",
    "Not owned · Preview the original. Draw to unlock.",
    "未所持 · 原型を閲覧できます。抽選で獲得すると解放",
    "미보유 · 원본 소개를 볼 수 있으며 뽑기로 획득하면 해제됩니다"
  ],
  "originalPreview": [
    "原版介绍 · 实际词条与数值请查看已拥有的卡",
    "Original preview · See your owned cards for their traits and stats.",
    "原型の紹介 · 実際の特性・数値は所持カードをご確認ください",
    "원본 소개 · 실제 특성·수치는 보유 카드를 확인하세요"
  ],
  "collectedCharacters": [
    "已解锁人物",
    "Characters unlocked",
    "解放済みキャラクター",
    "해제한 캐릭터"
  ],
  "ownedCards": [
    "拥有卡片",
    "Cards owned",
    "所持カード",
    "보유 카드"
  ],
  "ownershipFilter": [
    "拥有状态",
    "Ownership",
    "所持状態",
    "보유 상태"
  ],
  "categoryFilter": [
    "人物分类",
    "Character categories",
    "キャラクター分類",
    "캐릭터 분류"
  ],
  "allTypes": [
    "全部类型",
    "All types",
    "すべてのタイプ",
    "모든 유형"
  ],
  "ownershipAll": [
    "全部",
    "All",
    "すべて",
    "전체"
  ],
  "lineupToggle": [
    "阵容",
    "Lineup",
    "チーム",
    "편성"
  ],
  "selectLineup": [
    "选择阵容",
    "Select lineup",
    "チームを選択",
    "편성 선택"
  ],
  "finishLineupSelection": [
    "完成选择",
    "Done selecting",
    "選択完了",
    "선택 완료"
  ],
  "attributeLabel": [
    "属性",
    "Attribute",
    "能力値",
    "능력치"
  ],
  "currentCard": [
    "当前卡片",
    "This card",
    "現在のカード",
    "현재 카드"
  ],
  "statDelta": [
    "变化量",
    "Change",
    "変化量",
    "변화량"
  ],
  "refreshAttributes": [
    "刷新属性 · 1 次",
    "Reroll stats · 1 draw",
    "能力値を再抽選 · 1回",
    "능력치 다시 뽑기 · 1회"
  ],
  "refreshingAttributes": [
    "刷新中…",
    "Rerolling…",
    "再抽選中…",
    "다시 뽑는 중…"
  ],
  "refreshAttributeNote": [
    "消耗 1 次抽卡机会，仅重抽三项数值；可能升高或降低，人设、词条和指标不变。",
    "Costs 1 draw. Rerolls only the three stats, up or down. Identity, traits and indicators stay the same.",
    "抽選1回を消費し、3つの数値のみ引き直します。上下どちらにも変化します。コア設定・特性・指標は変わりません。",
    "뽑기 1회를 사용해 세 수치만 다시 뽑습니다. 높아지거나 낮아질 수 있으며 핵심 설정·특성·지표는 그대로입니다."
  ],
  "attributesRefreshed": [
    "属性已刷新，消耗 1 次抽卡机会",
    "Stats rerolled. Used 1 draw.",
    "能力値を再抽選しました。抽選1回を消費",
    "능력치를 다시 뽑았습니다. 뽑기 1회 사용"
  ],
  "replaceOwned": [
    "覆盖已有",
    "Replace owned",
    "所持カードを置換",
    "보유 카드 교체"
  ],
  "replaceTarget": [
    "选择要覆盖的卡片（手痒 / 情绪敏感 / 变化）",
    "Choose a card to replace (urge / sensitivity / variance)",
    "置き換えるカードを選択（行動欲 / 感情の敏感さ / 変動性）",
    "교체할 카드 선택 (진입 욕구 / 감정 민감도 / 변동성)"
  ],
  "replacementNote": [
    "每个人物只保留一张。保留已有卡，或用新卡覆盖；阵容位置和模型绑定不变，不额外消耗次数。",
    "One card per character. Keep the existing card or replace it with this draw. Its lineup slot and model binding stay, at no extra cost.",
    "各キャラクターは1枚のみ所持できます。現在のカードを残すか、新しいカードに置き換えます。編成とモデルの割り当ては保持され、追加の回数は消費しません。",
    "캐릭터당 한 장만 보유할 수 있습니다. 기존 카드를 유지하거나 새 카드로 교체하세요. 편성과 모델 배정은 유지되며 추가 횟수는 사용하지 않습니다."
  ],
  "keepOldCard": [
    "保留已有",
    "Keep existing",
    "現在のカードを残す",
    "기존 카드 유지"
  ],
  "duplicatePending": [
    "该人物已拥有，请选择是否覆盖。",
    "Already owned. Choose whether to replace it.",
    "所持済みのキャラクターです。置き換えるか選んでください。",
    "이미 보유한 캐릭터입니다. 교체 여부를 선택하세요."
  ],
  "confirmReplace": [
    "确认覆盖",
    "Confirm replacement",
    "置換を確定",
    "교체 확인"
  ],
  "cardReplaced": [
    "已覆盖，阵容与模型设置已保留",
    "Card replaced. Lineup and model settings retained.",
    "置換しました。編成とモデル設定は保持されています",
    "교체했습니다. 편성과 모델 설정은 유지됩니다"
  ],
  "cardChanged": [
    "卡片已更新，请重新核对后再覆盖",
    "Card changed. Review the updated comparison first.",
    "カードが更新されました。確認してから置き換えてください",
    "카드가 업데이트되었습니다. 다시 확인한 후 교체하세요"
  ],
  "ownedCard": [
    "已有卡片",
    "Owned card",
    "所持カード",
    "보유 카드"
  ],
  "drawnCard": [
    "抽到的新卡",
    "New draw",
    "新しく引いたカード",
    "새로 뽑은 카드"
  ],
  "catchphrase_kzgMask": [
    "别催，等量价把话说完。",
    "Easy. Let price and volume speak.",
    "焦るな、出来高と価格の話を最後まで聞こう。",
    "재촉하지 마, 거래량과 가격이 말할 때까지 기다려."
  ],
  "catchphrase_liangXi": [
    "要么不出手，出手就想梭哈！",
    "If I’m in, I want to go all in!",
    "やるなら、全額勝負したくなる！",
    "안 할 거면 몰라도, 한다면 전부 걸고 싶어!"
  ],
  "catchphrase_diviner": [
    "先翻三张牌，再问涨和跌。",
    "Three cards first. Bulls or bears later.",
    "まず3枚引いて、上か下かを聞こう。",
    "먼저 카드 세 장을 뽑고, 오를지 내릴지 물어보자."
  ],
  "catchphrase_fengShui": [
    "待我起一卦，看看风往哪边吹。",
    "Let me cast a hexagram and read the winds.",
    "卦を立てて、風向きを見よう。",
    "점을 쳐서 바람이 어디로 부는지 보자."
  ],
  "catchphrase_showoff": [
    "CZ一出手，我就走反手。",
    "CZ makes a move. I take the other side.",
    "CZが動けば、俺は逆に行く。",
    "CZ가 움직이면 난 반대로 간다."
  ],
  "catchphrase_contrarian": [
    "先翻翻战绩，再跟大家唱反调。",
    "Check their track record, then take the other side.",
    "戦績を見てから、みんなに逆らおう。",
    "전적부터 살펴보고 다들 가는 방향을 거슬러 보자."
  ],
  "catchphrase_czBrother": [
    "大饼和BNB，等风来就做多。",
    "BTC and BNB. Long when the wind is right.",
    "BTCとBNB、追い風が来たらロングだ。",
    "BTC와 BNB, 순풍이 오면 롱이지."
  ],
  "catchphrase_firstLady": [
    "我的单，我自己拍板。",
    "My trade. My call.",
    "私の注文は、私が決める。",
    "내 주문은 내가 결정해."
  ],
  "catchphrase_aggressive": [
    "十U上场，气势拉满！",
    "Ten U in the arena. Full warrior energy!",
    "10Uで出場、気合いは全開！",
    "10U로 출전, 기세는 최고조!"
  ],
  "catchphrase_smart": [
    "先别上头，我把全局算一遍。",
    "Stay cool. Let me run the numbers.",
    "熱くなるな、まず全体を計算する。",
    "흥분하지 마, 전체부터 계산해 볼게."
  ],
  "catchphrase_conservative": [
    "少赚点没事，本钱得在。",
    "Small gains are fine. Keep the principal.",
    "儲けは少なくてもいい。元手は守る。",
    "덜 벌어도 괜찮아. 원금은 지켜야지."
  ],
  "catchphrase_trendFollowing": [
    "风往哪儿吹，我就往哪儿飞。",
    "I fly wherever the trend blows.",
    "風が吹く方へ、俺も飛んでいく。",
    "바람 부는 곳으로 나도 날아간다."
  ],
  "catchphrase_meanReversion": [
    "你们追涨杀跌，我等拐弯那一刻。",
    "You chase the move. I wait for the turn.",
    "みんなが追いかける間、俺は曲がり角を待つ。",
    "다들 추격할 때 난 방향이 꺾일 순간을 기다려."
  ],
  "catchphrase_breakout": [
    "量能到位，准备点火！",
    "Volume confirmed. Ready for liftoff!",
    "出来高よし、点火準備！",
    "거래량 확인, 점화 준비!"
  ],
  "catchphrase_orderFlow": [
    "别听喊单，我去查查大单的脚印。",
    "Skip the hype. I’m tracking whale footprints.",
    "掛け声より、大口の足跡を追おう。",
    "소문보다 큰손의 발자국을 추적하자."
  ],
  "catchphrase_volatilityGuard": [
    "浪太大？我先趴一会儿。",
    "Rough seas? I’ll sit this one out.",
    "波が高すぎる？しばらく伏せておく。",
    "파도가 너무 높아? 잠깐 엎드려 있을게."
  ],
  "catchphrase_consensus": [
    "六位，先投票，再出招。",
    "Six signals. Vote first, move second.",
    "6人とも、まず投票してから動こう。",
    "여섯 명 모두, 투표부터 하고 움직이자."
  ],
  "catchphrase_priceAction": [
    "指标先放放，这根K线有话说。",
    "Hold the indicators. This candle has a story.",
    "指標は置いて、この足の話を聞こう。",
    "지표는 잠시 내려놓고, 이 캔들의 말을 들어보자."
  ],
  "persona_liangXi": [
    "凉兮",
    "Liang Xi",
    "リャンシー",
    "량시"
  ],
  "persona_diviner": [
    "占卜师",
    "Diviner",
    "占い師",
    "점술사"
  ],
  "persona_czBrother": [
    "CZ大表哥",
    "CZ Big Bro",
    "CZ兄貴",
    "CZ 형님"
  ],
  "persona_showoff": [
    "装逼的人",
    "Show-off",
    "気取り屋",
    "허세꾼"
  ],
  "persona_contrarian": [
    "逆行者",
    "Contrarian",
    "逆張り屋",
    "역행자"
  ],
  "persona_fengShui": [
    "风水师",
    "Feng Shui Master",
    "風水師",
    "풍수사"
  ],
  "persona_aggressive": [
    "10U战神",
    "10U Warrior",
    "10U戦神",
    "10U 전사"
  ],
  "persona_smart": [
    "超级AI",
    "Super AI",
    "スーパーAI",
    "슈퍼 AI"
  ],
  "persona_conservative": [
    "守财奴",
    "Miser",
    "守銭奴",
    "구두쇠"
  ],
  "persona_trendFollowing": [
    "跟风侠",
    "Trend Chaser",
    "トレンド追随者",
    "추세 추격자"
  ],
  "persona_meanReversion": [
    "抄底摸顶王",
    "Bottom & Top Hunter",
    "底値・天井ハンター",
    "바닥·천장 사냥꾼"
  ],
  "persona_breakout": [
    "火箭哥",
    "Rocket Bro",
    "ロケット兄貴",
    "로켓 형님"
  ],
  "persona_orderFlow": [
    "大单侦探",
    "Whale Detective",
    "大口探偵",
    "큰손 탐정"
  ],
  "persona_volatilityGuard": [
    "稳如老狗",
    "Steady Dog",
    "堅実ワンコ",
    "신중한 강아지"
  ],
  "persona_consensus": [
    "六票战神",
    "Six-Vote Warrior",
    "六票戦神",
    "여섯 표의 전사"
  ],
  "persona_priceAction": [
    "蜡烛哥",
    "Candlestick Bro",
    "ローソク足兄貴",
    "캔들 형님"
  ],
  "persona_firstLady": [
    "一姐",
    "First Lady",
    "姉御",
    "언니"
  ],
  "indicator_priceChange": [
    "1m / 5m 涨跌",
    "1m / 5m change",
    "1m / 5m 騰落率",
    "1m / 5m 등락률"
  ],
  "indicator_rsi": [
    "RSI 14",
    "RSI 14",
    "RSI 14",
    "RSI 14"
  ],
  "indicator_ema": [
    "EMA 5 / 20",
    "EMA 5 / 20",
    "EMA 5 / 20",
    "EMA 5 / 20"
  ],
  "indicator_volume": [
    "成交量倍率",
    "Volume ratio",
    "出来高比率",
    "거래량 배율"
  ],
  "indicator_orderbook": [
    "订单簿失衡",
    "Order-book imbalance",
    "板の不均衡",
    "호가 불균형"
  ],
  "indicator_odds": [
    "市场赔率",
    "Market odds",
    "市場オッズ",
    "시장 배당률"
  ],
  "indicator_sma": [
    "SMA 5 / 20 / 50",
    "SMA 5 / 20 / 50",
    "SMA 5 / 20 / 50",
    "SMA 5 / 20 / 50"
  ],
  "indicator_macd": [
    "MACD 12 / 26 / 9",
    "MACD 12 / 26 / 9",
    "MACD 12 / 26 / 9",
    "MACD 12 / 26 / 9"
  ],
  "indicator_bollinger": [
    "布林带 20",
    "Bollinger Bands 20",
    "ボリンジャーバンド 20",
    "볼린저 밴드 20"
  ],
  "indicator_atr": [
    "ATR 14 波动幅度",
    "ATR 14 range",
    "ATR 14 値幅",
    "ATR 14 변동폭"
  ],
  "indicator_adx": [
    "ADX / DMI 14",
    "ADX / DMI 14",
    "ADX / DMI 14",
    "ADX / DMI 14"
  ],
  "indicator_stochastic": [
    "随机指标 14 / 3",
    "Stochastic 14 / 3",
    "ストキャスティクス 14 / 3",
    "스토캐스틱 14 / 3"
  ],
  "indicator_cci": [
    "CCI 20",
    "CCI 20",
    "CCI 20",
    "CCI 20"
  ],
  "indicator_williams": [
    "威廉指标 14",
    "Williams %R 14",
    "ウィリアムズ %R 14",
    "윌리엄스 %R 14"
  ],
  "indicator_mfi": [
    "资金流量 MFI 14",
    "Money Flow Index 14",
    "マネーフロー MFI 14",
    "자금 흐름 MFI 14"
  ],
  "indicator_obv": [
    "OBV 20 分钟净变化",
    "OBV 20m net change",
    "OBV 20 分純変化",
    "OBV 20분 순변화"
  ],
  "indicator_vwap": [
    "滚动 VWAP 20 分钟",
    "Rolling VWAP 20m",
    "ローリング VWAP 20 分",
    "이동 VWAP 20분"
  ],
  "indicator_roc": [
    "ROC 10 / 20",
    "ROC 10 / 20",
    "ROC 10 / 20",
    "ROC 10 / 20"
  ],
  "indicator_momentum": [
    "动量 10",
    "Momentum 10",
    "モメンタム 10",
    "모멘텀 10"
  ],
  "indicator_volatility": [
    "已实现波动率 20",
    "Realized volatility 20",
    "実現ボラティリティ 20",
    "실현 변동성 20"
  ],
  "indicator_donchian": [
    "唐奇安突破通道 20",
    "Donchian breakout 20",
    "ドンチャン・ブレイクアウト 20",
    "돈치안 돌파 채널 20"
  ],
  "indicator_takerFlow": [
    "主动买卖流 5 分钟",
    "Taker flow 5m",
    "テイカーフロー 5 分",
    "시장가 매수·매도 흐름 5분"
  ],
  "indicator_spread": [
    "买卖价差与微价格",
    "Spread & microprice",
    "スプレッドとマイクロプライス",
    "매수·매도 스프레드와 마이크로 가격"
  ],
  "indicator_cmf": [
    "蔡金资金流 CMF 20",
    "Chaikin Money Flow 20",
    "チャイキンマネーフロー CMF 20",
    "차이킨 자금 흐름 CMF 20"
  ],
  "indicator_longReturns": [
    "15m / 60m 涨跌",
    "15m / 60m change",
    "15m / 60m 騰落率",
    "15m / 60m 등락률"
  ],
  "indicator_candles": [
    "最近 20 根裸 K",
    "Latest 20 raw candles",
    "直近20本のローソク足",
    "최근 20개 원시 캔들"
  ],
  "languageLabel": [
    "选择语言",
    "Select language",
    "言語を選択",
    "언어 선택"
  ],
  "mainNavigation": [
    "主导航",
    "Main navigation",
    "メインナビゲーション",
    "주 탐색"
  ],
  "mobileNavigation": [
    "手机导航",
    "Mobile navigation",
    "モバイルナビゲーション",
    "모바일 탐색"
  ],
  "demoSessionName": [
    "紫电观察局",
    "Violet Watch",
    "紫電ウォッチ",
    "자전 관찰전"
  ],
  "battleBook": [
    "账面净值",
    "Book equity",
    "帳簿純資産",
    "장부 순자산"
  ],
  "battleProfit": [
    "当前收益",
    "Current return",
    "現在の損益",
    "현재 수익"
  ],
  "battleRecorded": [
    "账面资金",
    "Book balance",
    "帳簿残高",
    "장부 잔액"
  ],
  "battlePending": [
    "待结算",
    "Pending",
    "決済待ち",
    "정산 대기"
  ],
  "battleChartTitle": [
    "资金变化",
    "Balance history",
    "資金の推移",
    "자금 변화"
  ],
  "battleChartDemo": ["模拟资金", "Simulation funds", "模擬資金", "모의 자금"],
  "battleChartCurrent": [
    "当前资金",
    "Current balance",
    "現在の資金",
    "현재 자금"
  ],
  "battleChartProfit": [
    "已结算收益",
    "Settled profit",
    "確定損益",
    "정산 수익"
  ],
  "battleChartMissing": [
    "历史记录不完整，暂不绘制曲线。",
    "Incomplete history; chart unavailable.",
    "履歴が不完全なため、グラフは表示できません。",
    "이력이 불완전하여 그래프를 표시할 수 없습니다."
  ],
  "battleChartFlat": [
    "还没有结算，资金暂未变化。",
    "No settlements yet; balance is unchanged.",
    "まだ決済がないため、資金は変化していません。",
    "아직 정산이 없어 자금에 변화가 없습니다."
  ],
  "battleChartBrowse": [
    "查看资金记录",
    "Browse balance records",
    "資金履歴を見る",
    "자금 기록 보기"
  ],
  "battleChartInitial": [
    "初始资金",
    "Starting balance",
    "開始時の資金",
    "초기 자금"
  ],
  "battleChartSettlement": [
    "订单结算",
    "Settlement",
    "注文決済",
    "주문 정산"
  ],
  "battleChartDeposit": [
    "补资",
    "Added capital",
    "追加入金",
    "추가 자금"
  ],
  "battleChartNow": [
    "当前",
    "Current",
    "現在",
    "현재"
  ],
  "battleChartNote": [
    "资金包含待结算的下注；追加资金不算收益。",
    "Balance includes pending stakes; added capital is not profit.",
    "資金には未決済のベット元手を含みます。追加入金は利益に含みません。",
    "자금에는 미정산 베팅 원금이 포함되며 추가 자금은 수익이 아닙니다."
  ],
  "rankNetProfit": [
    "净盈利",
    "Net profit",
    "純利益",
    "순이익"
  ],
  "rankBetCount": [
    "下注次数",
    "Bets placed",
    "ベット数",
    "베팅 횟수"
  ],
  "rankScopeWinRate": [
    "范围内胜率",
    "Range win rate",
    "期間内勝率",
    "기간 승률"
  ],
  "rankOverallWinRate": [
    "综合胜率",
    "Overall win rate",
    "総合勝率",
    "종합 승률"
  ],
  "rankOutcomeSplit": [
    "胜负分布",
    "Outcome split",
    "勝敗の内訳",
    "승패 분포"
  ],
  "rankSettledOnly": [
    "仅统计已结算下注",
    "Settled bets only",
    "決済済みのみ",
    "정산된 베팅만"
  ],
  "rankWinningBets": [
    "获胜次数",
    "Winning bets",
    "勝ちベット数",
    "승리 횟수"
  ],
  "rankLosingBets": [
    "失利次数",
    "Losing bets",
    "負けベット数",
    "패배 횟수"
  ],
  "rankFundStats": [
    "资金表现",
    "Money performance",
    "資金実績",
    "자금 성과"
  ],
  "rankTotalStaked": [
    "累计下注额",
    "Total staked",
    "累計ベット額",
    "누적 베팅액"
  ],
  "rankTotalPayout": [
    "累计返还 · 含本金",
    "Payouts incl. stakes",
    "累計払戻額・元本込",
    "누적 반환액 · 원금 포함"
  ],
  "rankStakeRoi": [
    "下注收益率",
    "Return on stakes",
    "ベット収益率",
    "베팅 수익률"
  ],
  "rankAverageStake": [
    "平均每次下注",
    "Average stake",
    "平均ベット額",
    "평균 베팅액"
  ],
  "rankGrossProfit": [
    "累计盈利",
    "Gross profit",
    "利益合計",
    "총이익"
  ],
  "rankGrossLoss": [
    "累计亏损",
    "Gross loss",
    "損失合計",
    "총손실"
  ],
  "rankStatsDefinition": ["胜率 = 获胜次数 / 胜负已定次数，平分结算不计入胜率；综合胜率取全部历史。收益率 = 净盈利 / 已结算下注额。", "Win rate = wins / decisive outcomes; split settlements are excluded. Overall uses all history. Return = net profit / settled stake.", "勝率＝勝ち数÷勝敗確定数。分割決済は勝率に含みません。総合勝率は全履歴、収益率は純利益÷決済済みベット額です。", "승률 = 승리 / 승패 확정 횟수. 분할 정산은 제외합니다. 종합 승률은 전체 이력, 수익률은 순이익 / 정산 베팅액입니다."],
  "rankOverallSample": [
    "全部历史 · 获胜 / 下注：",
    "All history · wins / bets:",
    "全履歴 · 勝ち / ベット：",
    "전체 이력 · 승리 / 베팅:"
  ],
  "arenaSpotPrice": [
    "现货参考价",
    "Spot reference price",
    "現物参考価格",
    "현물 참고 가격"
  ],
  "arenaPriceSource": [
    "Binance 现货 · 参考价，非预测结算价",
    "Binance Spot · reference price, not settlement price",
    "Binance 現物・参考価格、予測の決済価格ではありません",
    "Binance 현물 · 참고 가격이며 예측 정산 가격이 아닙니다"
  ],
  "arenaPriceUpdated": [
    "行情更新时间",
    "Quote updated at",
    "価格更新時刻",
    "가격 업데이트 시각"
  ],
  "arenaPriceLive": [
    "实时行情",
    "Live price",
    "リアルタイム価格",
    "실시간 가격"
  ],
  "arenaPriceConnecting": [
    "正在连接行情",
    "Connecting to feed",
    "価格に接続中",
    "가격 연결 중"
  ],
  "arenaPriceRetry": [
    "行情断开，正在重连",
    "Disconnected · reconnecting",
    "切断・再接続中",
    "연결 끊김 · 재연결 중"
  ],
  "arenaPricePaused": [
    "行情已暂停",
    "Feed paused",
    "価格配信を一時停止",
    "가격 일시 중지"
  ],
  "arenaPriceUnavailable": [
    "行情暂不可用",
    "Price unavailable",
    "価格を取得できません",
    "가격 이용 불가"
  ],
  "arenaDemoResults": [
    "战况为模拟数据",
    "Battle results are simulated",
    "対戦結果はシミュレーション",
    "대전 결과는 모의 데이터"
  ],
  "persona_sunBrother": [
    "孙哥 · 反指",
    "Sun Bro · Inverse",
    "孫兄貴・逆指標",
    "쑨 형님 · 역지표"
  ],
  "catchphrase_sunBrother": [
    "黄毛薄肌，指标反着来。",
    "Blond and lean. Trade against the signal.",
    "金髪・細マッチョ、指標には逆張り。",
    "금발에 슬림한 근육, 지표는 반대로."
  ],
  "core_sunBrother": [
    "孙哥（孙宇晨）· 技术反指。技术信号看涨则看空，看跌则看涨；信号不明、冲突或缺失时观望。刷新属性不改变反指规则。人物娱乐设定，不代表本人交易方式。",
    "Sun Bro (Justin Sun) · technical inverse. Bullish signals lead to bearish candidates and vice versa; unclear, conflicting or missing signals mean wait. Rerolls preserve this rule. A fictional persona, not his actual trading behavior.",
    "孫兄貴（ジャスティン・サン）・技術指標を反転。上昇シグナルなら下落、下落なら上昇を候補に。曖昧・矛盾・欠損時は待機。属性更新でも逆指標ルールは維持。本人の取引方法とは無関係の娯楽設定です。",
    "쑨 형님(저스틴 선) · 기술 지표 반전. 상승 신호에는 하락, 하락 신호에는 상승을 후보로 선택합니다. 불명확하거나 충돌·누락된 신호에는 관망합니다. 속성을 바꿔도 반전 규칙은 유지됩니다. 실제 거래 방식과 무관한 가상 캐릭터 설정입니다."
  ],
  "trait_inverse": [
    "反指",
    "Inverse signal",
    "逆指標",
    "역지표"
  ],
  "style_inverse": [
    "反指版",
    "Inverse",
    "逆指標版",
    "역지표형"
  ],
  "controlsApplied": [
  "已应用，将用于即将提交的下注",
  "Applied to upcoming bets",
  "今後のベットに適用しました",
  "이후 제출할 베팅에 적용했습니다"
],
  "controlsSaving": [
  "应用中…",
  "Applying…",
  "適用中…",
  "적용 중…"
],
  "controlsChanged": [
  "设置已在其他位置更新，请重新打开后调整",
  "Settings changed elsewhere. Reopen to review them.",
  "設定が別の場所で更新されました。開き直してください。",
  "다른 곳에서 설정이 변경되었습니다. 다시 열어 확인하세요."
],
  "controlsFailed": [
  "应用失败，请检查服务后重试",
  "Could not apply. Check the service and retry.",
  "適用できませんでした。接続を確認して再試行してください。",
  "적용하지 못했습니다. 서비스 연결을 확인하고 다시 시도하세요."
],
  "capitalLimitsTitle": [
  "资金限制",
  "Capital limits",
  "資金制限",
  "자금 제한"
],
  "capitalLimitsHint": [
  "按每位人物独立计算，开局后固定。最低下注 0.10 U；不足最低额则观望。",
  "Applied separately to each character and fixed at creation. Minimum bet: 0.10 U; wait when a legal stake is smaller.",
  "各キャラクターに個別適用し、開始後は固定。最低ベットは0.10 U。下回る場合は待機します。",
  "캐릭터별로 적용하며 시작 후 고정됩니다. 최소 베팅은 0.10 U이며 미달하면 관망합니다."
],
  "capitalPerBet": [
  "单次上限 %",
  "Per-bet cap %",
  "1回の上限 %",
  "1회 상한 %"
],
  "capitalExposure": [
  "未结算总额上限 %",
  "Pending exposure cap %",
  "未決済総額の上限 %",
  "미정산 총액 상한 %"
],
  "capitalStopLoss": [
  "亏损停止线 %",
  "Loss stop %",
  "損失停止ライン %",
  "손실 중단선 %"
],
  "capitalStopOff": [
  "不设置",
  "Off",
  "設定なし",
  "설정 안 함"
],
  "capitalAllowAllIn": [
  "允许具备全仓权限的人物全仓",
  "Allow all-in for eligible characters",
  "対応キャラクターの全額ベットを許可",
  "허용된 캐릭터의 전액 베팅 허용"
],
  "capitalBasisHint": [
  "单次上限按可用资金计算；未结算上限按可用加冻结资金计算；停止线不把补资算作收益。",
  "Per-bet cap uses available cash; pending cap uses cash plus frozen stakes. Added funds do not count as gains for the loss stop.",
  "1回の上限は利用可能資金、未決済上限は利用可能資金と凍結額の合計が基準。追加入金は停止ラインの利益に含みません。",
  "1회 상한은 가용 자금, 미정산 상한은 가용 자금과 동결액 합계 기준입니다. 추가 자금은 중단선의 수익에 포함하지 않습니다."
],
  "capitalStopped": [
  "已触及亏损停止线，停止新增下注，已有下注继续结算。",
  "Loss stop reached. New bets are stopped; submitted bets continue to settle.",
  "損失停止ラインに達しました。新規ベットを停止し、送信済み分は決済を続けます。",
  "손실 중단선에 도달했습니다. 신규 베팅은 중단하고 기존 베팅은 정산을 계속합니다."
],
  "capitalYes": [
  "允许",
  "Allowed",
  "許可",
  "허용"
],
  "capitalNo": [
  "不允许",
  "Not allowed",
  "不可",
  "허용 안 함"
],
  "trait_waitFatigue": ["坐不住了", "Restless after waiting", "待機に飽きる", "대기 후 조급함"],
  "trait_insight": ["我悟了", "A moment of insight", "ひらめき", "깨달음"],
  "trait_cooldown": ["贤者时间", "Cooling off", "クールダウン", "냉각 시간"],
  "trait_resonance": ["信号共振", "Aligned confirmations", "シグナルの共鳴", "신호 공명"],
  "traitState": ["词条状态", "Trait status", "特性の状態", "특성 상태"],
  "traitIdle": ["暂无触发效果", "No triggered effects", "発動中の効果はありません", "발동 중인 효과 없음"],
  "traitRemaining": ["剩余 {n} 个决策轮", "{n} decision rounds left", "残り {n} 決定ラウンド", "남은 결정 라운드 {n}회"],
  "traitCooling": ["冷却 {n} 个决策轮", "Cooldown: {n} decision rounds", "クールダウン：{n} 決定ラウンド", "재사용 대기: 결정 라운드 {n}회"],
  "traitPaused": ["贤者时间生效，暂时停止新下注；已有下注继续结算。", "Cooling off: new bets are paused; submitted bets still settle.", "クールダウン中：新規ベットを停止し、既存分は決済を続けます。", "냉각 시간: 신규 베팅은 잠시 중단하고 기존 베팅은 정산합니다."],
  "collectionLoading": ["正在读取卡册…", "Loading collection…", "コレクションを読み込み中…", "컬렉션을 불러오는 중…"],
  "collectionUnavailable": ["卡册服务暂不可用，请重试。", "Collection is unavailable. Please retry.", "コレクションを利用できません。再試行してください。", "컬렉션을 사용할 수 없습니다. 다시 시도하세요."],
  "collectionUnconfirmed": ["上次操作尚未确认，请重试；不会重复扣次数。", "The previous action is unconfirmed. Retry without spending another chance.", "前回の操作が未確認です。再試行しても回数は重複消費されません。", "이전 작업이 확인되지 않았습니다. 다시 시도해도 횟수는 중복 차감되지 않습니다."],
  "collectionPendingInvalid": ["操作恢复记录损坏，已暂停抽取。原有收藏不变。", "The recovery record is damaged. Drawing is paused; existing cards are unchanged.", "復旧記録が破損しています。抽選を停止しました。所有カードは変更されません。", "복구 기록이 손상되어 뽑기가 중지되었습니다. 기존 카드는 변경되지 않습니다."],
  "collectionMigrationError": ["本地收藏未能导入，原始备份已保留。服务中的收藏不会被覆盖。", "Local cards could not be imported. The original backup is kept; service cards are unchanged.", "ローカルカードを移行できませんでした。元のバックアップを保持し、サービス側のカードは変更しません。", "로컬 카드를 가져오지 못했습니다. 원본 백업을 보관하며 서비스 카드는 변경되지 않습니다."],
  "collectionRetry": ["重试", "Retry", "再試行", "다시 시도"],
  "collectionFirstDraw": ["抽取你的第一张战神", "Draw your first warrior", "最初の戦神を引こう", "첫 전신 카드를 뽑으세요"],
  "collectionUseService": ["使用服务收藏，保留本地备份", "Use service cards and keep local backup", "サービスのカードを使用し、ローカルのバックアップを保持", "서비스 카드 사용 및 로컬 백업 유지"]
};
})();
