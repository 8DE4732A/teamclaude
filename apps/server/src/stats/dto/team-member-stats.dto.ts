export interface TeamMemberStats {
  userId: string;
  interactions: number;
  lastActiveAt: string | null;
  status: 'active' | 'idle' | 'offline';
}

export interface HourlyInteractions {
  hour: number;
  interactions: number;
}

export interface TeamMembersResponse {
  members: TeamMemberStats[];
  summary: {
    totalInteractions: number;
    activeMembers: number;
    peakHour: number | null;
  };
  heatmap: HourlyInteractions[];
}
