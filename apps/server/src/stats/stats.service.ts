import { Inject, Injectable } from '@nestjs/common';

import { EventRepository } from '../ingest/repositories/event.repository';
import type { TeamMembersResponse } from './dto/team-member-stats.dto';

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

  async getMyToday(tenantId: string, userId: string): Promise<{
    interactions: number;
    lastActiveAt: string | null;
    heatmap: HourlyInteractions[];
  }> {
    const events = await this.eventRepository.listByTenantUser(tenantId, userId);
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

  async getTeamTrend(tenantId: string): Promise<DailyInteractions[]> {
    const events = await this.eventRepository.listByTenant(tenantId);
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

  async getTeamMembers(tenantId: string): Promise<TeamMembersResponse> {
    const events = await this.eventRepository.listByTenant(tenantId);
    const now = this.nowProvider();
    const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const todayEvents = events.filter((event) => {
      if (!event.ts) return false;
      const time = new Date(event.ts).getTime();
      if (Number.isNaN(time)) return false;
      return time >= todayStart && time < todayEnd;
    });

    const userMap = new Map<string, { interactions: number; lastActiveAt: string | null }>();
    for (const event of todayEvents) {
      const userId = event.userId ?? 'unknown';
      const existing = userMap.get(userId);
      if (!existing) {
        userMap.set(userId, { interactions: 1, lastActiveAt: event.ts ?? null });
      } else {
        existing.interactions += 1;
        if (event.ts && (!existing.lastActiveAt || event.ts > existing.lastActiveAt)) {
          existing.lastActiveAt = event.ts;
        }
      }
    }

    const nowMs = now.getTime();
    const members = [...userMap.entries()]
      .map(([userId, data]) => {
        let status: 'active' | 'idle' | 'offline' = 'offline';
        if (data.lastActiveAt) {
          const diffMs = nowMs - new Date(data.lastActiveAt).getTime();
          const diffMin = diffMs / 60_000;
          if (diffMin < 5) status = 'active';
          else if (diffMin < 15) status = 'idle';
        }
        return { userId, interactions: data.interactions, lastActiveAt: data.lastActiveAt, status };
      })
      .sort((a, b) => b.interactions - a.interactions);

    const hourlyCounts = new Map<number, number>();
    for (const event of todayEvents) {
      if (!event.ts) continue;
      const hour = new Date(event.ts).getUTCHours();
      hourlyCounts.set(hour, (hourlyCounts.get(hour) ?? 0) + 1);
    }

    const heatmap: { hour: number; interactions: number }[] = [];
    for (let h = 0; h < 24; h++) {
      heatmap.push({ hour: h, interactions: hourlyCounts.get(h) ?? 0 });
    }

    const totalInteractions = todayEvents.length;
    const activeMembers = members.filter((m) => m.status === 'active').length;
    const peakEntry = heatmap.reduce<{ hour: number; interactions: number } | null>(
      (best, entry) => (!best || entry.interactions > best.interactions ? entry : best),
      null,
    );
    const peakHour = peakEntry && peakEntry.interactions > 0 ? peakEntry.hour : null;

    return {
      members,
      summary: { totalInteractions, activeMembers, peakHour },
      heatmap,
    };
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
