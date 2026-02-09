import { describe, expect, it, vi } from 'vitest';

import { IngestEventDto } from '../ingest/dto/ingest-events.dto';
import { EventRepository } from '../ingest/repositories/event.repository';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  it('aggregates my today interactions and lastActiveAt', () => {
    const now = new Date('2026-02-09T15:00:00.000Z');
    const events: IngestEventDto[] = [
      {
        eventId: 'evt-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'prompt.sent',
        ts: '2026-02-09T09:00:00.000Z',
      },
      {
        eventId: 'evt-2',
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'prompt.sent',
        ts: '2026-02-09T12:30:00.000Z',
      },
      {
        eventId: 'evt-3',
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'prompt.sent',
        ts: '2026-02-08T22:59:59.000Z',
      },
    ];

    const repository = {
      listByTenantUser: vi.fn().mockReturnValue(events),
    } as unknown as EventRepository;

    const service = new StatsService(repository, () => now);

    expect(service.getMyToday('tenant-1', 'user-1')).toEqual({
      interactions: 2,
      lastActiveAt: '2026-02-09T12:30:00.000Z',
      heatmap: [
        { hour: 9, interactions: 1 },
        { hour: 12, interactions: 1 },
      ],
    });
  });
});
