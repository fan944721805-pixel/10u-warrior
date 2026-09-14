# 指标数据与方案合同

版本：SC-2.0-design · 2026-09-14。本文保留该日期的目标设计；当前实施进度及后续 UI 调整以 [正式迁移记录](12-production-migration.md) 为准。返回 [策略文档目录](README.md)。

## 5. 指标数据合同

沿用当前 26 项目录：priceChange、rsi、ema、volume、orderbook、odds、sma、macd、bollinger、atr、adx、stochastic、cci、williams、mfi、obv、vwap、roc、momentum、volatility、donchian、takerFlow、spread、cmf、longReturns、candles。

每个指标值保存来源、采样周期、窗口长度、截止时间、采集时间和有效性。不得把未收盘 K 线混入收盘指标，不能用未来价格或未结算结果做判断。裸 K 延续现有 5m/15m/1h/1d 对局对应 1m/3m/15m/4h K 线的映射，其余指标周期沿用当前算法并在详情显示。

数据分三层：人物必需、方案必需、辅助参考。前两者缺失/非有限值/过期时观望；辅助项缺失则剔除并记录，不填 0。技术方案只能使用声明的数据，勾选参考项不会自动加入投票。

执行时的实时快照采用现有来源时效规则；新接入的源必须提供明确 maxAgeMs，不允许无过期时间。UI 原型使用静态样本，统一标注“演示数据”，不显示假实时心跳。


## 6. 指标方案与方向来源

| 方案 | 必需信号组 | 决策合同 |
| --- | --- | --- |
| short-pressure | 短线涨跌、动量/ROC、成交、主动流、盘口、长周期 | 短线压力给候选，背景冲突按人物强弱门槛处理 |
| multi-regime | EMA/MACD/ADX、RSI/布林、ATR/价差、成交流、背景 | 超级AI按既有趋势/震荡/危险局分支，不任意加策略 |
| conservative-confirm | EMA、ADX、RSI、ATR、波动、价差、盘口、背景 | 低风险且所需长短线一致，小仓位 |
| trend-confirm | EMA、MACD、ADX/DMI、长短涨跌 | 既有趋势多数与背景约束 |
| reversal-confirm | RSI、布林、随机指标、ADX、背景 | 既有反转确认；强单边否决 |
| breakout-confirm | 唐奇安、成交、ATR、短线、主动流、背景 | 既有突破并有成交/压力确认 |
| flow-confirm | 主动流、盘口、价差、短线、背景 | 流与盘口方向及流动性约束 |
| calm-confirm | ATR、波动、EMA、短线、盘口、背景 | 低波动、长短同向 |
| six-vote | 涨跌、EMA、MACD、RSI、盘口、主动流、背景 | 固定六项共识，不以多添同类指标提高票数 |
| raw-candle | 已收盘 OHLC 与赔率 | 吞没、影线、连续实体、突破等现有规则；不偷加技术投票 |
| long-only | 现有 CZ/一姐必需集 | 只给允许资产的 UP/WAIT |
| peer-counter | 本轮目标有效下注、历史；现有人物行情风险集 | 行为来源给方向，行情检查可执行性 |
| oracle-confirm | 冻结占卜、涨跌、RSI、EMA、盘口、ATR、价差、背景、赔率 | 占卜给方向，行情可许可或否决 |
| kzg-structure | EMA、ADX/DMI、背景、已收盘 K、唐奇安、量/主动流/盘口、ATR/价差/赔率 | 技术结构加确认，不由人物名暗示优势 |

原型与默认方案：凉兮使用现有拐点判定及原必需集；其他技术人物对应同名方法；KZG 使用 kzg-structure。首版变体先在默认方法内调整确认方案，不能跨到破坏人设的方向来源。凉兮“动量侧重”可增加 momentum/roc，保留原拐点规则必需项。

扩展指标方案须逐个登记输入、阈值、方向约束和失败码并测试后进入抽取池。未实现的方案不得仅靠文案进入可运行池。原型的当前具体阈值作为 SC-1 参考；SC-2 执行接入时保存独立阈值表，不能运行中直接读会变化的最新版原型。
