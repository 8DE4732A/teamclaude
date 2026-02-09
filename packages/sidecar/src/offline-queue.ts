import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface OfflineQueueFlushResult {
  sent: number;
  remaining: number;
}

export type OfflineQueueSender<TEvent> = (event: TEvent) => Promise<void>;

export class OfflineQueue<TEvent extends Record<string, unknown> = Record<string, unknown>> {
  constructor(private readonly filePath: string) {}

  async enqueue(event: TEvent): Promise<void> {
    await this.ensureParentDir();
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  async flush(sender: OfflineQueueSender<TEvent>): Promise<OfflineQueueFlushResult> {
    const queued = await this.readAll();

    if (queued.length === 0) {
      return {
        sent: 0,
        remaining: 0,
      };
    }

    let sent = 0;
    const remaining: TEvent[] = [];

    for (const event of queued) {
      try {
        await sender(event);
        sent += 1;
      } catch {
        remaining.push(event);
      }
    }

    await this.overwrite(remaining);

    return {
      sent,
      remaining: remaining.length,
    };
  }

  private async ensureParentDir(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
  }

  private async readAll(): Promise<TEvent[]> {
    try {
      const content = await readFile(this.filePath, 'utf8');
      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      return lines.map((line) => JSON.parse(line) as TEvent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }

  private async overwrite(events: TEvent[]): Promise<void> {
    await this.ensureParentDir();

    if (events.length === 0) {
      await writeFile(this.filePath, '', 'utf8');
      return;
    }

    const content = `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
    await writeFile(this.filePath, content, 'utf8');
  }
}
