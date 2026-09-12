# 给其他 AI 的接入说明

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
