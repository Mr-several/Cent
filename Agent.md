# Agent Guidelines for Cent

在参与本项目的任何开发工作之前，请务必阅读以下两份核心文档。

## 必读文档

### 1. 贡献指南
[`docs/contributing/zh.md`](docs/contributing/zh.md)

涵盖项目核心理念、开发规范、工作流及 PR 提交要求。开发任何功能前必须遵守其中的两条核心原则：**Serverless First** 与 **Sync Synergy**。

### 2. 功能开发指南
[`docs/contributing/feature-development-guide.md`](docs/contributing/feature-development-guide.md)

涵盖新功能的具体实现规范，包括文件组织、组件编写、国际化、样式、类型定义及完整的示例流程。开发新功能时以此文档作为实现参考。

## 基本原则

- 所有代码提交前须通过 `pnpm run lint` 校验
- 涉及核心目录（`src/api`、`src/database`、`src/tidal`）的修改需格外谨慎，并优先提 Issue 讨论
- 新功能或大规模重构请先提交 Issue，再开始开发
