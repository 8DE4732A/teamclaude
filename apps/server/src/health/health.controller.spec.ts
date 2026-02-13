import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { AppModule } from '../app.module';
import { REDIS } from '../database/database.module';

describe('HealthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue({ close: async () => {} })
      .overrideProvider(getModelToken('EventRaw'))
      .useValue({})
      .overrideProvider(getModelToken('EventDedup'))
      .useValue({})
      .overrideProvider(getModelToken('User'))
      .useValue({})
      .overrideProvider(REDIS)
      .useValue({
        hset: async () => {},
        hget: async () => null,
        hgetall: async () => ({}),
        expire: async () => 1,
        scan: async () => ['0', []],
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns ok status', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
