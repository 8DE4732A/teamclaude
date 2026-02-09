# TeamClaude MVP

## 本地运行（MVP）

1. 安装依赖：

```bash
pnpm install
```

2. 准备环境变量：

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp packages/sidecar/.env.example packages/sidecar/.env
```

3. 使用 Compose 启动基础服务与应用（包含 server + web）：

```bash
docker compose up -d
```

4. 可选：校验 Compose 配置合法性：

```bash
docker compose config
```

## 测试与联调验证

### 单元/模块测试

```bash
pnpm -C apps/server test
pnpm -C apps/web test
pnpm -C packages/sidecar test
```

### Presence 端到端流转验证

该用例验证：写入 ingest 事件后，2 秒内可观察到 `presence.stateChanged` 且状态为 `Coding`。

```bash
pnpm test:e2e tests/e2e/presence-flow.spec.ts
```
