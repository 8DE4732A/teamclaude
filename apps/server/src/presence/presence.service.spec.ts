import { describe, expect, it, vi } from 'vitest';

import { PresenceService, PresenceState } from './presence.service';

function createMockRedis() {
  const store = new Map<string, Map<string, string>>();

  return {
    hset: vi.fn(async (key: string, ...args: unknown[]) => {
      if (!store.has(key)) store.set(key, new Map());
      const hash = store.get(key)!;
      if (args.length === 1 && typeof args[0] === 'object') {
        const obj = args[0] as Record<string, string>;
        for (const [field, value] of Object.entries(obj)) {
          hash.set(field, String(value));
        }
      } else if (args.length === 2) {
        hash.set(String(args[0]), String(args[1]));
      }
    }),
    hget: vi.fn(async (key: string, field: string) => {
      return store.get(key)?.get(field) ?? null;
    }),
    hgetall: vi.fn(async (key: string) => {
      const hash = store.get(key);
      if (!hash || hash.size === 0) return {};
      const result: Record<string, string> = {};
      for (const [field, value] of hash) {
        result[field] = value;
      }
      return result;
    }),
    expire: vi.fn(async () => 1),
    scan: vi.fn(async () => {
      const keys = [...store.keys()].filter((k) => k.startsWith('presence:user:'));
      return ['0', keys];
    }),
  };
}

describe('PresenceService', () => {
  it('transitions coding -> idle -> offline with 5/15 minute thresholds', async () => {
    const redis = createMockRedis();
    const service = new PresenceService(redis as any);
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    const now = new Date('2026-01-01T00:00:00.000Z');

    await service.onHeartbeat(tenantId, userId, now);
    await service.onEvent(tenantId, userId, now);

    expect(await service.getState(tenantId, userId)).toBe(PresenceState.Coding);

    await service.tick(new Date(now.getTime() + 6 * 60 * 1000));
    expect(await service.getState(tenantId, userId)).toBe(PresenceState.Idle);

    await service.tick(new Date(now.getTime() + 16 * 60 * 1000));
    expect(await service.getState(tenantId, userId)).toBe(PresenceState.Offline);
  });

  it('keeps state offline with heartbeat only and no events', async () => {
    const redis = createMockRedis();
    const service = new PresenceService(redis as any);
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    const now = new Date('2026-01-01T00:00:00.000Z');

    await service.onHeartbeat(tenantId, userId, now);

    expect(await service.getState(tenantId, userId)).toBe(PresenceState.Offline);

    await service.tick(new Date(now.getTime() + 10 * 60 * 1000));
    expect(await service.getState(tenantId, userId)).toBe(PresenceState.Offline);
  });

  it('sets state to coding when a new event arrives', async () => {
    const redis = createMockRedis();
    const service = new PresenceService(redis as any);

    await service.onEvent('tenant-1', 'user-1');

    expect(await service.getState('tenant-1', 'user-1')).toBe(PresenceState.Coding);
  });
});
