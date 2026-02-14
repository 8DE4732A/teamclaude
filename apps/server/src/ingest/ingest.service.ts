import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { TenantRequestContext } from '../auth/tenant-context.guard';
import { PresenceService } from '../presence/presence.service';
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
  constructor(
    @Inject(EventRepository) private readonly eventRepository: EventRepository,
    @Inject(PresenceService) private readonly presenceService: PresenceService,
  ) {}

  async ingestEvent(context: TenantRequestContext, payload: unknown) {
    // Support both single object and array of events
    const items = Array.isArray(payload) ? payload : [payload];

    if (items.length === 0) {
      throw new BadRequestException('Payload must not be empty');
    }

    const results: IngestEventDto[] = [];

    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException('Each event must be an object');
      }

      const candidateEvent = item as Record<string, unknown>;

      for (const field of Object.keys(candidateEvent)) {
        if (!ALLOWED_EVENT_FIELDS.has(field)) {
          throw new BadRequestException(`Unknown field: ${field}`);
        }
      }

      const eventId = candidateEvent.eventId;

      if (typeof eventId !== 'string' || eventId.trim().length === 0) {
        throw new BadRequestException('eventId is required');
      }

      if (candidateEvent.tenantId !== undefined && candidateEvent.tenantId !== context.tenantId) {
        throw new BadRequestException('tenantId does not match tenant context');
      }

      if (candidateEvent.userId !== undefined && candidateEvent.userId !== context.userId) {
        throw new BadRequestException('userId does not match tenant context');
      }

      const event: IngestEventDto = {
        ...(candidateEvent as IngestEventDto),
        tenantId: context.tenantId,
        userId: context.userId,
      };

      if (!(await this.eventRepository.hasEventId(context.tenantId, eventId))) {
        await this.eventRepository.save(event);
      }

      results.push(event);
    }

    await this.presenceService.onEvent(context.tenantId, context.userId);

    return {
      accepted: true,
      tenantId: context.tenantId,
      userId: context.userId,
      count: results.length,
    };
  }
}
