export interface OfficeDeskResponse {
  id: string;
  gridX: number;
  gridY: number;
  seatX: number;
  seatY: number;
}

export interface OfficeMapResponse {
  mapId: string;
  name?: string;
  gridWidth: number;
  gridHeight: number;
  desks: OfficeDeskResponse[];
  spawnPoint: { x: number; y: number };
}

export interface MeResponse {
  id: string;
  name: string;
  seatId?: string;
  avatarPresetId?: string;
}

export interface HourlyInteractions {
  hour: number;
  interactions: number;
}

export interface DailyInteractions {
  date: string;
  interactions: number;
}

export interface TodayStatsResponse {
  interactions: number;
  lastActiveAt: string | null;
  heatmap: HourlyInteractions[];
}

export interface TeamMemberStats {
  userId: string;
  interactions: number;
  lastActiveAt: string | null;
  status: 'active' | 'idle' | 'offline';
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

export interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
}

export interface ApiClient {
  getOfficeMap(): Promise<OfficeMapResponse>;
  getMe(): Promise<MeResponse>;
  getTodayStats(): Promise<TodayStatsResponse>;
  getTeamTrend(): Promise<DailyInteractions[]>;
  getTeamMembers(): Promise<TeamMembersResponse>;
  checkAuth(): Promise<AuthUser>;
}

interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? '';

  const request = async <T>(path: string): Promise<T> => {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  };

  return {
    getOfficeMap: () => request<OfficeMapResponse>('/v1/office/map'),
    getMe: () => request<MeResponse>('/v1/me'),
    getTodayStats: () => request<TodayStatsResponse>('/v1/stats/me/today'),
    getTeamTrend: () => request<DailyInteractions[]>('/v1/stats/team/trend'),
    getTeamMembers: () => request<TeamMembersResponse>('/v1/stats/team/members'),
    checkAuth: () => request<AuthUser>('/auth/me'),
  };
}
