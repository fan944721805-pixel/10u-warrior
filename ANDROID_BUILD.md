# Android APK 打包

Android 版独立运行，无需电脑或自建服务器。手机通过 Android HTTPS 接口直接获取 Binance 公开行情、K 线和订单簿，并直接调用用户配置的 AI 服务。`mobile/runtime.cjs` 复用电脑版的策略、风控、对局、结算和 AI 连接模块；不运行 Node 服务，不请求电脑的 `/api/*`。

对局使用模拟资金。公开行情模拟沿用电脑版规则：按本轮首根 1 分钟 K 线开盘价与最后一根已完成 K 线收盘价结算，获胜返还 2 倍、平局退本金。行情不可用时等待恢复，不以随机结果替代。钱包入口支持 Binance Agentic Wallet 授权与资产查询；当前界面不提供真实下单。

联网对局、收藏、AI 配置和战绩存入 Android 应用私有目录，由 Android Keystore 的 AES-GCM 密钥加密；写入确认后才推进账本。AI Key 不另存到 localStorage 或 IndexedDB。旧本地收藏保留备份后导入服务集合，已有正式账本继续读取；随机离线演示已退出产品入口，其成绩不迁入正式账本。

> 当前 GitHub 产物是非调试的 Release APK，沿用 Android 测试证书供侧载安装，不是商店签名包。包名为 `com.tenuwarrior.app`，0.2.1 的 versionCode 为 17；商店上架前仍须配置专用发行签名。

## GitHub 试用 Release

