import { describe, expect, it, vi } from 'vitest';

import { Reporter } from './reporter';

describe('Reporter', () => {
  it('throws when reportEvent receives non-2xx response', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 500 }));
    const reporter = new Reporter({ baseUrl: 'http://localhost:3000', fetchImpl });

    await expect(
      reporter.reportEvent({ eventId: 'evt-1' }, { tenantId: 'tenant-1', userId: 'user-1' }),
    ).rejects.toThrow('Failed to report event: 500');
  });

  it('propagates heartbeat network errors', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const reporter = new Reporter({ baseUrl: 'http://localhost:3000', fetchImpl });

    await expect(reporter.heartbeat({ tenantId: 'tenant-1', userId: 'user-1' })).rejects.toThrow(
      'network down',
    );
  });
});
