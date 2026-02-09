import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { AppModule } from '../app.module';

describe('StatsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
        ts: '2026-02-09T08:00:00.000Z',
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
});
