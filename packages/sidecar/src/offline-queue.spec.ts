import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

  it('does not lose events when enqueue interleaves with flush', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sidecar-queue-'));
    const queueFile = join(dir, 'events.log');

    try {
      const queue = new OfflineQueue<{ eventId: string }>(queueFile);
      await queue.enqueue({ eventId: 'evt-1' });

      let onFirstSend: (() => void) | undefined;
      const firstSend = new Promise<void>((resolve) => {
        onFirstSend = resolve;
      });

      let releaseSender: (() => void) | undefined;
      const senderBlocked = new Promise<void>((resolve) => {
        releaseSender = resolve;
      });

      const sender = vi.fn(async () => {
        onFirstSend?.();
        await senderBlocked;
      });

      const flushing = queue.flush(sender);
      await firstSend;

      const enqueueDuringFlush = queue.enqueue({ eventId: 'evt-2' });
      releaseSender?.();

      await flushing;
      await enqueueDuringFlush;

      const sentEventIds: string[] = [];
      await queue.flush(async (event) => {
        sentEventIds.push(event.eventId);
      });

      expect(sentEventIds).toEqual(['evt-2']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails fast on malformed queue line and leaves file unchanged', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sidecar-queue-'));
    const queueFile = join(dir, 'events.log');

    try {
      await writeFile(queueFile, '{"eventId":"evt-1"}\nnot-json\n', 'utf8');
      const queue = new OfflineQueue(queueFile);
      const sender = vi.fn(async () => undefined);

      await expect(queue.flush(sender)).rejects.toThrow();
      expect(sender).toHaveBeenCalledTimes(0);

      const fileAfter = await readFile(queueFile, 'utf8');
      expect(fileAfter).toBe('{"eventId":"evt-1"}\nnot-json\n');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
