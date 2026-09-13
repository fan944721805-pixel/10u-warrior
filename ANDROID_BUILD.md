# Android APK 打包

Android 版使用 Capacitor 将 `public/` 打包到原生 WebView。APK 内的对局是明确标识的本地模拟：不启动 Node 服务、不请求 `/api/simulation/*`、不连接钱包，不读取真实资产，也不提交真实交易。对局、策略和战绩保存在当前设备的 WebView `localStorage` 中。

> 当前产物是由 Android 调试密钥签名的测试 APK，可以侧载安装，但不是正式发布包。对外发布前必须固定包名、生成并妥善保管发布密钥，再生成 release APK/AAB。

## 本机快速构建

当前工作区已配置项目内 Android SDK，直接运行：

```powershell
npm ci
npm run android:apk
```

命令会依次执行 JavaScript 语法检查、Node 测试、Capacitor 资源同步和 Gradle Debug 构建。输出位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

只修改了 `public/` 后，也必须重新运行上述命令，否则 APK 中仍是上一次同步的资源。

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

| 功能 | APK 离线模式 | Node 本机 Web 模式 |
| --- | --- | --- |
| A/B/C 模拟对局 | 本地规则引擎 | 本机服务模拟账本 |
| 战局、暂停、策略、排行 | 支持，存当前设备 | 支持，存本机账本 |
| 真实行情/订单簿 | 不读取 | 按现有本机服务配置 |
| Binance Agentic Wallet | 禁用并显示说明 | 保留现有本机服务流程 |
| 真实交易 | 禁用 | 仍受现有人工确认和风控限制 |

Android 应用 ID 为 `com.tenuwarrior.app`，版本为 `0.1.0`，最低系统为 Android 7.0（API 24）。发布前如需更换应用 ID，应在第一次对外分发前完成；更换 ID 后，用户设备会将它视为另一个应用。

## 正式发布前

正式分发需另外完成以下工作：

1. 确认最终应用 ID 和版本号。
2. 生成专用 release keystore，私钥和密码不得提交到仓库。
3. 通过 Gradle 环境变量或本机私有配置注入签名，产出 release APK/AAB。
4. 在真实 Android 手机上验证启动、中英文、对局持久化、暂停/继续和窄屏布局。
5. 如面向外部用户，补齐隐私说明、应用内版本展示和更新策略。
