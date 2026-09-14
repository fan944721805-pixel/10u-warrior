# 旧版 UI 与模块边界（历史记录）

本文记录卡片界面迁移前的实现，不再用于当前页面开发。当前模块与分发边界见根目录 `UI_ARCHITECTURE.md`。

这份文档只说明当前实现的职责边界。目标是让页面继续保持动漫紫色与荧光黄风格，同时避免任何一个脚本同时管理页面、数据、计时器和皮肤。

## 依赖方向

```text
index.html
  -> app-core.js
  -> skin-registry.js + simulation-api.js
  -> app.js + agent-setup.js + wallet.js + ai-api.js
  -> i18n.js
  -> paper.js
  -> mobile-layout.js

paper.js -> simulation-api.js -> /api/simulation/*
agent-setup.js -> skin-registry.js
agent-setup.js -> simulation-api.js（只同步策略，不上传皮肤）
```

上层可以调用下层；下层不反向读取页面业务。跨模块状态通过 `window.Warrior` 的事件和状态对象传递。

## 前端模块

| 文件 | 唯一职责 | 不负责 |
| --- | --- | --- |
| `public/app-core.js` | 轻量事件总线与共享页面状态 | 请求接口、渲染业务 UI |
| `public/simulation-api.js` | `/api/simulation/*` 请求、超时和错误统一处理 | 渲染、计时 |
| `public/skin-registry.js` | 皮肤注册、校验、持久化和应用 | 生成图片、调用 AI |
| `public/app.js` | 页面切换、基础弹窗和通用控件 | 服务端模拟轮询 |
| `public/agent-setup.js` | Agent 增删改、策略设置、逐 Agent 皮肤选择 | 模拟账本、皮肤图片生成 |
| `public/paper.js` | 当前战局、排行榜、订单战报的组合渲染 | 直接拼装网络请求、创建 Agent |
| `public/mobile-layout.js` | 手机行情折叠区、人数位置；跨断点移动和还原已有节点 | 复制业务状态、额外轮询 |
| `public/orb-arena.js` | 旧人物竞技场，当前页面不加载 | 当前战绩卡片 |
| `public/character-mode.js` | 旧全体皮肤切换，当前页面不加载 | 当前逐 Agent 图标设置 |
| `public/i18n.js` | 中英文词条和增量 DOM 翻译 | 根据翻译文本判断业务状态 |
| `public/wallet.js` | 钱包连接与状态 UI | 对局模拟 |
| `public/ai-api.js` | 浏览器本机 AI 连接实验室 | 自动对局决策 |
| `public/leaderboard.js` | 旧演示榜单逻辑；当前主页面不加载 | 当前真实模拟排行榜 |

## 样式分层

| 层 | 文件 | 说明 |
| --- | --- | --- |
| 基础 | `style.css` | 布局、字体、通用控件 |
| 主题 | `anime.css` | 紫色动漫主题与品牌表现 |
| 功能 | `orb-arena.css`、`wallet.css`、`agent-ui.css`、`ai-api.css` 等 | 各自功能区域 |
| 角色 | `ai-avatars.css`、`orb-skins.css`、`character-mode.css` | 内置角色资源与状态帧 |
| 当前模拟 | `paper.css` | 规则 AI 模拟视图 |
| 皮肤契约 | `skin-system.css` | 内置/生成皮肤统一显示 |
| 最终响应式修正 | `ui-v2.css` | 平板底栏、移动端紧凑布局、战报卡片 |
| 手机排版 | `mobile.css` | 760px 以下的控制栏、战绩卡片、浮动底栏与底部弹窗；最后加载 |

新增样式应优先进入对应功能文件；手机专用排版集中维护在 `mobile.css`，跨模块的桌面和平板修正进入 `ui-v2.css`。

手机端将行情说明、时间和每局规则收进原生 `details`，决策引擎状态与错误提示保持直接可见。切到宽屏后原节点回到原位，事件和实时数据引用保持不变。已检查 320/375/393/430px 手机、768px 平板和 1123px 桌面的布局及中英文切换。

## Agent 皮肤契约

内置皮肤 ID：`anime-female`、`warrior-male`。每个 Agent 在 `warrior-agent-config-v1` 中独立保存 `skinId`。皮肤数据不会发给模拟策略接口。

未来 AI 图片生成完成后，只需要把结果注册到现有入口：

```js
window.Warrior.skins.registerGenerated({
  id: 'generated-example-skin',
  name: '用户命名皮肤',
  imageUrl: 'data:image/webp;base64,...',
  frame: { x: 50, y: 50, size: 120 },
});
```

允许的图片地址为 `data:image/png|jpeg|webp|avif`、`blob:`、`http:` 或 `https:`。注册表只负责接收、校验、保存和显示，不负责提示词、额度、内容审核或生成任务。

## 运行和验证

```powershell
npm run check
npm test
```

竞技场当前直接容纳 AI 战绩卡片，不再展示人物和特效；每位 Agent 的卡片图标与设置中的独立皮肤保留。

浏览器至少检查：桌面、768px 平板、393px 手机；中文和英文；Agent 单独换肤；战局切换、暂停、排行榜、战报、详情弹窗。自动化和浏览器检查只证明本地 UI 与模拟流程，不代表真实交易或真实 AI 图片生成。
