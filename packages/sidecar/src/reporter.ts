import { SidecarEvent } from './hook-adapter';

export interface ReporterContext {
  tenantId: string;
  userId: string;
}

export interface ReporterOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class Reporter {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ReporterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async reportEvents(events: SidecarEvent[], context: ReporterContext): Promise<void> {
    for (const event of events) {
      await this.reportEvent(event, context);
    }
  }

  async reportEvent(event: SidecarEvent, context: ReporterContext): Promise<void> {
    const response = await this.fetchImpl(this.resolveUrl('/v1/ingest/events'), {
      method: 'POST',
      headers: this.buildHeaders(context),
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Failed to report event: ${response.status}`);
    }
  }

  async heartbeat(context: ReporterContext): Promise<void> {
    const response = await this.fetchImpl(this.resolveUrl('/v1/ingest/heartbeat'), {
      method: 'POST',
      headers: this.buildHeaders(context),
    });

    if (!response.ok) {
      throw new Error(`Failed to report heartbeat: ${response.status}`);
    }
  }

  private buildHeaders(context: ReporterContext): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-tenant-id': context.tenantId,
      'x-user-id': context.userId,
    };
  }

  private resolveUrl(path: string): string {
    return new URL(path, this.options.baseUrl).toString();
  }
}
