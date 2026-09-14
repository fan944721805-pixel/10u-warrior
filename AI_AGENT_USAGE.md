# 给其他 AI 的接入说明

> 新版入口与配置：通过右上角 API 保存并验证模型连接，再在“开一局”中为各人物选择。收藏、词条与资金使用 COL-1 / CT-1 / SC-2，详见 [当前 UI 架构](./UI_ARCHITECTURE.md) 和 [迁移记录](./docs/strategy-system/12-production-migration.md)。下文保留旧接口及旧策略合同参考；旧“再开一局 → 配置 AI”、草案同步和固定 5U/10% 等规则不能用于解释新卡片实例，具体以冻结的 policy 版本为准。

## 当前：多策略 AI 模拟下注

默认使用本地规则。AI 设置中的连接由本机服务加密保存，并在通过 JSON 决策测试后允许在“再开一局 → 配置 AI”中选择。默认显式使用本地规则；独立弹窗保存后的连接 ID 和版本随每个参战策略保存到本局配置，优先于历史全局分配。分配后的正式路径为“读取 Binance Spot 指标和 Prediction 赔率 → 组合账户与策略 → 调用该策略分配的模型 → 本地风控 → 模拟成交”。`none` 表示不调用外部 AI、继续本地规则；失效的外部连接明确跳过，不自动降级。未显式分配的策略兼容 `AI_DECISION_MODE` 和 `DEEPSEEK_API_KEY` 默认配置。模型没有钱包、下单或任意工具权限。

`GET /api/ai/settings` 返回脱敏连接、全局策略分配和实际 token 计数；不估算费用。`POST /api/ai/preview` 仅用实时 BTC 指标与标明的模拟赔率/余额试跑，不创建订单。密钥与统计保存在 `.data/ai-connections.json`，加密密钥为旁边的 `.key` 文件。不得输出这些秘密或并发启动多个实例写入该文件。完整操作与 HTTP 接口见 README 的“AI 决策模式”。

“蜡烛哥”是纯 K 线角色：AI 输入仅含最近 20 根已收盘 OHLC 和 Prediction 赔率，不含 RSI、MACD、均线、成交量、订单簿或新闻。它识别吞没、长影线、连阳连阴及前高前低突破，形态弱或互相冲突时跳过。5 分钟、15 分钟、1 小时、1 天玩法分别使用 1m、3m、15m、4h K 线。

玩法支持 BTC / ETH / BNB 的 5 分钟、15 分钟、1 小时和 1 天涨跌。指标中的 1/5 分钟涨跌、EMA、Wilder RSI 均基于已收盘的连续分钟 K 线；现货最新价格与深度仍是本次读取值。模型 `confidence` 是未校准的概率估计，不能把据此算出的正期望视为盈利证明。金额、比例和置信度必须为 JSON 数字，轮次必须为字符串；不会把字符串、布尔值或数组隐式转换成金额。每个数据源分别检查时效。暂停后即使立刻恢复，原先等待中的响应也不能形成订单。

```http
GET /api/market/indicators?symbol=BTCUSDT
GET /api/simulation/strategies
GET /api/simulation
```

浏览器通过 `POST /api/simulation/strategies` 同步策略草案；创建战局时保存所选 Agent 的完整配置，最多 8 位，之后修改草案不影响旧局。服务端重新规范化全部配置：保守策略最多 10%，禁止梭哈；任何策略都不能超过可用模拟余额。模型响应必须原样返回 `round_id`，且通过数据新鲜度、置信度、正期望、金额上限、条件梭哈和实际滑点复核，否则本轮 `SKIP`。模型调用失败不会自动重复提交订单；进场与连接恢复由当前战局配置控制，每位 Agent 每轮最多产生一笔模拟订单。

### 多战局

在“开一局”选择角色、每位虚拟本金、币种、周期与轮数，确认后创建。每局最多 8 位 Agent，独立保存策略、模型绑定、余额与订单。切换战局或新建下一局会暂停上一局；页面心跳失联后暂停新下注，已存在订单继续等待原来源结算。

- `GET /api/simulation/battles` 返回 `battles` 和 `leaderboard`。
- `POST /api/simulation/battles`：提交 `name` 和 `config: { initialBalance: 10, rounds: 10, agents: [...] }`；币种和周期应沿用前端创建表单的配置。响应不确定时先查询列表，避免重复创建。
- `GET /api/simulation?battleId=default` 查看指定战局，`view=full` 读取完整战报；省略 `battleId` 读取默认局。
- `POST /api/simulation/control`，JSON `{"battleId":"default","enabled":false}` 暂停该局的新单，已有订单继续结算。
- `POST /api/simulation/end`：提交 `battleId` 后禁止新下注，先等待存量订单结算，再冻结结束战报。

排行榜收益扣除本局每位初始本金及追加虚拟本金，追加资金不算盈利；未结算单和平局不计胜率。默认旧入口兼容 A/B/C 各 100U，不能用它描述新建战局。

原局使用 `.data/rule-ai-ledger.json`，新局使用 `.data/battle-<id>.json`，索引为 `.data/simulation-battles.json`；需一起备份。缺失已登记账本时服务拒绝启动，不自动重建余额。只能运行一个服务实例。旧手动 `/api/paper/orders` 返回 410，旧账本仅保留历史。

