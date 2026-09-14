# 每轮执行、数据结构与迁移

版本：SC-2.0-design · 2026-09-14。本文保留该日期的目标设计；当前实施进度及后续 UI 调整以 [正式迁移记录](12-production-migration.md) 为准。返回 [策略文档目录](README.md)。

## 10. 一轮的完整执行顺序

1. 应用下一轮 pending 全局版本，处理已结算事件，推进状态。
2. 冻结 roundId、资产、配置、资金、卡片版本和行情。
3. 校验数据有效性与资金可参与性；占卜人物生成或读取本轮固定结果。
4. 第一阶段执行独立人物、CZ、一姐和占卜人物。
5. 第二阶段装逼的人读取绑定 CZ 已形成的有效下注。
6. 第三阶段逆行者读取该轮允许参考的结果快照。
7. 计算事实与人物硬边界 → 按人物来源确定候选范围 → AI 结合方法、词条、指标、历史和有效情绪做决定 → 程序校验来源与资金 → 执行或拒绝。不能先在本地选好最终单，再把 AI 降成文案生成器。
8. 按唯一幂等键写入下注和资金预留；失败不能只扣款不留记录。
9. 保存决策解释、状态和执行结果。结算走既有来源，不混入卡片生成器。

禁止以翻译文案、头像名、预览标签判断状态。运行许可只允许 BET_UP/BET_DOWN/SKIP 中的合法子集，并给出精确允许金额。没有合法下注选项即观望。

缓存键包含卡片哈希、规则版本、控制版本、账户版本、行情快照和依赖快照。独立人物可提前准备市场分析，最终金额与状态在本轮冻结后确认。阶段依赖未完成时不得复用旧轮结果。


## 12. 数据结构与版本

以下字段是实现合同，不是当前运行 API 已上线声明：

| 对象 | 必需字段 |
| --- | --- |
| PersonaDefinition | personaId、version、directionSource、allowedAssets、legalStakeChoices、attributeRanges、compatibleStyles、indicatorPlans、requiredInputs |
| VariantDefinition | styleId、version、attributeOffsets、traits、compatiblePlans、labelKey |
| StrategyCard | cardId、personaId、personaVersion、styleId、traitIds、indicatorPlanId、baseAttributes、seed、generationVersion、policyHash、createdAt、origin、customName |
| BattleInstance | instanceId、cardSnapshot、modelBinding、peerBinding、accountId、state |
| BattleControls | current、pending、controlsRevision、effectiveRoundId |
| DecisionTrace | roundId、instanceId、versions、snapshotIds、directionSource、evidence、adjustments、permissions、modelInputRef、modelOutputRef、validation、executionRef |

卡片效果只允许结构化受限参数，不存可执行 JS 或任意系统提示词。policyHash 不包含用户昵称与头像路径；包含所有会影响执行的字段，使用稳定序列化。

未知人物、未知规则版本、字段非法时不能静默回退超级AI。导入仅数据校验，不运行内容。保存采用现有原子持久化机制；恢复对局先暂停，不补执行错过的轮次。


## 16. 旧版兼容与迁移

保留当前人物 strategy key。将现有预设保存为原版卡，已有自定义设置保存为经典自定义卡，不随机改参数。无法精确映射的字段保留兼容来源，不伪装成新版完全等价。

SC-1 运行中对局保持原规则，SC-2 对局持有完整新规则副本；修改收藏不改变已有对局。新卡无法用旧引擎执行时明确拒绝，不丢字段后假装兼容。

占卜中立改为观望、资金严格上限、变化度不抬高证据等均作为 SC-2 显式差异，不能静默带入 SC-1。旧记录仍可读取和查看，规则缺失则暂停并显示原因。
