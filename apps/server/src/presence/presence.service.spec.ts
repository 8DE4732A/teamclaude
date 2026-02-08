import { describe, expect, it } from 'vitest';

import { PresenceService, PresenceState } from './presence.service';

describe('PresenceService', () => {
  it('transitions coding -> idle -> offline with 5/15 minute thresholds', () => {
    const service = new PresenceService();
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    const now = new Date('2026-01-01T00:00:00.000Z');

    service.onHeartbeat(tenantId, userId, now);
    service.onEvent(tenantId, userId, now);

    expect(service.getState(tenantId, userId)).toBe(PresenceState.Coding);

    service.tick(new Date(now.getTime() + 6 * 60 * 1000));
    expect(service.getState(tenantId, userId)).toBe(PresenceState.Idle);

    service.tick(new Date(now.getTime() + 16 * 60 * 1000));
    expect(service.getState(tenantId, userId)).toBe(PresenceState.Offline);
  });

  it('keeps state offline with heartbeat only and no events', () => {
    const service = new PresenceService();
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    const now = new Date('2026-01-01T00:00:00.000Z');

    service.onHeartbeat(tenantId, userId, now);

    expect(service.getState(tenantId, userId)).toBe(PresenceState.Offline);

    service.tick(new Date(now.getTime() + 10 * 60 * 1000));
    expect(service.getState(tenantId, userId)).toBe(PresenceState.Offline);
  });

  it('sets state to coding when a new event arrives', () => {
    const service = new PresenceService();

    service.onEvent('tenant-1', 'user-1');

    expect(service.getState('tenant-1', 'user-1')).toBe(PresenceState.Coding);
  });
});
