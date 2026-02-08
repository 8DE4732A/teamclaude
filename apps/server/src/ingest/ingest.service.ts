import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { TenantRequestContext } from '../auth/tenant-context.guard';
import { IngestEventDto } from './dto/ingest-events.dto';
import { EventRepository } from './repositories/event.repository';

const ALLOWED_EVENT_FIELDS = new Set([
  'eventId',
  'tenantId',
  'userId',
  'deviceId',
  'eventType',
  'ts',
  'durationMs',
  'tokenUsage',
  'projectHash',
]);

@Injectable()
export class IngestService {
  constructor(@Inject(EventRepository) private readonly eventRepository: EventRepository) {}

  ingestEvent(context: TenantRequestContext, payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Payload must be an object');
    }

    const candidateEvent = payload as Record<string, unknown>;

    for (const field of Object.keys(candidateEvent)) {
      if (!ALLOWED_EVENT_FIELDS.has(field)) {
        throw new BadRequestException(`Unknown field: ${field}`);
      }
    }

    const eventId = candidateEvent.eventId;

    if (typeof eventId !== 'string' || eventId.trim().length === 0) {
      throw new BadRequestException('eventId is required');
    }

    const event: IngestEventDto = candidateEvent as IngestEventDto;

    if (!this.eventRepository.hasEventId(eventId)) {
      this.eventRepository.save(event);
    }

    return {
      accepted: true,
      tenantId: context.tenantId,
      userId: context.userId,
      payload: event,
    };
  }
}
