# Claude Code 团队效能可视化与虚拟办公室系统（P1 MVP）方案设计

- 日期：2026-02-08
- 依据文档：`spec/prd.md`
- 方案范围：仅覆盖 P1 MVP

## 1. 设计目标与边界

### 1.1 目标

基于 PRD，P1 MVP 目标是打通从本地 Claude Code 行为采集到虚拟办公室状态可视化的端到端链路：

1. 采集插件可低侵入上报行为事件与心跳。
2. 后端完成企业登录、鉴权、状态计算与实时广播。
3. 前端虚拟办公室可稳定展示三态（Coding / Idle / Offline）并支持点击查看今日概览。
4. 满足隐私约束：不采集代码内容与 Prompt。

### 1.2 明确范围（In Scope）

- Hooks Sidecar 本地采集（不包裹 `claude` 命令）。
- 企业登录：OIDC 优先，SAML 预留。
- 后端：NestJS 模块化单体。
- 数据层：MongoDB（持久化）+ Redis（在线态与实时广播）。
- 前端：React + Phaser 的 2D 虚拟办公室。
- 私有化部署优先（Docker Compose 基线，支持后续 K8s）。

### 1.3 非目标（Out of Scope）

- AI 生成头像（P2）。
- 深度个人分析面板（P2）。
- 角色互动玩法（P3）。
- 多服务拆分与事件总线化（后续演进）。

---

## 2. 核心决策记录

1. **阶段范围**：仅做 P1 MVP。
2. **采集方式**：纯 Hooks Sidecar。
3. **登录策略**：企业 SSO，OIDC 先落地，SAML 预留。
4. **部署策略**：私有化部署优先。
5. **架构形态**：模块化单体 + Redis 实时层。
6. **数据库**：MongoDB（替代 PostgreSQL）+ Redis。
7. **多设备规则**：单用户单头像合并，按最近活跃设备驱动状态。
8. **状态阈值**：Idle = 5 分钟无事件；Offline = 15 分钟无心跳。
9. **可见性规则**：即使用户未打开 Web 页面，只要 Sidecar 有活跃事件，地图仍显示 Coding/Idle 状态。

---

## 3. 总体架构

```
Claude Hooks Sidecar
   ├─ 本地队列（离线缓存）
   ├─ OIDC 登录/续期
   └─ /v1/ingest/events, /v1/ingest/heartbeat
            ↓
NestJS Backend（模块化单体）
   ├─ AuthModule      (OIDC、租户映射、RBAC)
   ├─ IngestModule    (鉴权、幂等、限流、落库)
   ├─ PresenceModule  (状态机、目标点计算)
   ├─ OfficeModule    (地图、工位、头像)
   ├─ StatsModule     (个人/团队统计)
   └─ GatewayModule   (WebSocket 广播)
            ↓
MongoDB（事件/配置/统计） + Redis（在线态/广播/TTL）
            ↓
React + Phaser Virtual Office
```

设计原则：

- **低侵入**：采集不影响 `claude` 主流程。
- **一致性归后端**：前端不做业务判定，仅渲染。
- **实时与持久解耦**：Redis 负责在线态，MongoDB 负责历史与统计。
- **租户强隔离**：所有读写和广播均绑定 `tenantId`。

---

## 4. 组件设计

## 4.1 Sidecar（本地采集端）

职责：

- 监听 hooks 事件：`pre-command` / `post-command` / `on-error` 等。
- 组装最小事件载荷，异步发送到后端。
- 提供周期性心跳，维持在线状态。
- 网络异常时写本地持久化队列并重试补传。

事件字段（白名单）：

- `eventId`（幂等键）
- `tenantId`
- `userId`
- `deviceId`
- `eventType`（command/chat/codegen/error）
- `ts`
- `durationMs`（可选）
- `tokenUsage`（可选）
- `projectHash`

隐私约束：

- 禁止上传代码内容、Prompt 文本、文件内容、命令参数正文（敏感内容）。
- 仅上报动作行为和统计元数据。

## 4.2 Backend（NestJS）

- **AuthModule**：OIDC 登录回调、token 校验与刷新、租户成员映射。
- **IngestModule**：接收事件和心跳、schema 校验、幂等去重、限流。
- **PresenceModule**：状态机与目标点分配。
- **OfficeModule**：地图配置、工位绑定、头像（预设）设置。
- **StatsModule**：按日/周聚合并提供查询。
- **GatewayModule**：WebSocket 连接管理与租户房间广播。

## 4.3 Frontend（React + Phaser）

- React：登录流程、用户设置页、HUD 卡片、管理页。
- Phaser：tilemap 渲染、角色动画、路径移动。
- 仅消费后端增量事件，避免前后端状态分叉。

---

## 5. 状态机与实时链路

## 5.1 状态定义

