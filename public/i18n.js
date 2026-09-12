(() => {
  const messages = {
    '战神':'Warrior','战场':'Arena','战报':'Recap','战神榜':'Ranking','演示':'Demo',
    '开一局':'New game','＋ 开一局':'+ New game','第 001 局':'Game 001','进行中':'Live',
    '净值':'Equity','轮次':'Rounds','全部':'All','本周':'This week','收益率 %':'Return %',
    '开始':'Start','每轮 5 分钟':'5 min / round','本金':'Budget','AI 战绩':'AI results',
    '停止条件':'Stop at','亏损达限':'Loss limit','每位止损':'Loss limit / AI',
    'Ⅱ 暂停':'Ⅱ Pause','▷ 继续':'▷ Resume','继续':'Continue','结束':'End',
    'ETH 看涨':'ETH up','BTC 看涨':'BTC up','ETH 看空':'ETH down','BTC 看空':'BTC down',
    '决策 ↗':'Details ↗','模拟数据':'Demo data','示例战报':'Sample recap',
    '初始 30.00 → 最终 32.46 USDC':'30.00 → 32.46 USDC','回放 ↗':'Replay ↗',
    '我的 AI':'My AI','排名':'Rank','平均收益':'Avg. return','盈利局':'Wins',
    '本榜战神':'Champion','模拟数据 · 按平均单局收益率排名':'Demo data · Ranked by average return per game',
    'AI 与币种':'AI & asset','AI Agent':'AI Agents','选择参赛 AI':'Select participants','每位本金':'Budget / AI',
    '点击卡片选择，齿轮设置':'Tap a card to select · Gear to configure','添加 AI Agent':'Add AI Agent','Agent 设置':'Agent settings','关闭 Agent 设置':'Close Agent settings','Agent 名称':'Agent name','模型':'Model','币种':'Asset','策略':'Strategy','当前策略':'Current strategy','激进策略':'Aggressive','智能策略':'Smart','保守策略':'Conservative','更积极捕捉短线机会，接受更高波动。':'Actively captures short-term opportunities and accepts higher volatility.','综合多种信号，动态调整判断。':'Combines multiple signals and adapts each decision.','优先控制风险，只在信号明确时出手。':'Prioritizes risk control and acts only on clearer signals.','添加 Agent':'Add Agent','保存设置':'Save settings','请输入 Agent 名称。':'Enter an Agent name.','当前最多添加 6 位 Agent。':'Up to 6 Agents can be added.','至少保留一位 Agent。':'Keep at least one Agent.','默认策略可自由调整；齿轮负责设置；在竞技场拖动角色可投喂或删除。':'Default strategies can be changed. Use the gear to configure; drag an Agent in the arena to feed or delete it.',
    '点击币种名称切换':'Tap the asset name to switch','选择 狐火术师':'Select Foxfire Mage','选择 星环机甲':'Select Star-Ring Mecha','选择 深海灵兽':'Select Abyss Spirit',
    '添加币种':'Add asset','关闭币种选择':'Close asset picker','可选币种':'Available assets','选择币种':'Choose asset','币种代码':'Asset symbol','输入币种，如 SOL':'Enter asset, e.g. SOL','添加':'Add','取消':'Cancel','2–10 位字母或数字':'2–10 letters or numbers','请输入 2–10 位字母或数字。':'Enter 2–10 letters or numbers.',
    '默认 BTC，可按需添加新的币种；预测方式后续在 Agent 中设置。':'BTC by default. Add more assets as needed. Prediction logic will be configured in Agent later.',
    '市场':'Market','选择本局市场':'Choose market','选择市场':'Choose market','选择轮次':'Choose rounds','亏完为止':'Until depleted','总预算':'Total budget','开打':'Start','模拟模式 · 不交易':'Demo only · No trades',
    '20 轮后结束':'End after 20 rounds','本金亏完':'Until balance is depleted',
    '结束本局？':'End this game?','结束后查看示例战报。':'View the sample recap after ending.',
    '结束并查看战报':'End & view recap','已暂停':'Paused','已结束':'Ended','准备就绪':'Ready',
    '演示已暂停':'Demo paused','演示已继续':'Demo resumed','已打开示例战报':'Sample recap opened',
    '我的战神 · 当前为纯 UI 演示':'My Warrior · UI demo',
    '请至少选择一位 AI。':'Select at least one AI.',
    '等待第一轮':'Awaiting round 1','等待第一轮决策':'Awaiting first decision',
    '已创建演示对局，尚未产生真实交易':'Demo created · No real trades',
    '模拟决策':'Sample decision','刚刚':'Just now','5 分钟前':'5 min ago','10 分钟前':'10 min ago',
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
    'AI 竞技场':'AI Arena','测试数据':'Test data','测试数据控制':'Test data controls','拖动角色：投喂 / 删除':'Drag Agent: feed / delete','松开投喂':'Release to feed','扔进垃圾桶':'Drop in trash','永久删除':'Delete permanently','竞技场至少保留一位 Agent。':'Keep at least one Agent in the arena.','删除失败，请重试。':'Delete failed. Please try again.',
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
    '查看 Binance Agentic Wallet 与会话状态':'View Binance Agentic Wallet and session status','Agentic 服务不可用':'Agentic service unavailable','Binance Agentic 已连接':'Binance Agentic connected','Agentic 服务可用 · 等待扫码':'Agentic service ready · Scan to connect','正在读取 Binance Agentic Wallet…':'Loading Binance Agentic Wallet…','连接 Binance Agentic Wallet':'Connect Binance Agentic Wallet','使用 Binance App 扫码建立 Agent 会话，不需要浏览器钱包或主钱包私钥。':'Scan with the Binance App to create an Agent session. No browser wallet or master-wallet private key is needed.','二维码已过期，请重新连接。':'The QR code expired. Start again.','扫码连接':'Scan to connect','连接的是实际 Binance Wallet 环境 · 当前页面不会发起真实订单':'This connects to a live Binance Wallet environment · This page cannot place real orders yet',
    '请用 Binance App 扫码':'Scan with the Binance App','核对配对码后，在 App 中确认连接。':'Check the pairing code, then confirm the connection in the App.','Binance Agentic Wallet 登录二维码':'Binance Agentic Wallet sign-in QR code','配对码':'Pairing code','等待 App 确认':'Waiting for App confirmation','二维码有效至':'QR code valid until','在新窗口打开官方登录页 ↗':'Open the official sign-in page ↗','我已确认，刷新状态':'I confirmed · Refresh','请确认 App 内显示的配对码完全一致；超时后需要重新扫码':'Make sure the pairing code in the App matches exactly. Scan again after it expires.',
    '已连接':'Connected','钱包资产估值':'Wallet asset value','实时钱包':'Live wallet','余额明细':'Balance details','暂无可用余额':'No available balance','最多显示 6 项':'Showing up to 6','首选网络':'Primary network','预测市场':'Prediction market','已开启':'Enabled','未开启':'Disabled','剩余额度':'Quota left','风控方式':'Risk handling','风险交易需 App 确认':'Confirm risky trades in App','风险交易自动拒绝':'Reject risky trades automatically','以 Binance App 设置为准':'Uses Binance App settings','会话到期':'Session expires','真实下单':'Live orders','已开放 · 每笔确认':'Enabled · Confirm every order','尚未开放':'Not enabled','刷新状态':'Refresh','断开 Agent 会话':'Disconnect Agent session','扫码会话已生效；未来下单遇到 Binance 二次确认时，对局会暂停等待 App 处理':'The scan session is active. Future Binance secondary confirmations will pause the game until handled in the App.','连接的是实际 Binance Wallet 环境 · 下单会逐笔要求明确确认':'This connects to a live Binance Wallet environment · Every order requires explicit confirmation','真实下单先报价并逐笔等待用户确认；遇到 App 二次确认或状态不明会停止':'Live orders are quoted first and wait for per-order confirmation; App review or uncertain state stops the flow','钱包当前有待处理交易。请打开 Binance App 检查是否需要确认；也可能仍在等待链上确认。处理完成后再刷新，系统不会重复提交。':'A transaction is pending. Check the Binance App for a confirmation request; it may also be awaiting onchain confirmation. Refresh after resolving it. The system will not resubmit.','Binance Agentic Wallet 已连接':'Binance Agentic Wallet connected','Agent 会话已断开':'Agent session disconnected','断开失败，请重试。':'Disconnect failed. Try again.','初始 30.00 → 最终 32.46 USDT':'30.00 → 32.46 USDT',
    '打开 AI API 连接':'Open AI API connections','关闭 AI API 连接':'Close AI API connections','AI API 连接':'AI API connections','连接模型、验证密钥，并在开局前确认服务可用。':'Connect a model, validate its key, and confirm availability before a game.','本机加密存储':'Encrypted on this device','AI 服务商':'AI providers','自定义':'Custom','连接 OpenAI':'Connect OpenAI','连接 Anthropic':'Connect Anthropic','连接 DeepSeek':'Connect DeepSeek','连接 自定义':'Connect custom API','未配置':'Not configured','已保存在本机':'Saved on this device','连接可用':'Connected','API Key':'API Key','仅保存在当前浏览器':'Stored only in this browser','输入 API Key':'Enter API Key','显示':'Show','隐藏':'Hide','显示 API Key':'Show API Key','隐藏 API Key':'Hide API Key','模型 ID':'Model ID','用于最小测试请求':'Used for a minimal test request','输入模型 ID':'Enter model ID','尚未测试':'Not tested','保存后可随时重新验证':'Save it, then test again anytime','保存到本机':'Save on this device','测试连接':'Test connection','本机连接':'Local connections','0 个已配置':'0 configured','还没有保存的 API 连接。':'No API connections saved yet.','Key 不会上传到本项目服务。':'The key is never uploaded to this app server.','它会加密保存在此浏览器的 IndexedDB；测试时仅直接发送给所选 API。清除站点数据会一并删除。':'It is encrypted in this browser\'s IndexedDB and sent only to the selected API during a test. Clearing site data also removes it.','已保存在本机 · 输入新 Key 可替换':'Saved locally · Enter a new key to replace','已加密保存':'Encrypted locally','测试通过':'Test passed','正在测试连接…':'Testing connection…','浏览器正直接联系所选 API':'The browser is contacting the selected API directly','连接成功':'Connection successful','连接失败':'Connection failed','本机存储不可用':'Local storage unavailable','保存失败':'Save failed','移除失败':'Remove failed','本机密钥记录已损坏，请重新保存':'The local credential is damaged. Save it again.','当前浏览器不支持本机加密存储':'This browser does not support encrypted local storage.','本机存储不可用':'Local storage unavailable','无法打开本机凭据仓库':'Could not open the local credential vault.','本机存储操作已取消':'Local storage operation was canceled.','本机存储操作失败':'Local storage operation failed.','Base URL 必须使用 http 或 https':'Base URL must use http or https.','请输入模型 ID':'Enter a model ID.','请输入 API Key':'Enter an API Key.','请求超时，请检查网络或接口地址':'Request timed out. Check the network or API URL.','浏览器直连被网络或 CORS 策略阻止；Key 未经过本机服务':'Direct browser access was blocked by the network or CORS policy. The key did not pass through this app server.'
  };
  let locale='zh';try{locale=localStorage.getItem('warrior-language')==='en'?'en':'zh'}catch{}
  const sources=new WeakMap(),attributes=new WeakMap();
  function english(text){
    if(Object.hasOwn(messages,text))return messages[text];
    return text
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
      .replace(/^选择 (.+)$/, (_,name)=>`Select ${messages[name]||name}`)
      .replace(/^(.+) 已添加，可点击齿轮继续设置$/, '$1 added · Use the gear to continue configuring')
      .replace(/^(.+) Agent 设置已保存$/, '$1 Agent settings saved')
      .replace(/^(.+) 已删除$/, '$1 deleted')
      .replace(/^(\d+) 个已配置$/, '$1 configured')
      .replace(/^连接 (.+)$/, 'Connect $1')
      .replace(/^移除 (.+) 本地凭据$/, 'Remove local $1 credentials')
      .replace(/^(.+) 已保存到本机$/, '$1 saved on this device')
      .replace(/^(.+) 本地凭据已移除$/, 'Local $1 credentials removed')
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
      .replace(/^([A-Z0-9]{2,10}) · 等待第一轮$/, '$1 · Awaiting round 1')
      .replace(/^([A-Z0-9]{2,10}) · 待判断$/, '$1 · Awaiting call')
      .replace(/^(\d{2}:\d{2}) 后结算$/, 'Settlement in $1')
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
  function translate(value){return locale==='en'?english(value):value}
  const switcher=document.createElement('button');switcher.className='language-toggle';switcher.dataset.noTranslate='';
  $('.top-right').insertBefore(switcher,$('#profile'));
  const style=document.createElement('style');style.textContent=`.language-toggle{height:44px;min-width:54px;padding:0 12px;border:1px solid #c9b4dc;border-radius:13px;background:#fff9;color:#62457b;font-size:14px;font-weight:650}.language-toggle:hover{background:#e9def7}.top-right{gap:12px}html[lang=en] .brand span{font-size:18px}html[lang=en] .board-budget{width:210px}html[lang=en] .session-actions .secondary{font-size:14px}html[lang=en] .model-bottom{font-size:12px}@media(max-width:760px){.top-right{gap:8px}.language-toggle{min-width:48px;padding:0 9px}.top-right .demo-label{display:none}html[lang=en] .brand{font-size:25px}html[lang=en] .brand span{font-size:15px}html[lang=en] .board-budget{width:140px;flex-shrink:0}html[lang=en] .board-period button{padding:0 10px;font-size:12px}html[lang=en] .board-controls{gap:5px}html[lang=en] .podium-place{font-size:9px}html[lang=en] .board-table th{font-size:11px}html[lang=en] .model-options label{font-size:12px}html[lang=en] .chart-footer{font-size:10px}html[lang=en] .session-actions>.text-button{font-size:12px}html[lang=en] .form-summary{font-size:12px}}`;
  document.head.append(style);
  const observer=new MutationObserver(render);
  function render(){
    observer.disconnect();
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(node.parentElement?.closest('script,style,[data-no-translate]'))continue;
      const current=node.nodeValue, prior=sources.get(node);
      const source=prior&&current===prior.rendered?prior.source:current;
      const core=source.trim();if(!core)continue;
      const rendered=source.replace(core,translate(core));
      sources.set(node,{source,rendered});if(current!==rendered)node.nodeValue=rendered;
    }
    $$('[aria-label],[title],[placeholder]').forEach(el=>{
      if(el.closest('[data-no-translate]'))return;
      const cache=attributes.get(el)||{};
      for(const name of ['aria-label','title','placeholder']){
        if(!el.hasAttribute(name))continue;
        const current=el.getAttribute(name),prior=cache[name];
        const source=prior&&prior.rendered===current?prior.source:current;
        const rendered=translate(source);cache[name]={source,rendered};el.setAttribute(name,rendered);
      }attributes.set(el,cache);
    });
    document.documentElement.lang=locale==='en'?'en':'zh-CN';
    document.title=locale==='en'?'10U Warrior · AI Arena':'10U 战神 · AI 对局';
    switcher.textContent=locale==='en'?'中文':'EN';
    switcher.setAttribute('aria-label',locale==='en'?'Switch to Chinese':'切换为英文');
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']});
  }
  switcher.onclick=()=>{locale=locale==='en'?'zh':'en';try{localStorage.setItem('warrior-language',locale)}catch{}render()};
  render();
})();
