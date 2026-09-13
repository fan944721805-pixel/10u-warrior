# 10U 战神

移动端优先的 AI 策略模拟对局应用：选择角色、分配虚拟本金，观察决策、结算、收益曲线与战报。使用原生 HTML/CSS/JavaScript 和 Node.js，保留动漫紫、荧光黄及卡通战神风格。

**当前版本：Web 包 0.1.0 / Android 0.1.7（versionCode 8）· 2026-09-13 功能快照。** 自动对局使用模拟资金，真实交易默认关闭。Node 网页版面向本机单用户；Android 在手机本地运行并直接联网。功能更新单独记录在 [CHANGELOG.md](./CHANGELOG.md)。

## 快速开始

需要 Node.js 22 或更高版本：

```sh
npm ci
npm start
```

打开 [本机应用](http://127.0.0.1:5174)。不连接钱包也可使用公开行情进行虚拟对局；使用 [离线演示](http://127.0.0.1:5174/?offline=1) 可体验本地模拟行情。

## 本次功能更新

| 功能 | 当前行为 |
| --- | --- |
| 独立战局 | 每局最多 8 位 Agent，独立本金、轮数、策略与模型绑定；确认后开局，支持切换、暂停、结束、归档删除与重置 |
| 17 种角色策略 | 10U战神、超级AI、守财奴、凉兮、跟风侠、抄底摸顶王、火箭哥、大单侦探、稳如老狗、六票战神、蜡烛哥、CZ大表哥、逆行者、装逼的人、一姐、风水师、占卜师 |
| 策略与进场 | 26 项指标/数据选项，角色仓位阶梯、情绪与出手意愿、条件梭哈、开盘/信号进场，以及本轮开盘位置与剩余时间的方向校正；娱乐角色保留明确标识 |
| 行情与模拟撮合 | BTC/ETH/BNB，5m/15m/1h/1d；实时现货参考价、免连接练习和连接后的预测市场模拟，按原来源结算 |
| 账本与复盘 | 虚拟本金追加、持仓估值、扣除追加本金后的收益、净值曲线、排行榜、逐轮结算弹窗、原始决策记录与账本对账 |
| 可选外部模型 | 保存并测试 AI 连接，按本局策略选择模型或本地规则，记录供应商返回的 token 用量；密钥仅保存在本机 |
| 人工执行桥接 | 从保存的模拟意图获取官方报价，经逐笔确认后单次提交，另存执行记录；默认关闭，模拟记录与真实执行分开 |
| 多端界面 | 中文、英文、日文、韩文；手机、平板、桌面布局；角色图标、皮肤与紧凑策略选择；Capacitor Android 独立联网打包工程 |
| Android 后台模拟 | 前台服务持有唯一模拟引擎和加密账本，通知栏可暂停新下注；进程重启后恢复为暂停，不补下注 |
| 桌面策略小组件 | 滑动浏览策略、模拟资金、已结算收益和本轮方向，点击进入详情；支持语言同步、尺寸调整与过期提示 |
| 模拟流程修复 | 创建请求防重复、逐策略暂停与补资、败北状态与历史战绩；AI 连接异常按错误类型恢复，持续故障暂停相关对局 |

## 模拟行情与结算

模拟仓根据钱包连接状态选择行情，默认使用本地模拟 AI，资金始终是虚拟本金：

- **未连接：公开现货行情练习。** 无需 API Key。使用 Binance Spot 指标；自定义赔率固定为 2 倍，按轮次首根 1m K 线开盘价和末根已收盘 1m K 线收盘价判断涨跌，平局退本金，无模拟手续费。这不是 Binance Prediction 的赔率或结算规则。缺失真实 K 线时等待，不补造价格。
- **已连接：真实预测市场模拟，空钱包也能玩。** 市场、双向盘口和结算结果均来自 Binance。模拟按卖盘逐档计算份额，扣除基础手续费估算后记账，不调用会检查真实余额的交易报价接口。真实下注复用保存的金额、方向、市场和决策，另取官方报价供逐笔确认；页面同时展示模拟份额与官方预计份额，实际成交以回执为准。
- **费用口径：** 对 `PREDICT_FUN` 市场读取其 `feeRateBps`，按每档 `费率 × min(价格, 1−价格) × 份额` 计算 USDT 费用，再按该档价格转换为扣除的份额。依据 [Predict 官方费用规则](https://docs.predict.fun/the-basics/predict-fees-and-limits)。不估算账户折扣、返佣或链上费用；未知供应商、费率缺失、盘口过期或深度不足均跳过。模拟估算不等于实际成交保证。
- **连接变化按轮次生效。** 新轮次重新检查连接；已存在的虚拟订单保留原来源，断开后仍等待其原市场结算，不拿现货结果替代预测市场结果。原生 APK 直接读取公开行情、调用已配置的 AI，使用手机加密账本；`?offline=1` 保留旧版离线演示。手机版不连接钱包。

新局按创建时选中的 Agent、每位本金和轮次执行；预置 A/B/C 各 100U 的旧入口默认暂停。没有正期望、数据过期或响应不合规时跳过。可选择 BTC、ETH 或 BNB，以及 5 分钟、15 分钟、1 小时或 1 天涨跌；同一局使用同一种币种和周期，错过不补单。竞技场、AI 卡片、战报读取同一份服务端模拟账本。

新增纯 K 线角色“蜡烛哥”：只读取最近 20 根已收盘开高低收和 Prediction 赔率，按吞没、影线、连阳连阴、前高前低突破决策；不读取 RSI、MACD、均线、成交量、订单簿或新闻，形态不清楚仍会跳过。

## 验收一局完整流程

点击“开一局”，只选两位 Agent，设置每位 10U、10 轮。第一次提交只显示确认页，可返回修改；点击“确认开局”才创建。确认页显示参与者、币种、每位及总本金、轮次、预计最后一轮到期时间。开局应显示两张卡片、各 10U、总额 20U，轮次从 0/10 开始。创建后修改策略草案，仅影响下一局。

- 每个参与的所选周期节点计一轮；该轮跳过下注也计入轮数。暂停期间不计轮次。
- 第 10 轮或手动“结束”后立即禁止新下注；有未结算订单则显示“等待最后结算”，不提前退款。所有订单结算后才显示“已结束”，冻结整局战报。
- 刷新后保持所选战局；结束状态不可恢复，战报不随时钟、策略草案、重复暂停或服务重启改变。
- Node 网页版切换战局或新建下一局会暂停上一局。页面离开时发送暂停请求；异常关闭未能送达时，服务端在心跳断开超过 30 秒后的下次检查暂停新下注。已有订单仍按原来源结算，结果未公布时继续等待。Android 联网版由后台服务继续运行，页面隐藏不暂停引擎；强制停止、进程重启或覆盖升级后重新打开仍恢复为暂停。
- 离线版不运行后台计时任务，重新打开总是暂停；到期订单在再次读取时完成本地模拟结算。存储写入失败会停止新下注并报错。

验证：运行 `npm run check` 和 `npm test`，包含隔离账本、时钟和模拟决策测试。`scripts/verify-battle-ui.cjs` 检查实际浏览器表单、十轮加速时钟、策略隔离、刷新、页面离开和服务端暂停请求。`scripts/verify-functional-chain.cjs` 检查本节四项功能的浏览器与 HTTP 完整串联，并覆盖 393/768/1440px 中英文布局。需要已安装 Playwright 和 Chrome，可通过 `PLAYWRIGHT_PATH` 指向现有 Playwright 模块。脚本输出临时证据目录，退出时关闭浏览器及隔离服务；不使用现有 `.data`、真实钱包或真实 AI API，不属于实盘或新版 APK 验证。

## 查看决策、结算与真实执行关联

- 服务端新产生的每轮记录保存在战局账本 `auditTrail`：市场原始信息、K 线、现货深度、Prediction 双向盘口、完整 AI 输入、原始响应、风控结果、下注意图、模拟扣款、结算凭据。跳过与拒绝也记录，输入失败会保留错误，不补造缺失数据。每条记录有时间、序号、SHA-256 摘要；摘要用于核对内容，不是防篡改签名。
- 战报下方的“逐轮决策记录”可展开查看。已结束战报固定；旧账本、离线 APK 的旧演示记录没有真实原始凭据，明确显示缺失，不冒充真实行情。完整真实链路使用服务端模式，不使用 `?offline=1`。
- “模拟账本对账”核算初始本金减所有下注加所有结算返还是否等于可用余额。每单结算保存官方市场 ID、结果、状态、原始响应、模拟份额、每份支付额、返还、净收益、结算前后余额。这里的 payout 是根据官方结果计算的模拟返还，不是官方真实成交份额或钱包到账。
- 进入真实模式并选择参与 Agent 后，可从卡片点“核对并确认真实下注”。真实执行另存 `.data/execution-journal.json`，不会回写或改变模拟战报。桥接只从服务端意图读取金额、方向及市场，不接受前端覆盖。练习市场的意图不能桥接；切回模拟模式后不能从页面提交订单。
- 模拟决策只读取市场，不调用交易报价。默认真实提交及执行桥接关闭。设置 `ENABLE_LIVE_QUOTES=true` 开放桥接报价；保持 `ENABLE_LIVE_TRADING=false` 仍不能提交。真实桥接检查钱包及额度，再为保存的意图获取官方报价。真实余额不足可导致报价失败，但不影响模拟账本。原有 `/api/prediction/quotes` 保留原有开关。
- 真正提交还要求单独启用真实交易、勾选本笔确认、点击提交。连接模式的新意图有效 60 秒，并受市场结束前 30 秒限制；正式报价取官方到期和意图到期的较早值。决策本身仍须在原本的决策窗口内完成。暂停、结束或报价等待期间过期都拒绝提交。桥接对每位 Agent 的累计分配使用本局初始本金硬上限，不把模拟利润当真实可花资金；报价即占用分配预算，失败报价除外。这不是子钱包资金隔离。
- 已提交不等于已成交。“查看真实执行记录”中查询官方订单和钱包凭据，按精确订单 ID、交易哈希关联。不按金额相近猜测，不自动重发未知订单。订单历史当前读取最近 100 条；缺失订单 ID、旧订单不在该页、缺失交易哈希或不同的钱包记录均保持未确认，需人工核对。关联到链上流水也不等于已验证结算到账。

桥接接口：

| 接口 | 用途 |
| --- | --- |
| `GET /api/simulation/intent?battleId=…&intentId=…` | 只预览有效的保存意图，不报价、不提交 |
| `POST /api/executions/quote` | 传 `battleId`、`intentId`；为保存的金额、方向及市场获取官方报价 |
| `POST /api/executions/submit` | 传 `executionId`、`confirmed: true`，必须真实交易开关已启用 |
| `GET /api/executions?battleId=…` | 读取持久化执行记录 |
| `POST /api/executions/reconcile` | 传 `executionId`，读取官方订单与关联的钱包凭据 |

本次真实只读检查：BTC/ETH 各取到 30 条 K 线和 20 档现货买卖盘；读取了 2026-09-12 UTC 16:50–16:55 的 Prediction 市场 `5585579`/`5585580`，随后两者官方状态均为 `RESOLVED`，Down 胜出。ETH 预先读取的预测盘口偏旧，不能当作可成交报价。此证据仅证明这些实际数据读取，不代表实时 AI 全场验证、真实报价、真实下单或钱包到账验证。

已完成一次真实市场数据闭环验证：北京时间 2026-09-12 11:20 场次（topic `5568766`）三笔虚拟订单在节点触发，11:25:20 根据官方 `RESOLVED` / Down 胜出结算；A/C 净值 95U，B 105U。期间重启保留未结算订单且未重复扣款。此证据仅证明模拟流程，不代表真实交易成交。

真实下单接口默认返回 `LIVE_TRADING_DISABLED`。AI 决策器没有钱包或下单工具，只接收服务端冻结的指标快照；本地风控校验后仅写模拟账本。新账本为 `.data/rule-ai-ledger.json`，策略为 `.data/simulation-strategies.json`；旧手动模拟账本原样保留、互不混用。只运行一个服务实例。

连接模式先用实际卖盘判断策略预期，再以扣除估算手续费后的份额做最终风控与虚拟记账；历史盘口估算订单仍保留原数值及“不含手续费”标记。真实预测市场仅在官方 `RESOLVED/SETTLED` 且结果明确时结算，平局按官方 50–50 份额价值支付，不保证退回原本金；免连接练习按文首自定义规则结算。胜率不统计平局和待结算单。行情缺失、盘口超过 10 秒、费用不明确、AI 超时或风控拒绝时跳过。

模拟模式验证：`node --test test/simulation-market-source.test.js` 覆盖免连接记账与结算、连接切换、来源恢复、空钱包模拟、逐档费用、意图过期和真实执行门控。`scripts/verify-simulation-modes.cjs` 使用隔离 HTTP 服务和外部接口替身验证中英文及 393/768/1440px 布局。`scripts/verify-live-market-read.cjs` 是手动真实读取检查，仅允许查询现有会话、市场和盘口，禁止交易报价、创建会话或提交订单。2026-09-13 07:05:46 UTC 读取 BTC 市场 `5610011` 和约 1.1 秒龄盘口，1U 扣基础手续费后的模拟份额为 `1.4778347071`。这是实际数据上的估算验证，不是实际成交；没有发起真实订单。

一个让用户为多个 AI 分配独立预算、观看对局和收益排行的移动端优先应用。当前已接入 Binance Agentic Wallet 的真实扫码会话、钱包信息、Binance Prediction 市场查询，以及“报价 → 人工确认 → 单次提交 → 查单”的真实下单 API。

给其他 AI 的最简调用流程见 [AI_AGENT_USAGE.md](./AI_AGENT_USAGE.md)。前端职责、样式分层与 Agent 皮肤扩展契约见 [UI_ARCHITECTURE.md](./UI_ARCHITECTURE.md)。

## 本地运行

需要 Node.js 22 或更高版本。在本目录运行：

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5174 。服务默认只监听本机。

```sh
npm run check
npm test
```

## Android APK

Android 0.1.7 不依赖本项目服务端：手机直接获取公开行情并调用已配置的 AI，对局与策略保存在设备加密账本中。后台服务持有唯一执行实例，支持运行通知、后台设置引导和桌面策略小组件；仍受系统与厂商省电策略限制。不连接钱包、不读取真实资产、不提交真实交易。本机构建测试 APK：

```powershell
npm run android:apk
```

产物位于 `android/app/build/outputs/apk/debug/app-debug.apk`。该文件是调试签名的侧载测试包，不是正式发布包。环境、能力边界和发布签名清单见 [Android APK 打包说明](./ANDROID_BUILD.md)。

## AI 决策模式

默认使用本地规则。在“再开一局”选好参战策略后，点击“配置 AI”打开独立弹窗，每个策略单选一个已连接且测试通过的模型或本地规则。保存后应用，取消则放弃修改。

模型 ID 和连接版本随本局 Agent 配置保存，不修改其他战局或全局策略。连接失效或版本变化后，旧绑定明确跳过，不能静默改用另一模型；重新创建战局可绑定更新后的连接。旧战局没有独立绑定时继续兼容历史全局分配。API 设置页保留连接测试和 token 统计，不再显示逐策略试跑按钮或批量分配区。

密钥由本机服务使用 AES-GCM 加密写入 `.data/ai-connections.json`，加密密钥保存在同目录独立文件；API 响应不返回 Key。仅运行一个服务实例。原浏览器保留其加密凭据，点击移除会同时删除该浏览器记录和服务端连接。清除浏览器数据不会删除服务端连接。

设置页只显示实际返回的输入、输出、缓存 token、调用/失败次数和最近一次耗时，不填写单价、不估算费用。计数包含连接测试、试跑及风控拒绝的已调用响应；服务商未返回 usage 的请求单独标记，不能把未知用量视为零。用量随本机连接数据持久化。

设置页已移除逐策略试跑按钮，只保留连接测试。诊断接口 `/api/ai/preview` 使用实时 BTC 指标与明确标注的假设 100U、双向 2 倍赔率、10% 仓位上限，返回模型原始决策和风控结果，不创建订单。正式对局仍走“指标快照 → 按策略路由 → JSON 决策 → 本地风控 → 模拟订单”。

1/5 分钟涨跌使用已收盘的连续 1 分钟 K 线收盘价，RSI 使用 Wilder 平滑，EMA 同样只用已收盘数据；返回值标注计算口径与 K 线时间。`confidence` 是规则或模型自行估计的概率，尚未经过历史校准；据此计算的“正期望”只是模拟筛选条件，不是已验证的盈利优势。连接模式另按文首费用口径检查扣费后的模拟份额。后端提示词包含角色策略、连胜加注及条件梭哈规则。暂停会取消尚未完成的决策，即使随后立即恢复也不会补交旧决策。

兼容旧版环境变量配置：没有显式策略分配时，可在启动服务前设置以下参数作为默认引擎；战局的显式模型绑定优先：

```powershell
$env:AI_DECISION_MODE = "deepseek"
$env:DEEPSEEK_API_KEY = "在本机环境中设置"
$env:DEEPSEEK_MODEL = "deepseek-chat"
npm run dev
```

也可使用 `AI_DECISION_MODE=off` 关闭默认决策。`GET /api/config` 的 `aiDecision` 表示默认或混合路由状态；每条决策的 `engine` 记录实际模型，`usage` 记录该次调用用量。均不返回 Key。

- `GET /api/ai/settings`：读取脱敏连接、策略分配和用量。
- `POST /api/ai/connections`、`POST /api/ai/connections/test`：保存或测试 `{provider, baseUrl, model, apiKey}`；未换地址时可省略已存 Key。
- `POST /api/ai/assignments`：提交 `{strategy, connectionId}`，其中 `connectionId` 为测试通过的服务商 ID 或 `none`。
- `POST /api/ai/preview`：提交 `{strategy}`，只试跑决策，不写交易账本。
- `POST /api/ai/connections/remove`：提交 `{provider}`；用量历史保留。

验证：`test/ai-connections.test.js` 覆盖加密持久化、模型分配、异常、计数及正式模拟记账。`scripts/verify-ai-routing.cjs` 在隔离服务和假供应商响应中验证旧 Key 迁移、配置 AI 开关、已连接模型选项、战局绑定、关闭后仅用规则，以及 360/768/1440px 中英文布局。此测试不等同于真实供应商验证。接口参考：[OpenAI Chat](https://developers.openai.com/api/reference/resources/chat)、[DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)、[Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create)。

- `GET /api/market/indicators?symbol=BTCUSDT`：读取 1m/5m 涨跌、RSI 14、EMA 5/20、成交量倍率和现货订单簿失衡。
- `GET /api/simulation/strategies`：读取 A/B/C 策略草案，不代表已创建战局的固定策略。
- `POST /api/simulation/strategies`：同步草案，不修改旧战局；服务端会强制保守策略最多 10% 且禁止梭哈。
- `POST /api/simulation/battles`：提交 `name` 和 `config: { initialBalance: 10, rounds: 10, agents: [...] }` 创建独立战局；本金按每位 Agent 计算。
- `POST /api/simulation/end`：提交 `battleId` 停止新下注，返回 `settling` 或 `ended`，不会删除或退回已有订单。
- `GET /api/simulation`：读取每轮决策摘要、输入哈希、指标、置信度、风险模式和模拟订单。

使用 VS Code 时直接打开项目目录；本机工作区配置不入库。

## Binance Agentic Wallet 流程

1. 服务端通过项目内固定版本的官方 `baw` CLI 读取钱包连接状态。
2. 用户点击“扫码连接”后，服务端调用 `auth signin`，页面显示官方登录 URL 对应的二维码和原始配对码。
3. 服务端立即保持 `auth verify` 运行，最长等待五分钟；页面轮询本机状态，只有 `wallet status` 返回 `CONNECTED` 才显示连接成功。
4. 连接成功后，页面显示 Agent 地址、余额明细、钱包资产估值、预测市场额度、会话到期时间和高风险交易处理方式。
5. 页面读取 BSC 的 `wallet tx-lock`。出现 `LOCKED` 时停止后续动作并提示用户打开 Binance App；锁也可能表示交易仍在等待链上确认，因此不会自动重试或重复提交。
6. 本机 API 可以查询市场、订单、持仓和资产；真实下单只开放 `BUY + MARKET`，每笔都必须先取得报价并由用户明确确认。

扫码连接的是实际 Binance Wallet 环境，不是测试网。调用下单 API 会使用真实资金；当前不开放卖出、限价单、取消、赎回、转账、提现或任意合约调用。旧版 Hyperliquid 本地数据如仍在 `.data` 中会原样保留，但新流程不会读取它。

可通过 `BINANCE_AGENT_CHAIN_ID` 调整交易锁检查网络，默认值为 BSC `56`：

```powershell
$env:BINANCE_AGENT_CHAIN_ID = "56"
$env:MAX_PREDICTION_ORDER_USDT = "10"
npm run dev
```

## 真实下单约束

调用 Binance Prediction 下单接口时必须保持以下流程：

- 先获取报价，再由用户明确确认本笔订单。
- 只使用报价返回的 `quoteId`、滑点和有效期，不自行拼装地址或复用过期报价。
- 下单成功只表示已提交，必须继续查询订单状态后才可记为成交。
- 钱包锁定、二次确认、会话到期、额度不足或状态不明时全部暂停，不自动重试。

## 当前范围

- Binance Agentic Wallet 真实扫码、配对码核对、连接状态和主动断开。
- Agent 地址、余额、预测市场额度、安全设置与会话有效期展示。
- 交易锁与 Binance App 二次确认提示。
- Binance Prediction 市场搜索、市场详情、订单、持仓和组合查询 API。
- `BUY + MARKET` 报价、逐笔人工确认和防重复提交 API。
- Binance Prediction 对局入口、战场、AI 决策弹窗、账本生成的模拟战报和排行榜。
- 中文/英文/日文/韩文切换；手机、平板、桌面响应式布局。
- 对局、收益、战报和排行榜仍是明确标识的模拟数据，不代表真实交易结果。
- 自动 AI 决策只连接模拟账本；未接入 AI 自动真实下单、卖出、限价单、取消、赎回、入金、转账、提现或公网多人竞技后端。

## 文件

| 路径 | 用途 |
| --- | --- |
| `server.js` | 本地 Web 服务、官方 Binance Agentic Wallet CLI 适配与扫码会话 API |
| `AI_AGENT_USAGE.md` | 给其他 AI 的最简安全调用说明 |
| `test/server.test.js` | 扫码会话、连接快照、交易锁、下单确认和防重复提交测试 |
| `public/index.html` | 页面结构、表单、弹窗 |
| `public/style.css` | 布局、控件、响应式基础样式 |
| `public/wallet.css` | Agentic Wallet 二维码、网络和状态样式 |
| `public/anime.css` | 动漫主题和品牌样式 |
| `public/app.js` | 页面切换、开局表单与通用交互 |
| `public/wallet.js` | Agentic Wallet 扫码、轮询、状态和确认提示 |
| `public/leaderboard.js` | 保留的旧榜单脚本，当前主页不加载 |
| `public/leaderboard.css` | 榜单样式 |
| `public/i18n.js`、`public/i18n-east-asian.js` | 四种语言词条、动态翻译和语言偏好 |
| `public/paper.js`、`public/agent-equity.js`、`public/round-recap.js` | 模拟卡片、账本排行榜、净值曲线与逐轮复盘 |
| `simulation-battles.js`、`prediction-sim.js` | 多战局管理、模拟进场与结算 |
| `ai-decision.js`、`public/strategy-catalog.js`、`round-direction.js` | 策略、模型输入、本地风控与结算方向校正 |
| `ai-connections.js`、`public/ai-routing.js` | 加密连接、模型绑定与用量记录 |
| `execution-bridge.js` | 保存意图到逐笔确认执行的独立桥接 |
| `public/offline-simulation.js` | 独立保留的浏览器离线演示 |
| `mobile/`、`scripts/build-mobile.cjs` | 共用模拟引擎的手机适配器与生成包构建 |
| `public/native-service-client.js`、`public/runtime-host.js`、`public/runtime-scheduler.js` | 页面与原生服务通信、引擎宿主页及原生计时器适配 |
| `android/`、`public/android-background.js`、`public/strategy-widget.js` | Android 服务、加密存储、后台设置与桌面小组件 |
| `public/app-core.js` | 页面共享状态与模块事件总线 |
| `public/simulation-api.js` | 模拟接口的统一请求边界 |
| `public/skin-registry.js` | 逐 Agent 皮肤注册、校验、持久化和应用 |
| `public/skin-system.css` | 内置与未来生成皮肤的统一渲染契约 |
| `UI_ARCHITECTURE.md` | UI 模块边界、样式分层与皮肤扩展说明 |

本目录从上一版 `ai-studio/dist` 原型复制建立；旧目录继续作为快照，不在这里联动修改。

## 验证状态与部署

2026-09-13 本次上传前检查：

- `npm run check` 通过，`npm test` **314/314** 通过；测试前重新生成手机运行包。
- `node scripts/verify-mobile-runtime.cjs` 通过：手机模拟运行、网络失败与恢复、AI 配置保存/重载、旧版离线入口，以及四语言、360/768/1440px 布局；使用原生桥和外部响应替身，不请求电脑 API。
- `node scripts/verify-liangxi.cjs` 通过：凉兮卡片、头像、仓位展示、保存/重载与策略切换；中文/英文、360/768/1440px。
- 本次未重新构建 APK、未验证 Android 真机或真实模型连通，也未重启已有服务。浏览器原生桥模拟不等于 Android 后台运行实测；前文带日期的真实行情记录和旧版完整链路验证属于历史证据。

自动化测试使用隔离的 Wallet、指标、订单簿和模型响应，不需要支付资金；覆盖指标计算、DeepSeek 请求契约、响应校验、风控拒绝、节点等待、深度撮合、重复触发、重启恢复、提前结算保护和余额不足。通过测试不代表真实 DeepSeek 连通或真实账户下单已验证。

服务面向本机单用户使用，没有公网多用户身份隔离。二维码会话由官方 CLI 管理；克隆源码不会包含任何已连接的钱包。不要将 `.data`、环境变量、CLI 会话目录或浏览器中的 API 凭据上传到仓库。

AI API 设置通过本机服务保存和测试连接，并用于显式绑定模型的模拟对局。服务端凭据加密保存在被 Git 忽略的 `.data` 中；同目录的加密密钥也必须随本机数据妥善保管。连接测试和外部模型决策可能消耗供应商 API 额度。

## License / 开源许可

项目原创代码使用 [MIT License](./LICENSE)。依赖和第三方品牌保留各自权利，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。本项目并非 Binance 官方产品。

## English quick start

10U Warrior is a local-first strategy simulation with 17 character strategies, including Liang Xi, up to 8 Agents per battle, isolated paper balances, live market references, decision history, equity charts and round recaps. Chinese, English, Japanese and Korean are supported across phone, tablet and desktop layouts. Android 0.1.7 runs one shared simulation engine in a foreground service, fetches live market data and calls configured AI providers directly over HTTPS, and encrypts local records with Android Keystore. It includes a scrollable strategy widget and notification pause controls. Background operation remains subject to Android restrictions; process restarts restore battles paused. It needs no PC or self-hosted server. The legacy offline demo remains available separately.

Use Node.js 22+, run `npm ci`, then `npm start`, and open [the local app](http://127.0.0.1:5174). Run `npm run check` and `npm test` for offline validation. External AI models are optional; live trading is disabled by default and requires a quote → explicit per-order confirmation → single submission workflow. No wallet or API credentials are bundled. See [AI_AGENT_USAGE.md](./AI_AGENT_USAGE.md), [Android build instructions](./ANDROID_BUILD.md), and the [feature changelog](./CHANGELOG.md).
