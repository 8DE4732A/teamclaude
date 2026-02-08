import { Injectable } from '@nestjs/common';

import { IngestEventDto } from '../dto/ingest-events.dto';

@Injectable()
export class EventRepository {
  private readonly seenEventIds = new Set<string>();
  private readonly events: IngestEventDto[] = [];

  hasEventId(eventId: string): boolean {
    return this.seenEventIds.has(eventId);
  }

  save(event: IngestEventDto): void {
    this.seenEventIds.add(event.eventId);
    this.events.push(event);
  }
}
