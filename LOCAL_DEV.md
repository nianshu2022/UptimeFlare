# 本地开发启动指南

## 前置要求

1. **Node.js** >= 18.x
2. **npm** 或 **yarn**
3. **Cloudflare Wrangler CLI**（用于模拟 Cloudflare 环境，可选但推荐）

## 安装依赖

```bash
npm install
```

## 启动方式

### 方式一：Next.js 开发模式（推荐用于前端开发）

这种方式适合开发和调试前端页面样式、组件等。

```bash
npm run dev
```

启动后访问：http://localhost:3000

**注意：**
- 这种方式只能查看前端页面，无法测试完整的 Worker 功能
- 由于依赖 Cloudflare KV，页面可能会显示"监控状态未定义"的提示
- 适合开发和调试前端界面、样式等

### 方式二：Cloudflare Pages 预览模式（完整功能测试）

这种方式会构建项目并使用 Wrangler 本地模拟 Cloudflare Pages 环境，可以测试完整功能。

```bash
npm run preview
```

这个命令会：
1. 构建 Next.js 项目（`npx @cloudflare/next-on-pages`）
2. 使用 `wrangler pages dev` 启动本地服务器
3. 模拟 Cloudflare KV 环境

启动后访问：http://localhost:8788（默认端口）

**注意：**
- 首次运行可能需要登录 Cloudflare（`wrangler login`）
- 需要创建本地 KV Namespace 或使用远程 KV
- 适合测试完整的监控功能

### 方式三：仅测试 Worker（后端监控逻辑）

如果只想测试 Worker 的监控逻辑：

```bash
cd worker
wrangler dev
```

**配置 Worker：**
需要先配置 `worker/wrangler.toml` 或在本地创建 KV：

```bash
# 在项目根目录
cd worker

# 创建本地 KV（开发用）
wrangler kv:namespace create "UPTIMEFLARE_STATE" --preview
```

然后将返回的 KV namespace ID 添加到 `worker/wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "UPTIMEFLARE_STATE"
id = "你的 KV ID"
preview_id = "你的预览 KV ID"
```

## 配置说明

### 主要配置文件

- `uptime.config.ts` - 监控配置（监控项、通知等）
- `pages/_app.tsx` - Next.js 应用入口
- `next.config.js` - Next.js 配置
- `worker/wrangler.toml` - Worker 配置

### 本地开发时的注意事项

1. **KV 存储模拟**
   - 开发模式下，如果没有配置真实的 KV，状态数据可能为空
   - 可以手动在 KV 中插入测试数据

2. **API 端点测试**
   - `/api/test-check` - 手动触发监控检查
   - `/api/data` - 获取监控数据

3. **样式文件**
   - 全局样式位于 `styles/global.css`
   - Mantine 样式通过 `@mantine/core/styles.css` 导入

## 常见问题

### 1. 启动时提示找不到 KV Namespace

**解决方案：**
```bash
# 安装 wrangler（如果还没安装）
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 KV namespace（用于开发）
wrangler kv:namespace create "UPTIMEFLARE_STATE"
```

### 2. 页面显示"监控状态未定义"

这是正常的，因为本地没有实际的监控数据。你可以：
- 使用 `npm run preview` 测试完整功能
- 或者部署到 Cloudflare 后查看实际效果

### 3. 样式没有生效

确保：
- 已安装所有依赖：`npm install`
- `styles/global.css` 文件已正确导入（在 `pages/index.tsx` 和 `pages/incidents.tsx` 中）

### 4. 端口被占用

修改启动命令的端口：
- Next.js: `npm run dev -- -p 3001`
- Wrangler: `wrangler pages dev ... --port 8789`

## 推荐的开发流程

1. **前端开发**：使用 `npm run dev` 快速开发界面
2. **功能测试**：使用 `npm run preview` 测试完整功能
3. **部署前验证**：使用 `npm run build` 检查构建是否成功

## 构建生产版本

```bash
# 构建 Next.js 项目（用于 Cloudflare Pages）
npm run build
```

构建产物会在 `.vercel/output/static` 目录中。

