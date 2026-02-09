import { adaptHookEvent, SidecarEvent } from './hook-adapter';
import { OfflineQueue, OfflineQueueFlushResult } from './offline-queue';
import { Reporter, ReporterContext, ReporterOptions } from './reporter';

export interface SidecarOptions {
  queueFilePath: string;
  reporter: ReporterOptions;
  context: ReporterContext;
}

export interface Sidecar {
  enqueueHookEvent(input: Record<string, unknown>): Promise<void>;
  flush(): Promise<OfflineQueueFlushResult>;
  heartbeat(): Promise<void>;
}

export function createSidecar(options: SidecarOptions): Sidecar {
  const queue = new OfflineQueue<SidecarEvent>(options.queueFilePath);
  const reporter = new Reporter(options.reporter);

  return {
    async enqueueHookEvent(input: Record<string, unknown>): Promise<void> {
      const event = adaptHookEvent(input);
      await queue.enqueue(event);
    },
    async flush(): Promise<OfflineQueueFlushResult> {
      return queue.flush((event) => reporter.reportEvent(event, options.context));
    },
    async heartbeat(): Promise<void> {
      await reporter.heartbeat(options.context);
    },
  };
}

export * from './hook-adapter';
export * from './offline-queue';
export * from './reporter';
