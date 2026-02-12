export interface OfficeMapResponse {
  mapId: string;
  name?: string;
}

export interface MeResponse {
  id: string;
  name: string;
}

export interface TodayStatsResponse {
  interactions: number;
  lastActiveAt: string | null;
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
    checkAuth: () => request<AuthUser>('/auth/me'),
  };
}
