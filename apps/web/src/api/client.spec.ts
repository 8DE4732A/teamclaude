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
      return new Response(JSON.stringify({ interactions: 7, lastActiveAt: '2026-02-09T08:00:00.000Z' }), {
        status: 200,
      });
    }) as typeof fetch;

    const client = createApiClient({ baseUrl: 'http://localhost:3000', fetchImpl });

    await expect(client.getOfficeMap()).resolves.toEqual({ mapId: 'map-1' });
    await expect(client.getMe()).resolves.toEqual({ id: 'user-1', name: 'Alice' });
    await expect(client.getTodayStats()).resolves.toEqual({
      interactions: 7,
      lastActiveAt: '2026-02-09T08:00:00.000Z',
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(1, 'http://localhost:3000/v1/office/map');
    expect(fetchImpl).toHaveBeenNthCalledWith(2, 'http://localhost:3000/v1/me');
    expect(fetchImpl).toHaveBeenNthCalledWith(3, 'http://localhost:3000/v1/stats/me/today');
  });

  it('throws on non-2xx responses', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad request', { status: 400, statusText: 'Bad Request' })) as typeof fetch;
    const client = createApiClient({ fetchImpl });

    await expect(client.getMe()).rejects.toThrow('Request failed: 400 Bad Request');
  });
});
