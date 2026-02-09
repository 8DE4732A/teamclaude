import { Injectable } from '@nestjs/common';

import { IngestEventDto } from '../dto/ingest-events.dto';

@Injectable()
export class EventRepository {
  private readonly seenEventIds = new Set<string>();
  private readonly events: IngestEventDto[] = [];

  hasEventId(tenantId: string, eventId: string): boolean {
    return this.seenEventIds.has(this.toScopedKey(tenantId, eventId));
  }

  save(event: IngestEventDto): void {
    this.seenEventIds.add(this.toScopedKey(event.tenantId ?? '', event.eventId));
    this.events.push(event);
  }

  listByTenant(tenantId: string): IngestEventDto[] {
    return this.events.filter((event) => event.tenantId === tenantId);
  }

  listByTenantUser(tenantId: string, userId: string): IngestEventDto[] {
    return this.events.filter((event) => event.tenantId === tenantId && event.userId === userId);
  }

  private toScopedKey(tenantId: string, eventId: string): string {
    return `${tenantId}:${eventId}`;
  }
}
