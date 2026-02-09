import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { OfflineQueue } from './offline-queue';

describe('OfflineQueue', () => {
  it('retries queued events when network recovers', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sidecar-queue-'));
    const queueFile = join(dir, 'events.log');

    try {
      const queue = new OfflineQueue(queueFile);
      await queue.enqueue({ eventId: 'evt-1' });
      await queue.enqueue({ eventId: 'evt-2' });

      const sender = vi.fn(async () => {
        throw new Error('network down');
      });

      const firstAttempt = await queue.flush(sender);

      expect(firstAttempt.sent).toBe(0);
      expect(firstAttempt.remaining).toBe(2);

      sender.mockImplementation(async () => undefined);

      const secondAttempt = await queue.flush(sender);

      expect(secondAttempt.sent).toBe(2);
      expect(secondAttempt.remaining).toBe(0);
      expect(sender).toHaveBeenCalledTimes(4);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
