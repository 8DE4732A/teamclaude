import { Inject, Injectable } from '@nestjs/common';

import { EventRepository } from '../ingest/repositories/event.repository';

interface HourlyInteractions {
  hour: number;
  interactions: number;
}

interface DailyInteractions {
  date: string;
  interactions: number;
}

@Injectable()
export class StatsService {
  constructor(
    @Inject(EventRepository) private readonly eventRepository: EventRepository,
    private readonly nowProvider: () => Date = () => new Date(),
  ) {}

  getMyToday(tenantId: string, userId: string): {
    interactions: number;
    lastActiveAt: string | null;
    heatmap: HourlyInteractions[];
  } {
    const events = this.eventRepository.listByTenantUser(tenantId, userId);
    const todayEvents = this.filterToday(events.map((event) => event.ts).filter((ts): ts is string => !!ts));

    const interactions = todayEvents.length;
    const lastActiveAt = interactions > 0 ? todayEvents[todayEvents.length - 1] : null;

    const hourlyCounts = new Map<number, number>();
    for (const ts of todayEvents) {
      const hour = new Date(ts).getUTCHours();
      hourlyCounts.set(hour, (hourlyCounts.get(hour) ?? 0) + 1);
    }

    const heatmap = [...hourlyCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({ hour, interactions: count }));

    return {
      interactions,
      lastActiveAt,
      heatmap,
    };
  }

  getTeamTrend(tenantId: string): DailyInteractions[] {
    const events = this.eventRepository.listByTenant(tenantId);
    const now = this.nowProvider();
    const trendByDate = new Map<string, number>();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
      const dateKey = date.toISOString().slice(0, 10);
      trendByDate.set(dateKey, 0);
    }

    for (const event of events) {
      if (!event.ts) {
        continue;
      }
      const eventDate = new Date(event.ts);
      if (Number.isNaN(eventDate.getTime())) {
        continue;
      }
      const dateKey = eventDate.toISOString().slice(0, 10);
      if (trendByDate.has(dateKey)) {
        trendByDate.set(dateKey, (trendByDate.get(dateKey) ?? 0) + 1);
      }
    }

    return [...trendByDate.entries()].map(([date, interactions]) => ({ date, interactions }));
  }

  private filterToday(timestamps: string[]): string[] {
    const now = this.nowProvider();
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const end = start + 24 * 60 * 60 * 1000;

    return timestamps
      .map((timestamp) => new Date(timestamp))
      .filter((date) => !Number.isNaN(date.getTime()))
      .filter((date) => {
        const time = date.getTime();
        return time >= start && time < end;
      })
      .sort((a, b) => a.getTime() - b.getTime())
      .map((date) => date.toISOString());
  }
}
