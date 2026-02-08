import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { AppModule } from '../app.module';

describe('Tenant context guard (e2e)', () => {
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

  it('POST /v1/ingest/events returns 401 when x-tenant-id is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/ingest/events')
      .set('x-user-id', 'user-1')
      .send({});

    expect(response.status).toBe(401);
  });

  it('POST /v1/ingest/events returns 401 when x-user-id is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/ingest/events')
      .set('x-tenant-id', 'tenant-1')
      .send({});

    expect(response.status).toBe(401);
  });

  it('POST /v1/ingest/events passes when tenant context headers are complete', async () => {
    const payload = { event: 'heartbeat' };

    const response = await request(app.getHttpServer())
      .post('/v1/ingest/events')
      .set('x-tenant-id', 'tenant-1')
      .set('x-user-id', 'user-1')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      accepted: true,
      tenantId: 'tenant-1',
      userId: 'user-1',
      payload,
    });
  });
});
