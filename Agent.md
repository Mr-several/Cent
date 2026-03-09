# Agent Guidelines for Cent

在参与本项目的任何开发工作之前，请务必阅读以下两份核心文档。

## 必读文档

### 1. 贡献指南
[`docs/contributing/zh.md`](docs/contributing/zh.md)

涵盖项目核心理念、开发规范、工作流及 PR 提交要求。开发任何功能前必须遵守其中的两条核心原则：**Serverless First** 与 **Sync Synergy**。

### 2. 功能开发指南
[`docs/contributing/feature-development-guide.md`](docs/contributing/feature-development-guide.md)

涵盖新功能的具体实现规范，包括文件组织、组件编写、国际化、样式、类型定义及完整的示例流程。开发新功能时以此文档作为实现参考。

### 3. 腾讯云部署指南（CloudBase）
[`docs/deploy/tencent-cloud-hosting.md`](docs/deploy/tencent-cloud-hosting.md)

涉及腾讯云 CloudBase 静态托管的构建、部署、响应头与 SPA Rewrite 配置时，按此文档执行。

### 4. Android APK 打包指南
[`docs/deploy/android-build.md`](docs/deploy/android-build.md)

需要构建 Android APK 时，按此文档执行。包含环境配置、日常打包命令、SDK 重装步骤及关键文件说明。

## 基本原则

- 所有代码提交前须通过 `pnpm run lint` 校验
- 涉及核心目录（`src/api`、`src/database`、`src/tidal`）的修改需格外谨慎，并优先提 Issue 讨论
- 新功能或大规模重构请先提交 Issue，再开始开发

## src 目录文档治理规则（强制）

### 1. 强制范围

- 强制范围仅为 `src/` 及其子目录
- 非强制范围（如 `docs/`、`android/`）仅建议维护 `README.md`，不阻断开发流程

### 2. 目录 README 强制要求

- `src/` 下每个业务目录必须有 `README.md`
- 目录 `README.md` 仅允许以下四段结构：
  1. `目录职责`
  2. `包含内容`
  3. `关键约束`
  4. `子目录导航`
- 简洁性硬约束：
  1. `目录职责` 控制在 3-5 行
  2. 每个部分最多 6 条 bullet
  3. 总行数建议不超过 80 行，硬上限 120 行
  4. 禁止粘贴大段实现细节和长代码块；实现细节请放专题文档并使用链接引用

### 3. 修改前后流程（必须执行）

- 修改 `src/<dir>` 前，必须先阅读 `src/<dir>/README.md`
- 修改完成后，必须检查从当前目录到 `src/` 根目录的 README 链路是否需要同步更新
- 若改动影响职责、接口、依赖、数据流或子目录结构，必须在同一提交内更新对应 README

### 4. README 必须更新的触发条件

- 新增、删除或重命名子目录
- 对外暴露接口发生变化
- 关键依赖发生变化
- 目录职责或边界发生变化
- 关键约束（兼容性、性能、安全）发生变化

## src 目录 README 标准模板

```md
# <目录名>

## 目录职责
- 3-5 行说明负责什么、不负责什么。

## 包含内容
- 主要文件/子目录（最多 6 条）。

## 关键约束
- 修改该目录必须遵守的规则（最多 6 条）。

## 子目录导航
- 仅一级子目录 + 一句话说明（最多 8 条）。
```
