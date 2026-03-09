# 腾讯云 CloudBase 静态托管部署指南

本文用于 Cent 在腾讯云 CloudBase Hosting 的标准部署与排障流程。

## 1. 前置条件

- 已开通腾讯云 CloudBase 环境，并启用静态托管
- 已获取环境 ID（如 `personal-xxxx`）
- 本地已安装 `Node.js`、`pnpm`
- 可使用 `cloudbase` CLI 登录

## 2. 构建与部署

在项目根目录执行：

```bash
pnpm install
pnpm run build:web
npx -p @cloudbase/cli cloudbase hosting deploy -e <your-env-id> dist
```

示例：

```bash
pnpm run build:web
npx -p @cloudbase/cli cloudbase hosting deploy -e personal-2g6bvwk3b9b6aefd dist
```

## 3. 必须配置（避免下载 index.html）

### 3.1 响应头

在 CloudBase 托管域名/CDN 配置中确保响应头包含：

- `Content-Disposition: inline`

如果是 `attachment`，浏览器会把页面当文件下载，表现为登录后下载 `index.html`。

### 3.2 SPA Rewrite

静态托管需要配置单页应用重写规则：

- `/* -> /index.html`

否则刷新或前端路由跳转会出现 404。

## 4. 登录策略说明

- 默认不配置 `VITE_LOGIN_API_HOST` 时，Cent 使用手动 Token 登录（不会发起 OAuth 跳转）
- 仅在自建 OAuth 后端时，才需要在构建时注入：

```bash
VITE_LOGIN_API_HOST=https://<your-auth-host> pnpm run build:web
```

## 5. 部署后校验

### 5.1 响应头校验

```bash
curl -I https://<your-domain>/
```

应看到：

- `content-type: text/html`
- `content-disposition: inline`

### 5.2 业务校验

- 访问首页正常渲染
- Gitee/GitHub 手动 Token 登录不触发文件下载
- 登录后可正常进入账本首页并发起同步请求

## 6. 常见问题

### 问题：输入 Token 后下载 `index.html`

优先检查：

1. 域名响应头是否是 `Content-Disposition: attachment`
2. 是否已配置 `Content-Disposition: inline`
3. 是否清理了浏览器缓存与 Service Worker

### 问题：刷新后 404

检查是否配置 SPA Rewrite：`/* -> /index.html`
