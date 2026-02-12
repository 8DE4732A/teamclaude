# Claude Code 虚拟办公室 P1 MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 交付一个可私有化部署的 P1 MVP：Sidecar 上报事件与心跳，后端完成 OIDC 鉴权 + Presence 状态机 + WebSocket 广播，前端虚拟办公室展示 Coding/Idle/Offline 并可查看今日统计。

**Architecture:** 采用 TypeScript monorepo（pnpm workspace）。后端为 NestJS 模块化单体，MongoDB 存储业务与统计数据，Redis 负责 Presence 在线态与实时广播。前端使用 React + Phaser 作为渲染层，Sidecar 通过 Claude hooks 采集并异步补传事件。

**Tech Stack:** TypeScript, pnpm workspace, NestJS, MongoDB, Redis, React, Phaser, Vitest, Jest, Supertest, Playwright, Docker Compose

---

## 实施前约束（必须遵守）

- 全程遵守 DRY / YAGNI：只实现 P1 必需能力。
- 全程 TDD：每个任务都先写失败测试，再写最小实现。
- 每个任务结束立即提交一次（小步提交）。
- 严格隐私白名单：禁止采集和传输代码正文、Prompt 文本、文件内容。
- 参考技能：@superpowers:test-driven-development @superpowers:verification-before-completion

---

### Task 1: Monorepo 与基础工具链

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `apps/server/package.json`
- Create: `apps/web/package.json`
- Create: `packages/sidecar/package.json`
- Create: `apps/server/test/smoke.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/server/test/smoke.spec.ts
import { describe, it, expect } from 'vitest';

describe('workspace smoke', () => {
  it('loads workspace test runner', () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/server test`
Expected: FAIL with "Command \"test\" not found" 或缺少 Vitest 依赖。

**Step 3: Write minimal implementation**

```json
// apps/server/package.json
{
  "name": "@teamclaude/server",
  "private": true,
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "typescript": "^5.7.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

**Step 4: Run test to verify it passes**

Run: `pnpm install && pnpm -C apps/server test`
Expected: PASS (1 passed)

**Step 5: Commit**

```bash
git add pnpm-workspace.yaml package.json tsconfig.base.json .gitignore .editorconfig apps/server/package.json apps/server/test/smoke.spec.ts apps/web/package.json packages/sidecar/package.json
git commit -m "chore: bootstrap monorepo workspace"
```

---

### Task 2: Backend 启动与健康检查接口

**Files:**
- Create: `apps/server/src/main.ts`
- Create: `apps/server/src/app.module.ts`
- Create: `apps/server/src/health/health.controller.ts`
- Create: `apps/server/src/health/health.controller.spec.ts`
- Modify: `apps/server/package.json`

**Step 1: Write the failing test**

```ts
// apps/server/src/health/health.controller.spec.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';