0.2.1 延续 0.1.9 以来 GitHub 侧载包的 Release 构建和本机测试证书，支持同签名旧测试版覆盖安装。它不是使用专用发行证书的商店发布包。测试签名不上传；构建与验签方式依据 [Android 签名说明](https://developer.android.com/studio/publish/app-signing) 和 [apksigner](https://developer.android.com/tools/apksigner)。本版构建、资源与下载核验见[交付记录](docs/strategy-system/12-production-migration.md)。

```powershell
npm run check
npm test
npm run android:sync
Set-Location android
.\gradlew.bat --init-script ..\scripts\trial-release-signing.gradle assembleRelease
```

输出 `android/app/build/outputs/apk/release/app-release.apk`。测试签名仅在显式传入该 init script 时生效，未改变常规 Release 的签名配置。最简安装和 Web 试用步骤见 [TRY_ME.md](./TRY_ME.md)。

## 本机快速构建

正式首页为 `public/index.html`，`card-lab.html` 只作旧书签跳转。构建按 `client-assets.cjs` 生成 `artifacts/mobile-web`，Capacitor 仅同步此目录；不要将整个 `public/` 复制进 APK，否则会重新带入已退役页面。

当前工作区已配置项目内 Android SDK，直接运行：

```powershell
npm ci
npm run android:apk
```

命令会执行 JavaScript 语法检查、手机运行包构建、Node 测试、Capacitor 资源同步和 Gradle Debug 构建。`npm run mobile:build` 使用 esbuild 将共用模块与手机适配器生成到 `public/mobile-runtime.js`，不手工编辑这个生成文件。输出位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

只修改了 `public/` 后，也必须重新运行上述命令，否则 APK 中仍是上一次同步的资源。

`android:sync` 和 `android:apk` 会先运行 `scripts/sync-android-icon.cjs`，从网页顶部 `warrior-mark` 读取当前方形 PNG，原样同步到 `assets/logo.png` 和 Android `launcher_art.png`。启动图标通过 `ic_rider_launcher` / `ic_rider_launcher_round` 引用该图片，缩放与自适应遮罩由 Android 处理；更新品牌图片时无需手动逐个替换分辨率资源。

## 换一台电脑构建

需要以下工具：

| 工具 | 要求 | 用途 |
| --- | --- | --- |
| Node.js | 22 或更高 | 安装依赖、检查和测试 |
| JDK | 21 | Gradle / Android 编译 |
| Android SDK Platform | API 36 | `compileSdk` 和 `targetSdk` |
| Android SDK Build Tools | 35.0.0 或由 Gradle 选定的兼容版本 | APK 编译与签名 |

将 Android SDK 路径写入不入库的 `android/local.properties`：

```properties
sdk.dir=C\:/path/to/Android/Sdk
```

然后执行：

```powershell
npm ci
npm run android:apk
```

## 运行时边界

### 后台运行（0.1.7）

联网 APK 由 `SimulationService` 持有唯一执行实例，页面通过 `NativeRuntime` 调用服务，不再直接打开加密账本。服务在独立、仅加载本地资源的 WebView 中复用原有 JS 引擎，所有 JS 计时器由 Android Handler 调度；运行或结算期间使用前台通知和有超时、持续更新的 CPU 唤醒锁。Activity 隐藏或重建不会暂停引擎、重复创建对局或关闭服务内的行情 WebSocket。断线仍自动重连，不保证网络物理连接永不掉线。

通知栏「暂停全部下注」沿用现有暂停控制，取消尚未完成的决策；已有订单继续等待收盘数据结算。全部对局停止且没有待结算订单后释放前台状态与唤醒锁。强制停止、系统杀进程或覆盖升级后重新打开，对局仍恢复为暂停，须手动继续；错过的轮次不补下注，原有余额不重置。

首次安装或升级后，如尚未豁免电池优化或后台活动受限，会主动显示“允许后台运行”弹窗；选择“稍后设置”后一天内不重复提醒，返回应用时会重新读取系统状态。此引导也会在状态无法读取时提供手动设置入口。

在对局设置的“后台模拟”中，可打开“电池优化设置”或“应用后台设置”，找到 10U 战神后选择不受限制/允许后台运行（名称因手机而异）。页面只报告系统返回的电池优化豁免状态；厂商自启动和后台限制需在手机中另行查看。

在「后台模拟」中可点击「显示运行通知」申请通知权限；拒绝通知不会被误报为已授权。服务使用 Android `specialUse` 类型并声明实际用途：用户主动开始的持续本地模拟、行情处理和虚拟订单结算。该用途不同于有限的数据同步任务，正式上架时需按平台要求申报审核。仍受强制停止、系统资源和厂商省电策略影响；不使用伪装音频、定位或精确闹钟维持运行。

参考：[Android 电池优化说明](https://developer.android.com/training/monitoring-device-state/doze-standby)、[前台服务类型](https://developer.android.com/develop/background-work/services/fgs/service-types)。

| 功能 | APK 默认联网模式 | Node 本机 Web 模式 |
| --- | --- | --- |
| 模拟对局与策略 | 复用共用引擎，在手机运行 | 本机服务模拟账本 |
| 战局、暂停、策略、排行 | 支持，存手机加密账本 | 支持，存本机账本 |
| 真实行情/订单簿 | Android 直接 HTTPS 获取 | 按现有本机服务配置 |
| 在线 AI | 手机直接调用已配置的 HTTPS API | 本机服务调用 |
| Binance Agentic Wallet | 原生授权、会话恢复及资产查询 | 本机服务授权及资产查询 |
| 真实交易 | 当前界面无下单入口 | 当前界面无下单入口 |

Android 应用 ID 为 `com.tenuwarrior.app`，版本以 `android/app/build.gradle` 为准，最低系统为 Android 7.0（API 24）。使用同一签名覆盖安装，保留原有数据；不要先卸载旧版。设备需使用仍受支持、已更新的 Android System WebView。更换应用 ID 后，设备会将它视为另一个应用。

### 桌面策略小组件

在页脚「设备设置」中点击「添加到桌面」，或长按手机桌面，从小组件列表选择「10U 战神 → 策略战况」。默认 4×3，可调整宽高；Android 7 或不支持应用内添加的桌面需手动添加。请求后仍需在系统界面确认，组件计数增加后才显示成功。电池优化、后台限制和通知权限也在新版「设备设置」中；下方历史版本描述中的「后台模拟」对应此入口。

上下滑动浏览各对局的策略卡，显示头像、币种、模拟资金（可用余额加待结算下注）、已结算收益、本轮方向和上次运行状态。追加本金不计入收益；过期未结算订单显示等待结算。点击卡片打开对应对局、对应策略的现有详情，不会继续下注。自定义对局名保持原样，小组件内容跟随应用语言。

小组件由服务订阅同一账本并复用原有投影函数，状态改变时更新，每 25 秒发送展示心跳；页面仅同步当前语言和头像名称，不再承担后台刷新。不另建交易引擎、不发起额外行情请求。Android 私有偏好中仅缓存展示字段，不复制 AI Key、订单详情或加密账本。模拟资金并非钱包资产或实时盯市净值。

0.1.9 使用白色策略卡片，并按小组件宽高选择紧凑或宽版布局；移除独立标题栏与计时栏，运行/过期状态保留在卡片内。90 秒未收到心跳后符合过期条件，通过系统非精确定时器刷新过期状态；安卓省电调度可能延迟提示，不能保证后台秒级更新。此时可点击打开应用刷新。进程重启仍沿用原有暂停恢复规则，不会自动补下注。多个小组件共用快照，各自浏览位置独立。

验证：`npm run widget:verify` 检查数据投影；`npm run mobile:verify` 检查含添加入口的四语言响应式界面（模拟原生桥）；设置 `ANDROID_TEST_SERIAL` 为测试模拟器后运行 `node scripts/verify-strategy-widget-native.cjs` 验证真实桌面滑动、暖启动/冷启动详情、模拟补资更新、语言、过期与删除。`StrategyWidgetLayoutTest` 在 Android 上验证最小宽度与放大字体时资金文本完整显示。这些都是模拟账本和 UI 验证，不是实盘交易验证。

独立验证命令：`node --test test/mobile-runtime.test.js`（共用运行包、断网结算、重启、存储失败与 AI 路由），`npm run mobile:verify`（需 Playwright，四语言、窄屏、原生桥模拟、无电脑 API 请求）。浏览器原生桥模拟不等于真实 Android 网络或加密存储验证。

## 商店发布前

商店发行需另外完成以下工作，不应与当前 GitHub 侧载预发布混为一谈：

1. 确认最终应用 ID 和版本号。
2. 生成专用 release keystore，私钥和密码不得提交到仓库。
3. 通过 Gradle 环境变量或本机私有配置注入签名，产出 release APK/AAB。
4. 在真实 Android 手机上验证启动、中英文、对局持久化、暂停/继续和窄屏布局。
5. 如面向外部用户，补齐隐私说明、应用内版本展示和更新策略。
