# UI 与模块边界

当前产品只加载新版卡片界面，保留紫色、荧光黄与卡通人物品牌。四个页面为抽取战神、我的卡册、战场、战神榜；API、钱包、人物详情与设备设置使用弹窗。

## 入口与分发

`public/index.html` 是唯一应用文档。`card-lab.html` 通过 `card-entry.js` 保留查询参数与锚点后跳转；旧 AI、战报链接进入战场，旧阵容链接进入卡册。

`client-assets.cjs` 定义客户端资源清单。Web 服务只响应清单内资源；Android 构建复制到 `artifacts/mobile-web`，Capacitor 从该目录同步。Android 额外保留独立 `runtime-host`、调度器和共用运行包。旧 app/paper/wallet 页面脚本、皮肤切换及随机离线演示不在分发清单内。旧源码与测试夹具仅用于历史回归，不能作为当前 UI 验收证据。

## 模块职责

| 文件 | 当前职责 |
| --- | --- |
| `public/card-lab.js` | 页面组合、开局草稿、模型设置、人物详情、语言与当前选择 |
| `public/card-lab-data.js` | 19 位人物、基础属性、词条及展示定义；服务也使用相同定义 |
| `public/card-lab-draws.js` | 收藏数据格式和兼容迁移；服务拥有抽取权威状态 |
| `public/card-runtime.js` | Web 同源请求与 Android 原生请求适配，错误与超时 |
| `public/card-collection.js` | 服务收藏、额度、重复卡处理、未确认请求恢复、旧本地卡备份导入 |
| `public/card-battles.js` | 对局列表、创建、暂停、继续、结束、并发请求和选择恢复 |
| `public/card-results.js` | 从正式账本汇总最近一局、最近三局、全部记录 |
| `public/card-wallet.js` | 授权与查询 UI、会话状态、未知响应重查、可见时轮询 |
| `public/card-device.js` | 原生权限、小组件添加确认、语言/人物投影同步和详情跳转 |
| `public/strategy-widget.js` | 前后台共用账本投影；新版不运行旧 DOM 适配器 |
| `public/price-stream.js` | 当前币种行情订阅；断开时不保留为实时价格 |
| `public/i18n.js` | 新版中、英、日、韩文案；独立状态决定业务行为 |
| `public/simulation-api.js`、`native-service-client.js` | 既有服务合同、原生通信和网络状态 |

Web 由 `server.js` 持有服务。Android 由 `SimulationService` 的独立 WebView 加载 `runtime-host`，后者启动编译自 `mobile/runtime.cjs` 的共用引擎。页面不创建第二份账本或第二个决策循环。

收藏使用 COL-1 原子文档。开局冻结卡片、模型连接版本、CT-1 词条和 SC-2 资金规则；页面刷新或卡片属性重抽不能重写已创建对局。模拟账本、订单和额度来自服务，浏览器只保存偏好、草稿与幂等恢复记录。密钥和钱包会话不进入页面存储。

## 样式与文案

`card-lab.css` 提供基础布局，`card-lab-brand.css` 提供品牌、卡片、弹窗和响应式调整。保留主要按钮至少 48px 的触控区域；局数、币种与周期并排显示。卡片概览突出账面资金、可用/冻结资金及下注，决策和资金图放在详情。

新增文案同步四种语言。数字、状态与请求结果不能通过已翻译文字判断。模拟资金明确标识；加载失败、无数据和等待授权分别呈现，不用示例内容填充。人物图鉴中的“原型”指人物基础介绍，不代表产品是原型。

资金图实现与 `public/agent-equity.js` 共用；修改相关图表后执行 `node scripts/sync-card-chart.cjs`，避免两份实现偏离。

## 验证

```sh
npm run check
npm test
npm run verify:ui
npm run mobile:verify
```

`check` 检查服务、构建脚本及实际分发资源。`test` 重建运行包并检查业务合同。`verify:ui` 覆盖当前四页及弹窗、服务持久化、错误路径与四语言布局。`mobile:verify` 使用生产共用运行包和隔离原生桥验证钱包及设备入口；它不是真机证明。

迁移证据与发布状态见 [迁移记录](./docs/strategy-system/12-production-migration.md)。旧结构仅保留在 [历史文档](./docs/archive/UI_ARCHITECTURE.md)。