未连接钱包时使用公开现货 K 线练习：固定 2 倍、平局退本金、无模拟手续费。连接后使用预测市场双向盘口逐档计算虚拟份额，并按受支持供应商的费率估算基础手续费；未知费用、过期数据或深度不足时跳过。已有订单不会因连接状态变化而更换结算来源。

真实预测市场的模拟单只按明确的官方结果结算：胜者每份 1U、负者 0U，官方平价 50–50 每份 0.5U。无法确认结果时继续等待。练习模式及 Android 离线演示使用各自明确标识的规则。模型未校准的 confidence 和模拟收益不能作为盈利证明。

完整的意图 → 报价 → 人工确认 → 单次提交及执行记录接口见 [README](./README.md#查看决策结算与真实执行关联)。默认桥接报价和真实提交关闭，模型没有钱包工具。这里只说明调用契约，不授权执行真实订单。

## 真实交易流程（当前默认禁用）

仅当用户以后明确要求启用真实资金时，才在启动服务前设置 `ENABLE_LIVE_TRADING=true`；网页没有切换开关。`GET /api/config` 的 `tradingEnabled` 是最终依据。

> 这是实际 Binance Agentic Wallet 环境，可能使用真实资金。AI 只能准备订单；看到用户明确确认本次的市场、方向、金额和报价后，才能提交。
>
> 下单超时、接口报错、`transactionLock` 不是 `UNLOCKED` 时，不要重试。先查询订单，并让用户检查 Binance App。

服务地址：`http://127.0.0.1:5174`

当前只允许：Binance Prediction、`BUY`、`MARKET`、单笔最多 `10 USDT`。额度上限以 `GET /api/config` 返回值为准。

## 最短流程

### 1. 检查钱包

```http
GET /api/wallet
```

- `wallet.status = connected`：继续。
- 未连接：让用户打开网页，点击钱包图标，用 Binance App 扫码。
- `txLock.status != UNLOCKED`：停止，让用户检查 Binance App。

### 2. 查余额

```http
GET /api/balances?symbol=USDT&chainId=56
```

### 3. 找市场

```http
GET /api/prediction/markets/search?q=Bitcoin&limit=10
```

从结果中使用真实的 `marketTopicId` 和目标选项的 `tokenId`。不要猜 ID。

查看单个市场：

```http
GET /api/prediction/market?marketTopicId=从搜索结果取得的ID
```

### 4. 获取报价

```http
POST /api/prediction/quotes
Content-Type: application/json

{
  "chainId": "56",
  "marketTopicId": "从市场结果取得的ID",
  "tokenId": "从市场选项取得的ID",
  "side": "BUY",
  "amount": "2",
  "orderType": "MARKET",
  "slippageBps": 1000
}
```

接口返回 `confirmationId`、报价内容和过期时间。把市场、选项、金额、预计结果、滑点和过期时间展示给用户，然后问：

> 是否确认用 2 USDT 买入这个选项？

只有用户明确回答“确认”后才进入下一步。

### 5. 提交一次

```http
POST /api/prediction/orders
Content-Type: application/json

{
  "confirmationId": "上一步返回的confirmationId",
  "confirmed": true
}
```

- `status = SUBMITTED` 只表示已提交，不表示成交。
- 同一个 `confirmationId` 只能使用一次。
- `requiresAppReview = true`：让用户打开 Binance App 检查二次确认或待处理交易。
- 请求超时或报错：不要再次提交。

### 6. 查结果

```http
GET /api/prediction/orders?limit=20
GET /api/prediction/positions?tab=ONGOING&limit=20
GET /api/prediction/portfolio
GET /api/wallet
```

以订单历史的最终状态为准，再更新对局结果。

## AI 必须遵守

1. 用户选择市场、方向和金额，AI 不替用户做最终决定。
2. 每笔订单都先报价、再展示、再确认、再提交。
3. 不复用过期报价，不重复使用 `confirmationId`。
4. 不自动重试下单，不绕过 `confirmed: true`。
5. 不输出或索要私钥、助记词、API Key、会话令牌。
6. 当前不要发 `SELL`、`LIMIT`、取消订单、赎回、转账或提现请求。

## 常见错误

| code | 怎么处理 |
| --- | --- |
| `WALLET_NOT_CONNECTED` | 让用户重新扫码连接 |
| `WALLET_TRANSACTION_LOCKED` | 停止，检查 Binance App 或等待链上处理 |
| `PREDICTION_DISABLED` | 用户在 Binance Agentic Wallet 设置中开启 Prediction |
| `PREDICTION_QUOTA_INSUFFICIENT` | 降低金额并重新报价 |
| `ORDER_LIMIT_EXCEEDED` | 金额降到服务端单笔上限以内 |
| `HUMAN_CONFIRMATION_REQUIRED` | 展示报价，等待用户明确确认 |
| `QUOTE_EXPIRED` | 重新报价并再次让用户确认 |
| `CONFIRMATION_ALREADY_USED` | 不要重试；查询订单历史 |

完整能力清单：`GET /api/capabilities`。服务只监听本机，不应暴露到公网。

在“再开一局”点击“配置 AI”进入独立弹窗。每个策略只能选择一个已测试连接或本地规则，默认本地规则。保存后应用到本局；取消或 Esc 丢弃本次修改。主界面只显示入口和配置数量，预算按策略数计算。