- `Coding`：收到新的有效行为事件，角色立即回固定工位并进入“坐下/打字”。
- `Idle`：`lastEventAt` 超过 5 分钟，角色在可行走区域随机漫步。
- `Offline`：`lastHeartbeatAt` 超过 15 分钟，角色隐藏或半透明。

## 5.2 多设备合并

- 每个用户地图上仅一个头像。
- 以最近活跃设备（`activeDeviceId`）驱动状态与时间戳。
- 同一用户多设备事件进入同一用户状态机。

## 5.3 端到端时序

1. Sidecar 接收 hooks 并入本地队列。
2. Sidecar 批量上报 `/v1/ingest/events`。
3. Ingest 校验并落 MongoDB，写入去重记录。
4. Presence 更新 Redis 在线态并触发状态变化。
5. Gateway 向租户房间广播 `stateChanged/targetChanged`。
6. 前端收到事件后驱动动画与路径。

目标：`事件产生 → 角色动作` 的 p95 延迟小于 2 秒。

---

## 6. 数据模型

## 6.1 MongoDB Collections

- `users`：用户基础信息、角色、seatId、avatarRef。
- `devices`：设备注册、版本、最后活跃时间。
- `events_raw`：行为原始事件（仅元数据）。
- `events_dedup`：幂等去重（`eventId` 唯一，短 TTL）。
- `seats`：工位定义与占用关系。
- `stats_daily` / `stats_weekly`：聚合统计。
- `audit_logs`：审计记录。

推荐索引：

- `events_raw`: `{ tenantId: 1, userId: 1, ts: -1 }`
- `events_raw`: `{ tenantId: 1, ts: -1 }`
- `events_dedup`: `{ eventId: 1 } unique`
- `users`: `{ tenantId: 1, externalId: 1 } unique`
- `seats`: `{ tenantId: 1, seatId: 1 } unique`

## 6.2 Redis Keys

- `presence:user:{userId}`（Hash：state/lastEventAt/lastHeartbeatAt/seatId/activeDeviceId）
- `tenant:{tenantId}:online_users`（Set）
- `ws:conn:{connId}`（连接映射，短 TTL）
- `rate:ingest:{tenantId}:{userId}`（限流计数）

---

## 7. 接口与协议

## 7.1 Ingest API

- `POST /v1/ingest/events`：批量事件上报。
- `POST /v1/ingest/heartbeat`：设备心跳。

## 7.2 用户与办公室 API

- `GET /v1/me`
- `POST /v1/me/seat`
- `POST /v1/me/avatar`
- `GET /v1/office/map`

## 7.3 统计 API

- `GET /v1/stats/me/today`
- `GET /v1/stats/team/trend`（admin）

## 7.4 WebSocket 事件

- `presence.stateChanged`：`userId, state, at`
- `presence.targetChanged`：`userId, target, reason`
- `office.userSnapshot`：初次连接全量快照

---

## 8. 安全与合规

- OIDC token 校验与最小权限访问。
- Sidecar 与服务端双重 schema 白名单校验。
- 全链路 TLS；敏感凭证加密存储。
- 审计可追溯：登录、失败鉴权、管理员操作。
- 严格租户隔离：查询条件与广播房间均强制绑定 `tenantId`。

---

## 9. 稳定性与可观测性

关键指标：

- `ingest_success_rate`
- `ingest_queue_backlog`
- `presence_state_transition_latency_ms`
- `ws_broadcast_latency_ms`
- `event_to_avatar_action_latency_ms`（核心 SLO）

日志与追踪：

- API 请求日志（去敏）。
- 状态机转移日志（抽样）。
- 错误分类：鉴权失败、幂等冲突、消息广播失败。

告警建议：

- 事件入站成功率持续下降。
- Redis 可用性异常。
- p95 实时延迟超过阈值。

---

## 10. 测试与验收

## 10.1 测试策略

1. 单元测试：状态机边界、阈值切换、单头像合并规则。
2. 集成测试：Ingest → Presence → WebSocket 全链路。
3. E2E：20-100 人并发、离线补传、网络抖动恢复。
4. 安全测试：token 过期/伪造、重放、跨租户访问。

## 10.2 MVP 验收标准

- 实时延迟：`p95 < 2s`。
- 隐私约束：零敏感内容上报。
- 状态正确：Coding/Idle/Offline 三态行为符合规则。
- 稳定补传：断网期间事件不丢失，恢复后按序补传。
- 可视化可用：可查看个人今日概览与团队趋势。

---

## 11. 演进路线（P2/P3 预留）

- P2：AI 头像生成、细粒度个人分析面板。
- P3：角色互动玩法与协作可视化增强。
- 架构演进：当并发和功能复杂度上升后，再拆分 Ingest/Presence/Stats 为独立服务，并引入消息总线。
