import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { TenantRequestContext } from '../auth/tenant-context.guard';
import { IngestService } from './ingest.service';
import { IngestEventDto } from './dto/ingest-events.dto';
import { EventRepository } from './repositories/event.repository';

describe('IngestService', () => {
  const context: TenantRequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  it('rejects payload with unknown fields', () => {
    const repo = {
      hasEventId: vi.fn().mockReturnValue(false),
      save: vi.fn(),
    } as unknown as EventRepository;
    const service = new IngestService(repo);

    const invalidPayload = {
      eventId: 'evt-1',
      eventType: 'heartbeat',
      unexpected: 'bad-field',
    } as IngestEventDto;

    expect(() => service.ingestEvent(context, invalidPayload)).toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('deduplicates events by eventId', () => {
    const repo = {
      hasEventId: vi
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      save: vi.fn(),
    } as unknown as EventRepository;
    const service = new IngestService(repo);

    const payload: IngestEventDto = {
      eventId: 'evt-dup',
      eventType: 'heartbeat',
    };

    expect(() => service.ingestEvent(context, payload)).not.toThrow();
    expect(() => service.ingestEvent(context, payload)).not.toThrow();
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
