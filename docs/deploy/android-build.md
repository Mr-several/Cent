# Android APK 打包指南

## 环境要求

| 工具 | 版本 | 备注 |
|------|------|------|
| Java | 21 | 路径：`/Library/Java/JavaVirtualMachines/jdk-21.jdk` |
| Android SDK | 36 | 永久路径：`~/Library/Android/sdk` |
| Node.js / pnpm | - | 项目已有配置 |

## 一次性环境配置（首次或重装后执行）

Android SDK 已安装在 `~/Library/Android/sdk`（永久目录，重启不会丢失）。`android/local.properties` 已指向该路径，无需额外配置。

如果 SDK 目录丢失，执行以下步骤重新安装：

```bash
# 1. 下载 Android 命令行工具
curl -L "https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip" -o /tmp/cmdline-tools.zip

# 2. 解压到永久目录
mkdir -p ~/Library/Android/sdk/cmdline-tools
unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-extract
mv /tmp/cmdline-tools-extract/cmdline-tools ~/Library/Android/sdk/cmdline-tools/latest

# 3. 接受许可协议
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home \
  yes | ~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager \
  --sdk_root=$HOME/Library/Android/sdk --licenses

# 4. 安装 SDK 组件
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home \
  ~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager \
  --sdk_root=$HOME/Library/Android/sdk \
  --install "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

## 日常打包命令

```bash
cd "/path/to/Cent"
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home pnpm run apk:debug
```

该命令依次执行：
1. `vite build` — 构建 Web 产物到 `dist/`
2. `npx cap sync android` — 同步到 Android 工程
3. `./gradlew assembleDebug` — Gradle 编译打包

## APK 输出路径

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 关键文件说明

| 文件 | 说明 |
|------|------|
| `android/local.properties` | Android SDK 路径配置，当前为 `~/Library/Android/sdk` |
| `capacitor.config.ts` | Capacitor 配置，`webDir` 指向 `dist` |
| `android/variables.gradle` | SDK 版本定义（`compileSdkVersion=36`，`minSdkVersion=24`） |
| `package.json` `apk:debug` | Debug APK 一键打包脚本 |
| `package.json` `apk:release` | Release APK 一键打包脚本（输出未签名包） |
