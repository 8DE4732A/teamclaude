import type { HourlyInteractions, DailyInteractions, TeamMemberStats } from '../api/client';

export type { HourlyInteractions, DailyInteractions, TeamMemberStats };

export interface OverviewData {
  totalInteractions: number;
  activeMembers: number;
  peakHour: number | null;
}
