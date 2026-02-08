import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { TenantRequestContext } from '../auth/tenant-context.guard';
import { IngestEventDto } from './dto/ingest-events.dto';
import { IngestService } from './ingest.service';
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
    const service = new IngestService(repo, { onEvent: vi.fn() } as any);

    const invalidPayload = {
      eventId: 'evt-1',
      eventType: 'heartbeat',
      unexpected: 'bad-field',
    } as IngestEventDto;

    expect(() => service.ingestEvent(context, invalidPayload)).toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('deduplicates storage but triggers presence for each accepted duplicate eventId', () => {
    const repo = {
      hasEventId: vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true),
      save: vi.fn(),
    } as unknown as EventRepository;
    const presenceService = {
      onEvent: vi.fn(),
    } as any;
    const service = new IngestService(repo, presenceService);

    const payload: IngestEventDto = {
      eventId: 'evt-dup',
      eventType: 'heartbeat',
    };

    expect(() => service.ingestEvent(context, payload)).not.toThrow();
    expect(() => service.ingestEvent(context, payload)).not.toThrow();
    expect(repo.hasEventId).toHaveBeenNthCalledWith(1, 'tenant-1', 'evt-dup');
    expect(repo.hasEventId).toHaveBeenNthCalledWith(2, 'tenant-1', 'evt-dup');
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(presenceService.onEvent).toHaveBeenCalledTimes(2);
    expect(presenceService.onEvent).toHaveBeenNthCalledWith(1, 'tenant-1', 'user-1');
    expect(presenceService.onEvent).toHaveBeenNthCalledWith(2, 'tenant-1', 'user-1');
  });

  it('does not deduplicate same eventId across tenants', () => {
    const tenantA: TenantRequestContext = { tenantId: 'tenant-a', userId: 'user-a' };
    const tenantB: TenantRequestContext = { tenantId: 'tenant-b', userId: 'user-b' };

    const seen = new Set<string>();
    const repo = {
      hasEventId: vi.fn((tenantId: string, eventId: string) => seen.has(`${tenantId}:${eventId}`)),
      save: vi.fn((event: IngestEventDto) => {
        seen.add(`${event.tenantId}:${event.eventId}`);
      }),
    } as unknown as EventRepository;
    const service = new IngestService(repo, { onEvent: vi.fn() } as any);

    const payloadA: IngestEventDto = { eventId: 'evt-shared', eventType: 'heartbeat' };
    const payloadB: IngestEventDto = { eventId: 'evt-shared', eventType: 'heartbeat' };

    expect(() => service.ingestEvent(tenantA, payloadA)).not.toThrow();
    expect(() => service.ingestEvent(tenantB, payloadB)).not.toThrow();
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it('rejects when payload tenantId mismatches guard context', () => {
    const repo = {
      hasEventId: vi.fn().mockReturnValue(false),
      save: vi.fn(),
    } as unknown as EventRepository;
    const service = new IngestService(repo, { onEvent: vi.fn() } as any);

    const payload: IngestEventDto = {
      eventId: 'evt-tenant-mismatch',
      tenantId: 'tenant-other',
      eventType: 'heartbeat',
    };

    expect(() => service.ingestEvent(context, payload)).toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects when payload userId mismatches guard context', () => {
    const repo = {
      hasEventId: vi.fn().mockReturnValue(false),
      save: vi.fn(),
    } as unknown as EventRepository;
    const service = new IngestService(repo, { onEvent: vi.fn() } as any);

    const payload: IngestEventDto = {
      eventId: 'evt-user-mismatch',
      userId: 'user-other',
      eventType: 'heartbeat',
    };

    expect(() => service.ingestEvent(context, payload)).toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