describe('GET /health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/server test src/health/health.controller.spec.ts`
Expected: FAIL with module/controller not found。

**Step 3: Write minimal implementation**

```ts
// apps/server/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok' };
  }
}
```

```ts
// apps/server/src/app.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';

@Module({ controllers: [HealthController] })
export class AppModule {}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/server test src/health/health.controller.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/main.ts apps/server/src/app.module.ts apps/server/src/health/health.controller.ts apps/server/src/health/health.controller.spec.ts apps/server/package.json
git commit -m "feat(server): add Nest bootstrap and health endpoint"
```

---

### Task 3: OIDC 登录骨架与租户上下文

**Files:**
- Create: `apps/server/src/auth/auth.module.ts`
- Create: `apps/server/src/auth/auth.controller.ts`
- Create: `apps/server/src/auth/auth.service.ts`
- Create: `apps/server/src/auth/tenant-context.guard.ts`
- Create: `apps/server/src/auth/auth.e2e-spec.ts`
- Modify: `apps/server/src/app.module.ts`

**Step 1: Write the failing test**

```ts
// apps/server/src/auth/auth.e2e-spec.ts
it('rejects ingest without tenant context', async () => {
  const res = await request(app.getHttpServer())
    .post('/v1/ingest/events')
    .send({ events: [] });
  expect(res.status).toBe(401);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/server test src/auth/auth.e2e-spec.ts`
Expected: FAIL（当前未实现鉴权守卫）。

**Step 3: Write minimal implementation**

```ts
// apps/server/src/auth/tenant-context.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const tenantId = req.header('x-tenant-id');
    const userId = req.header('x-user-id');
    if (!tenantId || !userId) throw new UnauthorizedException();
    req.auth = { tenantId, userId };
    return true;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/server test src/auth/auth.e2e-spec.ts`
Expected: PASS（缺失上下文返回 401）

**Step 5: Commit**

```bash
git add apps/server/src/auth apps/server/src/app.module.ts
git commit -m "feat(auth): add tenant context guard and OIDC skeleton"
```

---

### Task 4: Ingest API（事件白名单 + 幂等去重）

**Files:**
- Create: `apps/server/src/ingest/ingest.module.ts`
- Create: `apps/server/src/ingest/ingest.controller.ts`
- Create: `apps/server/src/ingest/dto/ingest-events.dto.ts`
- Create: `apps/server/src/ingest/ingest.service.ts`
- Create: `apps/server/src/ingest/ingest.service.spec.ts`
- Create: `apps/server/src/ingest/repositories/event.repository.ts`

**Step 1: Write the failing test**

```ts
// apps/server/src/ingest/ingest.service.spec.ts
it('drops duplicated eventId and rejects unknown fields', async () => {
  const input = [{ eventId: 'e-1', eventType: 'command', ts: Date.now(), unknown: 'x' } as any];
  await expect(service.acceptEvents(input)).rejects.toThrow('unknown field');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/server test src/ingest/ingest.service.spec.ts`
Expected: FAIL（service 不存在）。

**Step 3: Write minimal implementation**

```ts
// apps/server/src/ingest/dto/ingest-events.dto.ts
export type EventType = 'command' | 'chat' | 'codegen' | 'error';
export interface IngestEventDto {
  eventId: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  eventType: EventType;
  ts: number;
  durationMs?: number;
  tokenUsage?: number;
  projectHash?: string;
}
```

```ts
// apps/server/src/ingest/ingest.service.ts
const ALLOWED_KEYS = ['eventId','tenantId','userId','deviceId','eventType','ts','durationMs','tokenUsage','projectHash'];
```

实现要点：
- 逐条检查字段白名单，出现未知字段直接拒绝。
- 使用 `eventId` 做幂等（重复则跳过，不报错）。

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/server test src/ingest/ingest.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/ingest
git commit -m "feat(ingest): add whitelist validation and idempotent event ingestion"
```

---

### Task 5: Presence 状态机（5/15 阈值）与心跳

**Files:**
- Create: `apps/server/src/presence/presence.module.ts`
- Create: `apps/server/src/presence/presence.service.ts`
- Create: `apps/server/src/presence/presence.service.spec.ts`
- Create: `apps/server/src/ingest/heartbeat.controller.ts`
- Modify: `apps/server/src/ingest/ingest.module.ts`

**Step 1: Write the failing test**

```ts
// apps/server/src/presence/presence.service.spec.ts
it('transitions coding -> idle -> offline with 5/15 thresholds', () => {
  const now = Date.now();
  service.onEvent({ userId: 'u1', tenantId: 't1', at: now });
  expect(service.getState('t1', 'u1').state).toBe('Coding');

  service.tick(now + 5 * 60_000 + 1);
  expect(service.getState('t1', 'u1').state).toBe('Idle');

  service.onHeartbeat({ userId: 'u1', tenantId: 't1', at: now });
  service.tick(now + 15 * 60_000 + 1);
  expect(service.getState('t1', 'u1').state).toBe('Offline');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/server test src/presence/presence.service.spec.ts`
Expected: FAIL（service 未实现）。

**Step 3: Write minimal implementation**

```ts
// apps/server/src/presence/presence.service.ts
export type PresenceState = 'Coding' | 'Idle' | 'Offline';

// 规则：
// - 新事件 => Coding
// - now - lastEventAt > 5min => Idle
// - now - lastHeartbeatAt > 15min => Offline
```

实现要点：
- 单用户单状态记录（支持 activeDeviceId）。
- `tick()` 可由定时任务调用，便于测试可注入时间。

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/server test src/presence/presence.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/presence apps/server/src/ingest/heartbeat.controller.ts apps/server/src/ingest/ingest.module.ts
git commit -m "feat(presence): implement coding-idle-offline state machine"
```

---

### Task 6: WebSocket 广播与办公室快照

**Files:**
- Create: `apps/server/src/gateway/presence.gateway.ts`
- Create: `apps/server/src/gateway/presence.gateway.spec.ts`
- Modify: `apps/server/src/presence/presence.service.ts`
- Modify: `apps/server/src/app.module.ts`

**Step 1: Write the failing test**

```ts
// apps/server/src/gateway/presence.gateway.spec.ts
it('broadcasts stateChanged to tenant room', () => {
  const payload = { tenantId: 't1', userId: 'u1', state: 'Coding' as const };
  gateway.handlePresenceChange(payload);
  expect(server.to).toHaveBeenCalledWith('tenant:t1');
  expect(server.emit).toHaveBeenCalledWith('presence.stateChanged', expect.objectContaining(payload));
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/server test src/gateway/presence.gateway.spec.ts`
Expected: FAIL（gateway 不存在）。

**Step 3: Write minimal implementation**

```ts
// apps/server/src/gateway/presence.gateway.ts
// - client 连接后按 tenant 加入 room: tenant:{tenantId}
// - 提供 handlePresenceChange/handleTargetChange 广播方法
// - 新连接时下发 office.userSnapshot
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/server test src/gateway/presence.gateway.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/gateway apps/server/src/presence/presence.service.ts apps/server/src/app.module.ts
git commit -m "feat(gateway): add tenant-scoped websocket presence broadcasting"
```

---

### Task 7: 用户设置与地图接口（seat/avatar/map）

**Files:**
- Create: `apps/server/src/office/office.module.ts`
- Create: `apps/server/src/office/office.controller.ts`
- Create: `apps/server/src/office/office.service.ts`
- Create: `apps/server/src/office/office.controller.e2e-spec.ts`
- Create: `apps/server/src/office/map/default-office-map.json`

**Step 1: Write the failing test**

```ts
// apps/server/src/office/office.controller.e2e-spec.ts
it('sets seat and avatar for current user', async () => {
  const res = await request(app.getHttpServer())
    .post('/v1/me/seat')
    .set('x-tenant-id', 't1')
    .set('x-user-id', 'u1')
    .send({ seatId: 'desk-01' });
  expect(res.status).toBe(200);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/server test src/office/office.controller.e2e-spec.ts`
Expected: FAIL（controller 未实现）。

**Step 3: Write minimal implementation**

```ts
// apps/server/src/office/office.controller.ts
// GET /v1/office/map
// POST /v1/me/seat
// POST /v1/me/avatar
// GET /v1/me
```

实现要点：
- `seatId` 必须存在于地图 desk 列表。
- 头像先支持预设 `avatarPresetId`。

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/server test src/office/office.controller.e2e-spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/office apps/server/src/office/map/default-office-map.json
git commit -m "feat(office): add seat avatar and map APIs"
```

---

### Task 8: 统计接口（今日个人 + 团队趋势）

**Files:**
- Create: `apps/server/src/stats/stats.module.ts`
- Create: `apps/server/src/stats/stats.controller.ts`
- Create: `apps/server/src/stats/stats.service.ts`
- Create: `apps/server/src/stats/stats.service.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/server/src/stats/stats.service.spec.ts
it('aggregates today count and last active from raw events', async () => {
  const summary = await service.getMyToday('t1', 'u1');
  expect(summary).toEqual(expect.objectContaining({ interactions: 3 }));
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/server test src/stats/stats.service.spec.ts`
Expected: FAIL（service 未实现）。

**Step 3: Write minimal implementation**

```ts
// apps/server/src/stats/stats.service.ts
// getMyToday(tenantId, userId): interactions, lastActiveAt, heatmap
// getTeamTrend(tenantId): daily trend array
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/server test src/stats/stats.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/stats
git commit -m "feat(stats): add today summary and team trend endpoints"
```

---

### Task 9: Sidecar（hooks 采集 + 本地队列补传）

**Files:**
- Create: `packages/sidecar/src/index.ts`
- Create: `packages/sidecar/src/hook-adapter.ts`
- Create: `packages/sidecar/src/offline-queue.ts`
- Create: `packages/sidecar/src/reporter.ts`
- Create: `packages/sidecar/src/offline-queue.spec.ts`

**Step 1: Write the failing test**

```ts
// packages/sidecar/src/offline-queue.spec.ts
it('retries queued events when network recovers', async () => {
  const queue = new OfflineQueue('/tmp/sidecar-test.jsonl');
  await queue.enqueue({ eventId: 'e1' });
  const sent = await queue.flush(async () => true);
  expect(sent).toBe(1);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/sidecar test src/offline-queue.spec.ts`
Expected: FAIL（queue 未实现）。

**Step 3: Write minimal implementation**

```ts
// packages/sidecar/src/offline-queue.ts
// append-only JSONL queue + flush callback
// 网络失败不丢弃，成功后删除已发送记录
```

实现要点：
- hooks payload 仅映射白名单字段。
- reporter 支持批量上报与心跳。

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/sidecar test src/offline-queue.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sidecar/src
git commit -m "feat(sidecar): add hook adapter and offline retry queue"
```

---

### Task 10: Web 前端（地图渲染 + Presence 动画 + HUD）

**Files:**
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/office/OfficeScene.ts`
- Create: `apps/web/src/office/presence-store.ts`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/components/UserHudCard.tsx`
- Create: `apps/web/src/office/OfficeScene.spec.ts`

**Step 1: Write the failing test**

```ts
// apps/web/src/office/OfficeScene.spec.ts
it('moves avatar back to seat on Coding event', () => {
  const scene = new OfficeScene();
  scene.applyPresence({ userId: 'u1', state: 'Coding', target: { x: 10, y: 20 } });
  expect(scene.getAvatar('u1')?.target).toEqual({ x: 10, y: 20 });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test src/office/OfficeScene.spec.ts`
Expected: FAIL（scene 未实现）。

**Step 3: Write minimal implementation**

```ts
// apps/web/src/office/OfficeScene.ts
// - 加载 map
// - 维护 avatar 精灵字典
// - applyPresence() 处理 Coding/Idle/Offline
```

实现要点：
- Coding: 立即切目标为固定工位。
- Idle: 使用服务端下发 wander 目标。
- Offline: 隐藏或半透明。

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/web test src/office/OfficeScene.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): render office scene and apply presence events"
```

---

### Task 11: 端到端联调与 Compose 部署

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/server/.env.example`
- Create: `apps/web/.env.example`
- Create: `packages/sidecar/.env.example`
- Create: `tests/e2e/presence-flow.spec.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

```ts
// tests/e2e/presence-flow.spec.ts
it('shows Coding within 2s after ingest event', async () => {
  // 伪代码：发送 ingest event -> 订阅 ws -> 断言 2s 内收到 stateChanged(Coding)
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:e2e tests/e2e/presence-flow.spec.ts`
Expected: FAIL（compose/联调脚本未就绪）。

**Step 3: Write minimal implementation**

```yaml
# docker-compose.yml
services:
  mongo:
    image: mongo:7
  redis:
    image: redis:7
  server:
    build: ./apps/server
  web:
    build: ./apps/web
```

并补齐：
- 环境变量模板（OIDC、Mongo、Redis、WS URL）。
- README 运行步骤（仅 MVP 路径）。

**Step 4: Run test to verify it passes**

Run: `docker compose up -d && pnpm test:e2e tests/e2e/presence-flow.spec.ts`
Expected: PASS（收到 Coding 广播，延迟满足门槛）

**Step 5: Commit**

```bash
git add docker-compose.yml apps/server/.env.example apps/web/.env.example packages/sidecar/.env.example tests/e2e/presence-flow.spec.ts README.md
git commit -m "chore: add compose deployment and e2e presence flow"
```

---

## 完成定义（DoD）

- 所有任务测试通过（server/web/sidecar/e2e）。
- P1 API + WS 合约完整可用。
- 角色三态逻辑与 5/15 阈值符合设计。
- 隐私白名单生效，未知字段被拒绝。
- 本地离线队列可补传，服务端幂等生效。
- 私有化最小部署（Compose）可运行。

## 验证命令清单（收尾必跑）

```bash
pnpm -r test
pnpm -C apps/server test
pnpm -C apps/web test
pnpm -C packages/sidecar test
pnpm test:e2e tests/e2e/presence-flow.spec.ts
```

---

Plan complete and saved to `docs/plans/2026-02-08-mvp-virtual-office-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
