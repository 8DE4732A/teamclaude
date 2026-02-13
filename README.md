# TeamClaude

**Claude Code 团队效能可视化与虚拟办公室系统**

TeamClaude 通过自动采集 Claude Code 的使用行为，将团队成员的工作状态映射到一个像素风 2D 虚拟办公室中。管理者可以直观看到"谁在编码、谁在摸鱼"，开发者也能感受到团队的协作氛围——即使大家都在远程办公。

## 背景与目标

团队全面采用 Claude Code 后，管理者需要量化工具使用情况，开发者也需要缓解远程协作的疏离感。TeamClaude 用三个核心目标解决这个问题：

1. **数据透明化** — 自动采集 Claude Code 使用事件（命令执行、代码生成、对话交互），仅收集元数据，不采集代码或 Prompt 内容
2. **可视化管理** — 提供个人/团队维度的活跃度报表和热力图
3. **团队虚拟化** — 像素风虚拟办公室，Avatar 行为实时反映工作状态（编码中→坐在工位 / 空闲→走廊闲逛 / 离线→消失）

## 架构

```
开发者本地                         服务端                        浏览器
┌──────────────┐    HTTP POST    ┌──────────────┐  WebSocket   ┌──────────────┐
│ Claude Code  │───────────────→ │   Server     │────────────→ │  Virtual     │
│ + Sidecar    │  events/heartbeat│  (NestJS)    │  presence    │  Office      │
│   Plugin     │                 │              │  broadcast   │  (Vite+TS)   │
└──────────────┘                 └──────────────┘              └──────────────┘
```

| 组件 | 位置 | 职责 |
|---|---|---|
| **Sidecar Plugin** | `plugins/teamclaude-sidecar/` | Claude Code 钩子，本地事件队列，批量上报 |
| **Server** | `apps/server/` | 事件接收、去重、Presence 状态机、WebSocket 广播、统计聚合 |
| **Web** | `apps/web/` | Phaser 3 虚拟办公室、Tiled Map 渲染、Avatar 寻路动画、HUD 数据卡片、管理后台 |

## 当前实现状况

### 已完成

- **Sidecar Plugin** — 完整的事件采集链路：钩子拦截 → 本地 NDJSON 队列 → 批量 flush + 心跳上报；支持离线缓存；异步执行不阻塞 Claude Code
- **事件接收 API** — `POST /v1/ingest/events` + `POST /v1/ingest/heartbeat`，字段白名单校验，eventId 去重，租户隔离
- **Presence 状态机** — Coding / Idle / Offline 三态转换，5 分钟无活动→Idle，15 分钟无心跳→Offline
- **WebSocket 广播** — Socket.io 按租户分房间推送 `presence.stateChanged` 和 `presence.targetChanged`
- **Office 模块** — 静态地图加载（Tiled JSON 格式）、座位分配、Avatar 预设选择
- **Stats 模块** — 个人今日统计（交互次数、最后活跃、24h 热力图）、团队 7 日趋势
- **Web 前端** — Phaser 3 引擎渲染虚拟办公室、Tiled Map 30×20 瓦片地图、A* 寻路 + 闲逛 AI、Avatar spritesheet 动画（6 配色×10 帧）、点击 Avatar 弹出 HUD 数据卡片、PresenceStore 响应式订阅
- **管理后台** — 团队统计概览卡片、7 日趋势折线图、24h 活跃热力图、成员详情表格
- **Auth0 BFF 认证** — 浏览器端 OIDC 登录 + session cookie，`/auth/login` → Auth0 → `/auth/callback`；`/auth/me` 获取当前用户；`/auth/logout` 登出
- **CLI/Plugin Token 认证** — 插件通过 `/teamclaude-sidecar:login` slash command 触发浏览器登录，服务端签发 30 天 JWT 存储到 `~/.teamclaude/token`，后续请求自动携带 `Authorization: Bearer <token>`；用户只需配一个 `SIDECAR_API_BASE_URL`
- **三策略 TenantContext Guard** — Session cookie > Bearer JWT > `x-tenant-id`/`x-user-id` Header fallback，Bearer 存在但无效时直接 401 不降级
- **E2E 测试** — 验证事件写入后 2 秒内产生 Coding 状态广播
- **Plugin Marketplace** — 仓库级 marketplace 清单，支持一键安装插件

### 待实现

- AI 生成像素头像
- 虚拟办公室互动功能（角色靠近触发聊天气泡）

## 路线图

| 阶段 | 内容 |
|---|---|
| **P1 (MVP)** | ~~数据上报~~ ✓、~~Auth0 认证~~ ✓、~~CLI Token 认证~~ ✓、~~虚拟办公室~~ ✓、~~基础报表~~ ✓ |
| **P2** | AI 生成像素头像、个人详细分析面板 |
| **P3** | 虚拟办公室互动功能（角色靠近触发聊天气泡）、团队协作检测 |

## 本地运行

1. 安装依赖：

```bash
pnpm install
```

2. 准备环境变量：

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

3. 启动开发服务（Vite + NestJS 并行）：

```bash
pnpm dev
```

或分别启动：

```bash
# 生产模式（NestJS 托管前端静态文件）
pnpm build && pnpm start
```

## 安装 Sidecar 插件

```bash
# 方式一：通过 Marketplace
/plugin marketplace add https://github.com/<owner>/teamclaude.git
/plugin install teamclaude-sidecar

# 方式二：直接添加
claude plugin add /path/to/plugins/teamclaude-sidecar
```

### 推荐：Token 认证（只需一个环境变量）

配置服务器地址（`~/.zshrc` 或 `~/.bashrc`）：

```bash
export SIDECAR_API_BASE_URL="https://your-server.com"
```

然后在 Claude Code 中执行 slash command 完成一次登录：

```
/teamclaude-sidecar:login
```

浏览器会打开 Auth0 登录页面，认证成功后 JWT token 自动保存到 `~/.teamclaude/token`（有效期 30 天）。之后插件自动使用 Bearer token 认证，无需其他配置。

### 备选：Header 认证（无需登录）

如果不使用 token 认证，可以手动配置三个环境变量：

```bash
export SIDECAR_API_BASE_URL="https://your-server.com"
export SIDECAR_TENANT_ID="your-org"
export SIDECAR_USER_ID="your-name"
```

## 测试

```bash
# 单元/模块测试
pnpm -C apps/server test
pnpm -C apps/web test
pnpm -C plugins test

# 端到端测试
pnpm test:e2e tests/e2e/presence-flow.spec.ts
```
