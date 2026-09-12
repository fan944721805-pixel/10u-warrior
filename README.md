# 10U 战神

一个让用户为多个 AI 分配独立预算、观看对局和收益排行的移动端优先应用。当前已接入 Binance Agentic Wallet 的真实扫码会话、钱包信息、Binance Prediction 市场查询，以及“报价 → 人工确认 → 单次提交 → 查单”的真实下单 API。

给其他 AI 的最简调用流程见 [AI_AGENT_USAGE.md](./AI_AGENT_USAGE.md)。

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

使用 VS Code 时可打开 `10u-warrior.code-workspace`。

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
- Binance Prediction 对局入口、战场、AI 决策弹窗、示例战报和排行榜。
- 中文/英文切换；手机、平板、桌面响应式布局。
- 对局、收益、战报和排行榜仍是明确标识的模拟数据，不代表真实交易结果。
- 未接入自动 AI 决策、卖出、限价单、取消、赎回、入金、转账、提现或多人竞技后端。

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
| `public/app.js` | 对局演示交互 |
| `public/wallet.js` | Agentic Wallet 扫码、轮询、状态和确认提示 |
| `public/leaderboard.js` | 榜单数据、筛选和渲染 |
| `public/leaderboard.css` | 榜单样式 |
| `public/i18n.js` | 中英文词条、动态翻译和语言偏好 |

本目录从上一版 `ai-studio/dist` 原型复制建立；旧目录继续作为快照，不在这里联动修改。

## 验证状态与部署

自动化测试使用隔离的模拟 Wallet 响应，不需要连接账户或支付资金。通过测试不代表真实账户下单已验证。对局、排行榜和战报仍为模拟展示，真实 Wallet API 与模拟对局数据尚未形成自动交易闭环。

服务面向本机单用户使用，没有公网多用户身份隔离。二维码会话由官方 CLI 管理；克隆源码不会包含任何已连接的钱包。不要将 `.data`、环境变量、CLI 会话目录或浏览器中的 API 凭据上传到仓库。

AI API 设置支持在浏览器本机保存连接并直接测试供应商接口；尚未接入自动对局决策。连接测试可能消耗供应商 API 额度。

## License / 开源许可

项目原创代码使用 [MIT License](./LICENSE)。依赖和第三方品牌保留各自权利，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。本项目并非 Binance 官方产品。

## English quick start

10U Warrior is a local-first AI battle interface with Binance Agentic Wallet pairing, balances, Prediction market reads, and a quote → explicit confirmation → single submission API. Battle results and rankings remain simulated.

Use Node.js 22+, run `npm ci`, then `npm start`, and open `http://127.0.0.1:5174`. Run `npm run check` and `npm test` for offline validation. Wallet operations use the real Binance environment; no wallet credentials are bundled. See [AI_AGENT_USAGE.md](./AI_AGENT_USAGE.md) for the API workflow.
