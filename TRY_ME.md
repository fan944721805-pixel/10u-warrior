# 10U 战神 · 最简试用

## 安卓 APP

1. 下载 Release 附件 `10u-warrior-0.1.9-android-preview.apk`，在手机上安装。
2. 打开 APP →「开一局」→ 选择策略 →「确认开局」。默认使用本地规则，无需钱包或 AI Key。
3. 要切到后台继续模拟，在提示中允许后台运行；桌面小组件可在「对局设置」中添加。

需要 Android 7.0 或以上及可访问行情服务的网络。APK 为 Release 构建、现有测试证书签名，仅用于侧载试用。同签名旧测试版可直接覆盖安装；签名冲突时请先保留旧版与数据，不要直接卸载。系统或厂商省电策略仍可能停止后台；重启应用后对局恢复为暂停，手动继续即可。

## 电脑 Web

1. 下载 `10u-warrior-0.1.9-web.zip` 并解压。先安装 [Node.js 22 或以上](https://nodejs.org)。
2. Windows 双击 `start-web.cmd`，首次联网安装依赖后自动打开网页，使用期间保留命令窗口。
3. 点击「开一局」→ 选择策略 →「确认开局」。关闭命令窗口即可停止服务。

macOS / Linux：在解压目录执行 `npm ci --omit=dev`，再执行 `node start-web.cjs`。网页地址是 <http://127.0.0.1:5174>；无行情网络时可用 <http://127.0.0.1:5174/?offline=1> 体验离线演示。

所有对局资金和收益都是模拟数据，无需充值。试用启动器关闭真实报价和交易；可选外部 AI 需自行配置，可能产生供应商费用。个人数据只保存在自己的电脑或手机上；升级前请保留旧目录/应用数据。

## Quick trial (English)

- **Android:** install the APK, open the app, create a battle and confirm. No wallet or AI key is required. Allow background operation if needed. This is a Release build signed with the existing test certificate, for sideload testing only.
- **Web:** install Node.js 22+, extract the ZIP and run `start-web.cmd` on Windows. On macOS/Linux run `npm ci --omit=dev`, then `node start-web.cjs`. Keep the terminal open. Open <http://127.0.0.1:5174> if the browser does not open automatically.
- Funds are simulated. No deposit is needed. Live trading is disabled by the trial launcher.
