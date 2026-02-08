import { describe, expect, it, vi } from 'vitest';

import { PresenceGateway } from './presence.gateway';

describe('PresenceGateway', () => {
  it('broadcasts stateChanged event to tenant room', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const gateway = new PresenceGateway();

    gateway.setServer({ to });
    gateway.broadcastStateChanged({
      tenantId: 'tenant-1',
      userId: 'user-1',
      state: 'Coding',
      occurredAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    });

    expect(to).toHaveBeenCalledWith('tenant:tenant-1');
    expect(emit).toHaveBeenCalledWith('presence.stateChanged', {
      tenantId: 'tenant-1',
      userId: 'user-1',
      state: 'Coding',
      occurredAt: '2026-01-01T00:00:00.000Z',
    });
  });
});
