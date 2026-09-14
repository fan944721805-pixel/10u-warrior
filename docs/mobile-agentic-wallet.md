# 手机连接 Binance Agentic Wallet

Android 在手机上直接建立 Agentic Wallet 会话，不需要电脑、自建 HTTPS 服务或连接码。下方 0.1.14 验证为历史记录；新版入口和验证见文末。

1. 点击右上角钱包入口，再点击「连接币安钱包」。
2. 点击「打开币安授权」，通过币安返回的官方链接进入 Binance App；也可以用 Binance App 扫描页面二维码。
3. 核对配对码，在 Binance App 确认，然后返回 10U 战神。只有币安确认会话已连接、钱包已创建，页面才显示「已连接」。

授权等待在 Android 后台服务中运行，切换到币安 App 后继续确认。可取消连接；过期后重新申请二维码。网络必须能够访问币安官方服务。若系统没有直接唤起 App，官方链接的落地页和二维码仍可使用。

连接后，模拟对局可读取官方预测市场、市场详情和订单簿中的实时价格。没有匹配市场、会话失效或订单簿不可用时，会报告失败；不会把固定模拟赔率当作真实赔率。对局资金仍是模拟资金，Android 不提供真实下单、转账或签名接口。

## 官方依据与实现

- [Agentic Wallet 安装与登录](https://developers.binance.com/en/docs/products/agentic-wallet/quickstart/install-agentic-wallet)：手机点击登录链接跳转 Binance App，网页使用 Binance App 扫码。
- [官方 authentication 参考](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/authentication.md)：保留登录链接与配对码，持续验证至会话建立完成。

本项目没有把 CLI 程序打进 APK。`mobile/wallet.cjs` 是根据官方发布的 `@binance/agentic-wallet` 1.10.0 客户端请求协议编写的 Android 适配器，并非币安官方 Android SDK。协议升级时需要重新核对适配器。

流程为 `login → login/confirm → login/query`，必须同时返回 `CONNECTED` 和 `CREATED`。二维码编码官方返回的完整 URL；配对码按官方客户端规则取 secp256k1 公钥横坐标的前三位和后三位。会话 Cookie 经 Android HTTPS 层传入私有运行环境，保存在 Keystore 加密文件中，不返回给页面或写入账本。设备标识采用本安装独立 UUID。

行情适配器只开放市场搜索、详情和订单簿查询，并复用原来的赔率、手续费、时效与模拟下注检查。

0.1.14 修复了「币安已确认，页面仍等待」：浏览器/WebView 构造 `Response` 时会过滤 `Set-Cookie`，原先的 Node 测试未覆盖这个差异。现在原生网络返回的 Cookie 通过私有 WeakMap 交给钱包运行时，再写入加密存储；不依赖浏览器响应头。旧版已经进入钱包创建阶段但丢失 Cookie 的授权会重新查询确认，以恢复现有会话。

## 验证记录

- 完整自动化测试：646 项通过；新增浏览器响应头过滤和旧版缺失 Cookie 恢复用例。
- 真实 Chrome 运行生产运行时及钱包界面的隔离回归通过：确认后保持等待、钱包创建后自动连接、返回前台刷新、会话持久化与恢复。接口响应使用测试数据。
- 中文、英文钱包界面：360 / 768 / 1440px；全站四语言回归通过。
- 真实 Binance 登录接口返回 HTTP 200 / `000000` 与 `app.binance.com` 登录链接；独立二维码解码器恢复出完全相同的原始链接。
- Android 测试模拟器：二维码展示并独立解码、官方链接打开、后台服务持续轮询、返回与取消通过。这部分使用隔离的接口响应，未伪装为真实授权。
- 测试模拟器当前网络直连币安失败，网络失败提示已验证。真实接口验证使用电脑现有网络，仅用于测试，不是应用运行依赖。
- 2026-09-14 在用户授权的非 root 真机上定位到 Cookie 丢失，并使用真实 Binance 确认响应恢复此前已批准的会话；官方返回 `CONNECTED` + `CREATED`，页面自动显示已连接，加密存储保留会话。临时调试补丁已移除，没有要求用户重新授权。
- 0.1.14 APK 已构建；用户选择自行安装，因此尚未在该真机验证新版覆盖安装后的行为。真机登录后市场查询遇到网络不可用，尚未验证真实赔率读取；未提交真实订单。

复现脚本：`scripts/verify-binance-signin.cjs`（真实登录请求及扫码校验）、`scripts/verify-mobile-wallet-ui.cjs`、`scripts/verify-wallet-session.cjs`（真实浏览器的会话回归）、`scripts/verify-mobile-wallet-native.cjs --fixture`（仅限测试模拟器）。实际网络验证使用 `--signin`，不会自动授权。


## 新版卡片 UI 接入（2026-09-15）

新版 `index.html` 的钱包入口现由 `card-wallet.js` 承接，旧 `card-lab.html` 仅保留跳转。使用同一组原生 `/api/wallet/*` 请求和 `WalletLink` 插件，不再显示未连接的界面占位说明。授权、Cookie、持久化仍在既有原生服务内，页面不创建第二个钱包运行时。

`verify-card-wallet-native.cjs` 用 Chrome 的真实 Response/Cookie 过滤语义运行生产 JS runtime 和新版钱包视图，验证授权确认与钱包创建完成两个门槛、返回刷新、会话重建和旧待确认记录恢复；`verify-card-wallet.cjs` 覆盖 60 个四语言/尺寸/状态组合。它们是隔离协议夹具验证，不是本次版本的真机授权证明。正式 Android 首页切换及发行验证仍见 `strategy-system/12-production-migration.md`。
