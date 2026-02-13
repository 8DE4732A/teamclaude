import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from './client';

describe('api client', () => {
  it('parses successful responses using injected baseUrl and fetchImpl', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/v1/office/map')) {
        return new Response(JSON.stringify({ mapId: 'map-1' }), { status: 200 });
      }
      if (url.endsWith('/v1/me')) {
        return new Response(JSON.stringify({ id: 'user-1', name: 'Alice' }), { status: 200 });
      }
      return new Response(JSON.stringify({ interactions: 7, lastActiveAt: '2026-02-09T08:00:00.000Z', heatmap: [] }), {
        status: 200,
      });
    }) as typeof fetch;

    const client = createApiClient({ baseUrl: 'http://localhost:3000', fetchImpl });

    await expect(client.getOfficeMap()).resolves.toEqual({ mapId: 'map-1' });
    await expect(client.getMe()).resolves.toEqual({ id: 'user-1', name: 'Alice' });
    await expect(client.getTodayStats()).resolves.toEqual({
      interactions: 7,
      lastActiveAt: '2026-02-09T08:00:00.000Z',
      heatmap: [],
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(1, 'http://localhost:3000/v1/office/map', { credentials: 'include' });
    expect(fetchImpl).toHaveBeenNthCalledWith(2, 'http://localhost:3000/v1/me', { credentials: 'include' });
    expect(fetchImpl).toHaveBeenNthCalledWith(3, 'http://localhost:3000/v1/stats/me/today', { credentials: 'include' });
  });

  it('throws on non-2xx responses', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad request', { status: 400, statusText: 'Bad Request' })) as typeof fetch;
    const client = createApiClient({ fetchImpl });

    await expect(client.getMe()).rejects.toThrow('Request failed: 400 Bad Request');
  });

  it('checkAuth returns user info on success', async () => {
    const user = { sub: 'auth0|123', email: 'alice@example.com', name: 'Alice' };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(user), { status: 200 })) as typeof fetch;
    const client = createApiClient({ baseUrl: 'http://localhost:3000', fetchImpl });

    await expect(client.checkAuth()).resolves.toEqual(user);
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3000/auth/me', { credentials: 'include' });
  });

  it('checkAuth throws on 401', async () => {
    const fetchImpl = vi.fn(async () => new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })) as typeof fetch;
    const client = createApiClient({ fetchImpl });

    await expect(client.checkAuth()).rejects.toThrow('Request failed: 401 Unauthorized');
  });

  it('getTeamTrend fetches /v1/stats/team/trend', async () => {
    const trendData = [{ date: '2026-02-09', interactions: 5 }];
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(trendData), { status: 200 })) as typeof fetch;
    const client = createApiClient({ baseUrl: 'http://localhost:3000', fetchImpl });

    await expect(client.getTeamTrend()).resolves.toEqual(trendData);
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3000/v1/stats/team/trend', { credentials: 'include' });
  });

  it('getTeamMembers fetches /v1/stats/team/members', async () => {
    const membersData = {
      members: [{ userId: 'u1', interactions: 3, lastActiveAt: null, status: 'offline' }],
      summary: { totalInteractions: 3, activeMembers: 0, peakHour: null },
      heatmap: [],
    };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(membersData), { status: 200 })) as typeof fetch;
    const client = createApiClient({ baseUrl: 'http://localhost:3000', fetchImpl });

    await expect(client.getTeamMembers()).resolves.toEqual(membersData);
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3000/v1/stats/team/members', { credentials: 'include' });
  });
});
