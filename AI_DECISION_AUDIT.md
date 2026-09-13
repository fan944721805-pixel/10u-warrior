# AI 决策链审计与验证

日期：2026-09-12。范围：策略、指标、DeepSeek 请求适配、本地风控、模拟订单及界面；不调用真实 DeepSeek API，不执行真实交易。

## 已实现与证据

| 要求 | 当前实现与验证 |
| --- | --- |
| 指标经 API 进入决策 | `market-indicators.js` 读取 Binance Spot 公开 K 线和深度；服务暴露 `/api/market/indicators`，每轮将快照放进模型输入。最新模块真实公开读取成功，返回已收盘窗口、Wilder RSI 和请求时间口径。 |
| 可调策略影响决策 | 浏览器策略同步至服务端；激进、智能、保守规则及连胜连败、余额、指标选择进入模型输入。后端提示词补齐具体行为；模型可决定方向、金额或跳过，本地强制余额、上限及条件梭哈约束。 |
| DeepSeek 可替换 mock | `createDeepSeekDecisionProvider` 使用两个 messages、JSON 响应和按本轮剩余时间限制的超时；只有环境变量显式开启才请求外部模型。请求形状与响应解析通过注入假 fetch 验证；不宣称真实供应商连通已验证。 |
| 决策实际形成模拟订单 | `test/ai-simulation.test.js` 验证指标→输入→决策→金额撮合→审计订单；SKIP 和越限响应不扣款。 |
| 异常响应拒绝 | 严格校验数字类型、轮次、两个数据时间、金额、比例、风险模式、梭哈条件；Markdown 包裹及仅含工具调用的响应拒绝。 |
| 暂停与防重复 | 持久化轮次后才开始 I/O；同一进程 busy 门禁、重启不补单。暂停控制版本使暂停后立即恢复也不能提交旧请求。 |
| 真实交易隔离 | 模型没有 tools、钱包或真实下单权限；真实下单接口默认关闭、仍要求人工确认。运行中 `/api/config` 核实 tradingEnabled=false、aiDecision.mode=mock。 |
| 界面与语言 | 前轮已验证中文、英文、390px 窄屏及实际决策详情；本轮只修改服务端、测试和文档。模型理由通过 textContent 渲染。 |

## 网页版 ChatGPT 复核

按用户授权发送脱敏代码语义与离线用例，收到 [独立静态复核](https://chatgpt.com/c/6aa4d0a7-1a54-83ee-ad4a-b2bb6011e42d)。它没有运行本地程序；其回复按建议处理，再以本地源代码与测试验证。

修正：完整策略提示、已收盘的精确 1/5 分钟窗口、连续分钟校验、Wilder RSI、JSON 数字类型、逐数据源未来时间检查、全仓金额语义、金额比例一致性、暂停后旧请求失效、按总截止时间缩短模型请求。

三份原始 JSON 响应保存在 `test/fixtures/chatgpt-review-responses.json`，通过 DeepSeek 适配器的假传输回放至本地校验器：A 的 20U BET 通过；B 的 SKIP 返回 0；C 的保守 100U ALL_IN 被 AI_STAKE_OVER_CAP 拒绝。

最终检查：`npm run check` 通过；`npm test` 41/41；`git diff --check` 无空白错误。

## 验证边界与交接

- confidence 是未校准的概率估计；正期望仅是据此计算的模拟筛选条件，未证明盈利且未计手续费。审计记录标注 uncalibrated-model-probability-before-fees。
- REST 现货深度不含交易所时间；请求起始时间是保守本地年龄边界，不等同于交易所新鲜度证明。K 线另外要求当前最近收盘分钟和连续性。
- 策略决定“可以如何变化”，不强制每次连胜必加注；模型判断仍允许 SKIP。默认 mock 是确定性规则，不是真实 DeepSeek。
- 单进程文件账本不支持多个服务同时写同一目录；不要启动第二个实例共用账本。故障时关闭模拟，不保证跨进程事务。
- 用户明确要求强制重启后，已精确确认并停止旧进程 PID 23924，启动本目录的最新服务 PID 39420。5174 首页返回 200；指标 API 返回 completed-1m-close-to-close、Wilder、request-start-and-latest-completed-candle，证明最新模块已加载。模拟接口恢复 14 轮账本、3 个 Agent；配置确认 mock 模式、tradingEnabled=false。先前的重启阻塞已解除，未调用真实 DeepSeek 或真实下单。
