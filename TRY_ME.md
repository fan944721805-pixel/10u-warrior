# 10U 战神 · 开始使用

当前源码使用新版卡片界面。安装包见 [GitHub Releases](https://github.com/fan944721805-pixel/10u-warrior/releases)，本次版本的发布与验证状态见 [迁移记录](./docs/strategy-system/12-production-migration.md)。历史安装包可能仍使用旧界面。

## 安卓 APP

1. 按 Release 说明下载对应 APK，或按 [Android 构建说明](./ANDROID_BUILD.md) 构建当前源码。
2. 首次打开先在「抽取战神」获得人物卡，再到「战场」→「开一局」勾选人物并设置本金、币种与周期。默认使用本地规则，无需钱包或 AI Key。
3. 页脚「设备设置」提供后台权限、通知与桌面小组件入口。

需要 Android 7.0 或以上及可访问行情服务的网络。APK 为 Release 构建、现有测试证书签名，仅用于侧载试用。同签名旧测试版可直接覆盖安装；签名冲突时请先保留旧版与数据，不要直接卸载。系统或厂商省电策略仍可能停止后台；重启应用后对局恢复为暂停，手动继续即可。

## 电脑 Web

1. 下载对应版本 Web ZIP 或仓库源码并解压。先安装 [Node.js 22 或以上](https://nodejs.org)。
2. Windows 双击 `start-web.cmd`，首次联网安装依赖后自动打开网页，使用期间保留命令窗口。
3. 先抽取人物卡，再点击「开一局」选择最多 8 位已有角色。10 U / 100 U 是本金快捷值，也可自行输入。关闭命令窗口即可停止服务。

macOS / Linux：在解压目录执行 `npm ci --omit=dev`，再执行 `node start-web.cjs`。网页地址是 <http://127.0.0.1:5174>。缺少行情时等待恢复，不生成随机价格或输赢；旧 `?offline=1` 演示入口已退役。

所有对局资金和收益都是模拟数据，无需充值。钱包入口提供可选授权与资产查询，当前页面不提供真实下单。外部 AI 需在 API 设置中保存并验证后选用，可能产生供应商费用。抽取和刷新属性共用次数，耗尽后等待冷却。Web 数据保存在 `.data/`，Android 使用应用私有加密目录；升级前保留数据，不要同时运行多个服务写同一目录。

## Quick trial (English)

- **Android:** install the matching APK and draw your first character card before creating a battle. No wallet or AI key is required for local rules. Background permissions and widgets are in Device settings in the footer. See the release notes for build and signing details.
- **Web:** install Node.js 22+, extract the ZIP and run `start-web.cmd` on Windows. On macOS/Linux run `npm ci --omit=dev`, then `node start-web.cjs`. Keep the terminal open. Open <http://127.0.0.1:5174> if the browser does not open automatically.
- Draw up to eight characters for a battle and choose your starting capital. Funds are simulated; no deposit is needed. The current UI does not submit real trades. Offline random demos are retired. Preserve your data when upgrading.
