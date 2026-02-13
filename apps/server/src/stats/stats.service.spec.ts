import { describe, expect, it, vi } from 'vitest';

import { IngestEventDto } from '../ingest/dto/ingest-events.dto';
import { EventRepository } from '../ingest/repositories/event.repository';
import { StatsService } from './stats.service';

function createRepository(events: IngestEventDto[]): EventRepository {
  return {
    listByTenant: vi.fn(async (tenantId: string) => events.filter((event) => event.tenantId === tenantId)),
    listByTenantUser: vi.fn(async (tenantId: string, userId: string) =>
      events.filter((event) => event.tenantId === tenantId && event.userId === userId),
    ),
  } as unknown as EventRepository;
}

describe('StatsService', () => {
  describe('getMyToday', () => {
    it('aggregates my today interactions and lastActiveAt', async () => {
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

      const service = new StatsService(createRepository(events), () => now);

      expect(await service.getMyToday('tenant-1', 'user-1')).toEqual({
        interactions: 2,
        lastActiveAt: '2026-02-09T12:30:00.000Z',
        heatmap: [
          { hour: 9, interactions: 1 },
          { hour: 12, interactions: 1 },
        ],
      });
    });

    it('includes start of day and excludes next day start', async () => {
      const now = new Date('2026-02-09T15:00:00.000Z');
      const events: IngestEventDto[] = [
        {
          eventId: 'evt-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          eventType: 'heartbeat',
          ts: '2026-02-09T00:00:00.000Z',
        },
        {
          eventId: 'evt-2',
          tenantId: 'tenant-1',
          userId: 'user-1',
          eventType: 'heartbeat',
          ts: '2026-02-09T23:59:59.999Z',
        },
        {
          eventId: 'evt-3',
          tenantId: 'tenant-1',
          userId: 'user-1',
          eventType: 'heartbeat',
          ts: '2026-02-10T00:00:00.000Z',
        },
      ];

      const service = new StatsService(createRepository(events), () => now);
      const result = await service.getMyToday('tenant-1', 'user-1');

      expect(result.interactions).toBe(2);
      expect(result.lastActiveAt).toBe('2026-02-09T23:59:59.999Z');
    });

    it('returns lastActiveAt from latest timestamp when input is unordered', async () => {
      const now = new Date('2026-02-09T15:00:00.000Z');
      const events: IngestEventDto[] = [
        {
          eventId: 'evt-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          eventType: 'heartbeat',
          ts: '2026-02-09T12:00:00.000Z',
        },
        {
          eventId: 'evt-2',
          tenantId: 'tenant-1',
          userId: 'user-1',
          eventType: 'heartbeat',
          ts: '2026-02-09T08:00:00.000Z',
        },
        {
          eventId: 'evt-3',
          tenantId: 'tenant-1',
          userId: 'user-1',
          eventType: 'heartbeat',
          ts: '2026-02-09T13:15:00.000Z',
        },
      ];

      const service = new StatsService(createRepository(events), () => now);

      expect((await service.getMyToday('tenant-1', 'user-1')).lastActiveAt).toBe('2026-02-09T13:15:00.000Z');
    });

    it('returns zero interactions and null lastActiveAt on empty data', async () => {
      const now = new Date('2026-02-09T15:00:00.000Z');
      const service = new StatsService(createRepository([]), () => now);

      expect(await service.getMyToday('tenant-1', 'user-1')).toEqual({
        interactions: 0,
        lastActiveAt: null,
        heatmap: [],
      });
    });
  });

  describe('getTeamTrend', () => {
    it('counts only events inside 7-day window and ignores invalid ts', async () => {
      const now = new Date('2026-02-09T15:00:00.000Z');
      const events: IngestEventDto[] = [
        {
          eventId: 'evt-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          eventType: 'heartbeat',
          ts: '2026-02-03T01:00:00.000Z',
        },
        {
          eventId: 'evt-2',
          tenantId: 'tenant-1',
          userId: 'user-2',
          eventType: 'heartbeat',
          ts: '2026-02-09T10:00:00.000Z',
        },
        {
          eventId: 'evt-3',
          tenantId: 'tenant-1',
          userId: 'user-3',
          eventType: 'heartbeat',
          ts: 'not-a-date',
        },
        {
          eventId: 'evt-4',
          tenantId: 'tenant-1',
          userId: 'user-4',
          eventType: 'heartbeat',
          ts: '2026-02-02T23:59:59.999Z',
        },
        {
          eventId: 'evt-5',
          tenantId: 'tenant-1',
          userId: 'user-5',
          eventType: 'heartbeat',
          ts: '2026-02-10T00:00:00.000Z',
        },
      ];

      const service = new StatsService(createRepository(events), () => now);

      expect(await service.getTeamTrend('tenant-1')).toEqual([
        { date: '2026-02-03', interactions: 1 },
        { date: '2026-02-04', interactions: 0 },
        { date: '2026-02-05', interactions: 0 },
        { date: '2026-02-06', interactions: 0 },
        { date: '2026-02-07', interactions: 0 },
        { date: '2026-02-08', interactions: 0 },
        { date: '2026-02-09', interactions: 1 },
      ]);
    });

    it('returns a 7-day zero-filled structure for empty data', async () => {
      const now = new Date('2026-02-09T15:00:00.000Z');
      const service = new StatsService(createRepository([]), () => now);

      expect(await service.getTeamTrend('tenant-1')).toEqual([
        { date: '2026-02-03', interactions: 0 },
        { date: '2026-02-04', interactions: 0 },
        { date: '2026-02-05', interactions: 0 },
        { date: '2026-02-06', interactions: 0 },
        { date: '2026-02-07', interactions: 0 },
        { date: '2026-02-08', interactions: 0 },
        { date: '2026-02-09', interactions: 0 },
      ]);
    });
  });

  describe('getTeamMembers', () => {
    it('aggregates members, heatmap, and summary for today events', async () => {
      const now = new Date('2026-02-09T15:00:00.000Z');
      const events: IngestEventDto[] = [
        { eventId: 'e1', tenantId: 'tenant-1', userId: 'user-a', ts: '2026-02-09T14:58:00.000Z' },
        { eventId: 'e2', tenantId: 'tenant-1', userId: 'user-a', ts: '2026-02-09T14:59:00.000Z' },
        { eventId: 'e3', tenantId: 'tenant-1', userId: 'user-b', ts: '2026-02-09T10:00:00.000Z' },
        { eventId: 'e4', tenantId: 'tenant-1', userId: 'user-c', ts: '2026-02-08T23:00:00.000Z' },
      ];

      const service = new StatsService(createRepository(events), () => now);
      const result = await service.getTeamMembers('tenant-1');

      expect(result.members).toHaveLength(2);
      expect(result.members[0]).toEqual({
        userId: 'user-a',
        interactions: 2,
        lastActiveAt: '2026-02-09T14:59:00.000Z',
        status: 'active',
      });
      expect(result.members[1]).toEqual({
        userId: 'user-b',
        interactions: 1,
        lastActiveAt: '2026-02-09T10:00:00.000Z',
        status: 'offline',
      });

      expect(result.summary).toEqual({
        totalInteractions: 3,
        activeMembers: 1,
        peakHour: 14,
      });

      expect(result.heatmap).toHaveLength(24);
      expect(result.heatmap[10]).toEqual({ hour: 10, interactions: 1 });
      expect(result.heatmap[14]).toEqual({ hour: 14, interactions: 2 });
      expect(result.heatmap[0]).toEqual({ hour: 0, interactions: 0 });
    });

    it('assigns idle status for 5-15 min inactive users', async () => {
      const now = new Date('2026-02-09T15:10:00.000Z');
      const events: IngestEventDto[] = [
        { eventId: 'e1', tenantId: 'tenant-1', userId: 'user-a', ts: '2026-02-09T15:03:00.000Z' },
      ];

      const service = new StatsService(createRepository(events), () => now);
      const result = await service.getTeamMembers('tenant-1');

      expect(result.members[0].status).toBe('idle');
    });

    it('returns empty members and null peakHour on empty data', async () => {
      const now = new Date('2026-02-09T15:00:00.000Z');
      const service = new StatsService(createRepository([]), () => now);
      const result = await service.getTeamMembers('tenant-1');

      expect(result.members).toEqual([]);
      expect(result.summary).toEqual({ totalInteractions: 0, activeMembers: 0, peakHour: null });
      expect(result.heatmap).toHaveLength(24);
      expect(result.heatmap.every((h) => h.interactions === 0)).toBe(true);
    });

    it('sorts members by interactions descending', async () => {
      const now = new Date('2026-02-09T15:00:00.000Z');
      const events: IngestEventDto[] = [
        { eventId: 'e1', tenantId: 'tenant-1', userId: 'user-low', ts: '2026-02-09T10:00:00.000Z' },
        { eventId: 'e2', tenantId: 'tenant-1', userId: 'user-high', ts: '2026-02-09T10:00:00.000Z' },
        { eventId: 'e3', tenantId: 'tenant-1', userId: 'user-high', ts: '2026-02-09T11:00:00.000Z' },
        { eventId: 'e4', tenantId: 'tenant-1', userId: 'user-high', ts: '2026-02-09T12:00:00.000Z' },
      ];

      const service = new StatsService(createRepository(events), () => now);
      const result = await service.getTeamMembers('tenant-1');

      expect(result.members[0].userId).toBe('user-high');
      expect(result.members[1].userId).toBe('user-low');
    });
  });
});
