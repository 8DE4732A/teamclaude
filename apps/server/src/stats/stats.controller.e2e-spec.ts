import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { AppModule } from '../app.module';
import { REDIS } from '../database/database.module';

function createMockEventRawModel() {
  const events: Record<string, unknown>[] = [];

  return {
    create: async (doc: Record<string, unknown>) => {
      events.push(doc);
      return doc;
    },
    find: (filter: Record<string, unknown>) => ({
      lean: async () =>
        events.filter((e) => {
          if (filter.tenantId && e.tenantId !== filter.tenantId) return false;
          if (filter.userId && e.userId !== filter.userId) return false;
          return true;
        }),
    }),
  };
}

function createMockEventDedupModel() {
  const seen = new Set<string>();

  return {
    exists: async (filter: { scopedEventId: string }) =>
      seen.has(filter.scopedEventId) ? { _id: 'exists' } : null,
    updateOne: (
      filter: { scopedEventId: string },
      _update: unknown,
      _opts: unknown,
    ) => {
      seen.add(filter.scopedEventId);
      return { catch: (fn: () => void) => fn };
    },
  };
}

function createMockRedis() {
  const store = new Map<string, Map<string, string>>();

  return {
    hset: async (key: string, ...args: unknown[]) => {
      if (!store.has(key)) store.set(key, new Map());
      const hash = store.get(key)!;
      if (args.length === 1 && typeof args[0] === 'object') {
        const obj = args[0] as Record<string, string>;
        for (const [field, value] of Object.entries(obj)) {
          hash.set(field, String(value));
        }
      } else if (args.length === 2) {
        hash.set(String(args[0]), String(args[1]));
      }
    },
    hget: async (key: string, field: string) => store.get(key)?.get(field) ?? null,
    hgetall: async (key: string) => {
      const hash = store.get(key);
      if (!hash || hash.size === 0) return {};
      const result: Record<string, string> = {};
      for (const [field, value] of hash) result[field] = value;
      return result;
    },
    expire: async () => 1,
    scan: async () => ['0', [...store.keys()].filter((k) => k.startsWith('presence:user:'))],
  };
}

describe('StatsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue({ close: async () => {} })
      .overrideProvider(getModelToken('EventRaw'))
      .useValue(createMockEventRawModel())
      .overrideProvider(getModelToken('EventDedup'))
      .useValue(createMockEventDedupModel())
      .overrideProvider(getModelToken('User'))
      .useValue({ findOne: () => ({ lean: async () => null }), findOneAndUpdate: async () => ({}) })
      .overrideProvider(REDIS)
      .useValue(createMockRedis())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 401 when tenant context is missing', async () => {
    const response = await request(app.getHttpServer()).get('/v1/stats/me/today');

    expect(response.status).toBe(401);
  });

  it('GET /v1/stats/me/today returns expected structure', async () => {
    const ingestResponse = await request(app.getHttpServer())
      .post('/v1/ingest/events')
      .set('x-tenant-id', 'tenant-stats')
      .set('x-user-id', 'user-stats')
      .send({
        eventId: 'evt-stats-1',
        eventType: 'heartbeat',
        ts: new Date().toISOString(),
      });

    expect(ingestResponse.status).toBe(201);

    const response = await request(app.getHttpServer())
      .get('/v1/stats/me/today')
      .set('x-tenant-id', 'tenant-stats')
      .set('x-user-id', 'user-stats');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      interactions: expect.any(Number),
      lastActiveAt: expect.anything(),
      heatmap: expect.any(Array),
    });
    expect(response.body.heatmap[0]).toEqual({
      hour: expect.any(Number),
      interactions: expect.any(Number),
    });
  });

  it('GET /v1/stats/team/trend returns expected structure', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/stats/team/trend')
      .set('x-tenant-id', 'tenant-stats')
      .set('x-user-id', 'user-stats');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(7);
    expect(response.body[0]).toEqual({
      date: expect.any(String),
      interactions: expect.any(Number),
    });
  });

  it('GET /v1/stats/team/members returns expected structure', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/stats/team/members')
      .set('x-tenant-id', 'tenant-stats')
      .set('x-user-id', 'user-stats');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      members: expect.any(Array),
      summary: {
        totalInteractions: expect.any(Number),
        activeMembers: expect.any(Number),
        peakHour: expect.anything(),
      },
      heatmap: expect.any(Array),
    });
    expect(response.body.heatmap).toHaveLength(24);
    expect(response.body.heatmap[0]).toEqual({
      hour: expect.any(Number),
      interactions: expect.any(Number),
    });
  });

  it('GET /v1/stats/team/members returns 401 without context', async () => {
    const response = await request(app.getHttpServer()).get('/v1/stats/team/members');

    expect(response.status).toBe(401);
  });
});
