import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { AppModule } from '../app.module';
import { REDIS } from '../database/database.module';

function createMockUserModel() {
  const store = new Map<string, Record<string, unknown>>();

  const model = {
    findOne: (filter: Record<string, string>) => ({
      lean: async () => store.get(`${filter.tenantId}:${filter.userId}`) ?? null,
    }),
    findOneAndUpdate: async (
      filter: Record<string, string>,
      update: Record<string, unknown>,
      _opts: unknown,
    ) => {
      const key = `${filter.tenantId}:${filter.userId}`;
      const current = store.get(key) ?? { tenantId: filter.tenantId, userId: filter.userId };
      const $set = (update as any).$set ?? {};
      const merged = { ...current, ...$set };
      store.set(key, merged);
      return merged;
    },
  };

  return model;
}

function createMockRedis() {
  return {
    hset: async () => {},
    hget: async () => null,
    hgetall: async () => ({}),
    expire: async () => 1,
    scan: async () => ['0', []],
  };
}

describe('OfficeController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue({ close: async () => {} })
      .overrideProvider(getModelToken('EventRaw'))
      .useValue({ create: async () => ({}), find: () => ({ lean: async () => [] }) })
      .overrideProvider(getModelToken('EventDedup'))
      .useValue({ exists: async () => null, updateOne: () => ({ catch: () => {} }) })
      .overrideProvider(getModelToken('User'))
      .useValue(createMockUserModel())
      .overrideProvider(REDIS)
      .useValue(createMockRedis())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /v1/office/map returns map data', async () => {
    const response = await request(app.getHttpServer()).get('/v1/office/map');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 'default-office-map',
      gridWidth: 30,
      gridHeight: 20,
      desks: expect.arrayContaining([
        expect.objectContaining({ id: 'desk-1', gridX: 5, gridY: 4, seatX: 5, seatY: 5 }),
      ]),
      spawnPoint: { x: 15, y: 18 },
    });
  });

  it('POST /v1/me/seat returns 200 for valid seatId', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/me/seat')
      .set('x-tenant-id', 'tenant-1')
      .set('x-user-id', 'user-1')
      .send({ seatId: 'desk-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      tenantId: 'tenant-1',
      userId: 'user-1',
      seatId: 'desk-1',
    });
  });

  it('POST /v1/me/seat returns 400 for invalid seatId', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/me/seat')
      .set('x-tenant-id', 'tenant-1')
      .set('x-user-id', 'user-1')
      .send({ seatId: 'desk-not-exist' });

    expect(response.status).toBe(400);
  });

  it('POST /v1/me/avatar returns 200 for avatarPresetId', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/me/avatar')
      .set('x-tenant-id', 'tenant-1')
      .set('x-user-id', 'user-1')
      .send({ avatarPresetId: 'avatar-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      tenantId: 'tenant-1',
      userId: 'user-1',
      avatarPresetId: 'avatar-1',
    });
  });

  it('POST /v1/me/avatar returns 400 for empty avatarPresetId', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/me/avatar')
      .set('x-tenant-id', 'tenant-1')
      .set('x-user-id', 'user-1')
      .send({ avatarPresetId: '   ' });

    expect(response.status).toBe(400);
  });

  it('POST /v1/me/avatar returns 400 when avatarPresetId is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/me/avatar')
      .set('x-tenant-id', 'tenant-1')
      .set('x-user-id', 'user-1')
      .send({});

    expect(response.status).toBe(400);
  });

  it('GET /v1/me returns updated seat and avatar after writes', async () => {
    await request(app.getHttpServer())
      .post('/v1/me/seat')
      .set('x-tenant-id', 'tenant-2')
      .set('x-user-id', 'user-2')
      .send({ seatId: 'desk-2' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/me/avatar')
      .set('x-tenant-id', 'tenant-2')
      .set('x-user-id', 'user-2')
      .send({ avatarPresetId: 'avatar-2' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/v1/me')
      .set('x-tenant-id', 'tenant-2')
      .set('x-user-id', 'user-2');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      tenantId: 'tenant-2',
      userId: 'user-2',
      seatId: 'desk-2',
      avatarPresetId: 'avatar-2',
    });
  });

  it('POST /v1/me/avatar returns 401 without tenant headers', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/me/avatar')
      .send({ avatarPresetId: 'avatar-1' });

    expect(response.status).toBe(401);
  });
});
