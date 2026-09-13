# 10U 战神

**给策略 10U 虚拟本金，看谁能成为战神。**

一个手机与电脑都能用的策略模拟应用：选角色、开一局，看决策、收益曲线和战报。无需充值、钱包或 AI Key，即可使用本地规则开始体验。

[**下载 Web / Android 试用版**](https://github.com/fan944721805-pixel/10u-warrior/releases/tag/v0.1.9-preview.1) · [最简试用说明](./TRY_ME.md) · [更新记录](./CHANGELOG.md)

- **17 种角色策略**：10U战神、超级AI、凉兮、守财奴……每局最多 8 位 Agent，各有独立模拟本金。
- **看得见的决策与战绩**：多战局、逐轮结算、收益曲线、排行榜和决策记录。
- **随时打开看看**：支持手机、平板、桌面及中英日韩四语言；Android 提供后台模拟和桌面小组件。

## 界面预览

<table>
  <tr>
    <th width="72%">桌面版 · 战场总览</th>
    <th width="28%">手机版 · 策略卡片</th>
  </tr>
  <tr>
    <td valign="top"><img src="./docs/images/desktop.png" alt="10U 战神桌面战场：独立战局、模拟本金、轮次和三位策略角色" width="1040"></td>
    <td valign="top"><img src="./docs/images/mobile.png" alt="10U 战神手机布局：策略卡片、模拟收益和底部导航" width="390"></td>
  </tr>
</table>

<sub>实际页面截图，使用隔离的离线演示数据。桌面 1440px、手机 390px；手机版为浏览器响应式预览，不是真机截图。</sub>

## 开始试用

- **安卓**：下载 APK → 安装 →「开一局」→ 选择策略 →「确认开局」。
- **电脑**：下载 Web ZIP → 解压 → 安装 [Node.js 22+](https://nodejs.org) → Windows 双击 `start-web.cmd`，保留命令窗口。

所有资金和收益均为模拟数据。当前下载版本为 **0.1.9 试用版**，APK 使用测试签名；Web 试用启动器关闭真实报价和交易。

## 使用与开发目录

<details>
<summary><strong>01 · 功能与模拟规则</strong></summary>

| 功能 | 支持内容 |
| --- | --- |
| 战局 | 选择角色、本金与轮次，独立账本，暂停、继续、结束和归档 |
| 策略 | 17 种角色、26 项指标/数据选项，可选外部 AI 模型 |
| 市场 | BTC / ETH / BNB，5 分钟 / 15 分钟 / 1 小时 / 1 天 |
| 复盘 | 逐轮决策、模拟订单、收益曲线、排行榜与战报 |
| Android | 本机运行、加密保存、后台服务、桌面策略小组件 |

未连接钱包时，可用公开现货行情做虚拟对局；`?offline=1` 提供独立的本地演示。缺失真实行情时等待恢复，不用随机结果替代。外部 AI 是可选项，需自行配置，可能产生供应商费用。

完整结算口径、模型配置和高级接口见 [技术参考](./docs/REFERENCE.md)；各版本变化见 [CHANGELOG](./CHANGELOG.md)。

</details>

<details>
<summary><strong>02 · Web 本地运行</strong></summary>

需要 Node.js 22 或以上。Windows 可直接双击 `start-web.cmd`；macOS / Linux 或源码运行：

```sh
npm ci --omit=dev
node start-web.cjs
```

打开 [本机应用](http://127.0.0.1:5174)，或使用 [离线演示](http://127.0.0.1:5174/?offline=1)。首次安装依赖需要联网；按 `Ctrl+C` 停止服务。

个人数据存于本机 `.data/`，升级前保留旧目录与数据。服务面向本机单用户，不适合直接作为公网多人服务。

</details>

<details>
<summary><strong>03 · Android 安装、后台与小组件</strong></summary>

需要 Android 7.0 或以上，以及可访问行情服务的网络。手机直接获取行情，可选直接调用已配置的 AI，无需电脑服务器；不连接钱包或提交真实交易。

- 后台模拟：按应用提示允许后台运行，通知栏可暂停新下注。
- 桌面小组件：在「对局设置 → 桌面小组件」中添加，或从系统小组件列表添加。
- 覆盖升级：同签名旧测试版可直接安装；不要先卸载，以免丢失数据。
- 系统可能限制后台活动；进程重启后对局恢复为暂停，需手动继续。

构建、签名和运行边界见 [Android 打包说明](./ANDROID_BUILD.md)。

</details>

<details>
<summary><strong>04 · 开发、验证与技术文档</strong></summary>

项目使用原生 HTML / CSS / JavaScript、Node.js 和 Capacitor。

```sh
npm ci
npm run check
npm test
```

| 文档 | 内容 |
| --- | --- |
| [技术参考与历史验证](./docs/REFERENCE.md) | 模拟结算、AI 配置、账本、执行桥接、文件职责与历史证据 |
| [UI 架构](./UI_ARCHITECTURE.md) | 页面模块、样式分层、角色与皮肤扩展 |
| [Agent 接口说明](./AI_AGENT_USAGE.md) | 本机 API 调用与约束 |
| [Android 构建](./ANDROID_BUILD.md) | 打包、签名、后台服务和小组件 |
| [功能更新](./CHANGELOG.md) | 各版本功能与验证记录 |

界面截图可通过 `node scripts/capture-readme.cjs` 重新生成，需要 Chrome 和 Playwright；可用 `PLAYWRIGHT_PATH` 指向已有模块。脚本使用全新离线演示账本，不读取个人账户。

自动化测试与模拟对局不代表真实交易、真实外部 AI 或 Android 真机验证。不要提交 `.data/`、API Key、钱包会话或签名私钥。

</details>

<details>
<summary><strong>05 · English quick start</strong></summary>

**Give each strategy 10 virtual USDT and watch the battle.**

10U Warrior is a local-first simulation with 17 character strategies, up to 8 Agents per battle, independent paper balances, decision history and performance reports. Chinese, English, Japanese and Korean are supported.

- **Android:** download the trial APK, install it, create a battle and confirm.
- **Web:** install Node.js 22+, extract the ZIP and run `start-web.cmd` on Windows. On macOS/Linux, run `npm ci --omit=dev`, then `node start-web.cjs`.
- No wallet, deposit or AI key is required to start. External AI is optional. Funds are simulated; the trial launcher disables live quotes and trading.

Screenshots show the responsive browser UI with offline demo data. The Android APK uses a test certificate for sideload trials. See the [trial guide](./TRY_ME.md) for details.

</details>

---

[MIT License](./LICENSE) · [第三方声明](./THIRD_PARTY_NOTICES.md) · 本项目并非 Binance 官方产品。
