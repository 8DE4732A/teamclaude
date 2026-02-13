import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import session from 'express-session';

import { AppModule } from '../app.module';
import { REDIS } from '../database/database.module';
import { AuthService } from './auth.service';
import { sign, verify } from './jwt.util';

const JWT_SECRET = 'test-jwt-secret';

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

describe('Tenant context guard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue({
        onModuleInit: () => {},
        generateState: () => 'test-state',
        generateCodeVerifier: async () => ({
          codeVerifier: 'test-verifier',
          codeChallenge: 'test-challenge',
        }),
        getAuthorizationUrl: (_state: string, _codeChallenge: string, _redirectUri?: string) =>
          'https://auth0.example.com/authorize?state=test-state',
        getLogoutUrl: (returnTo: string) =>
          `https://auth0.example.com/v2/logout?returnTo=${encodeURIComponent(returnTo)}`,
        signCliToken: (user: { sub: string; email?: string; name?: string }) =>
          sign(
            { sub: user.sub, email: user.email, name: user.name, tenantId: 'default' },
            JWT_SECRET,
          ),
        verifyCliToken: (token: string) => {
          return verify(token, JWT_SECRET);
        },
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

    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    delete process.env.JWT_SECRET;
    await app?.close();
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
    const payload = { eventId: 'evt-1', eventType: 'heartbeat' };

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
      payload: {
        ...payload,
        tenantId: 'tenant-1',
        userId: 'user-1',
      },
    });
  });

  it('GET /auth/me returns 401 when not authenticated', async () => {
    const response = await request(app.getHttpServer()).get('/auth/me');

    expect(response.status).toBe(401);
  });

  it('GET /auth/login redirects to Auth0', async () => {
    const response = await request(app.getHttpServer()).get('/auth/login');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('auth0.example.com');
  });

  // ── CLI Auth tests ──────────────────────────────────────────────

  it('GET /auth/cli?port=9876 redirects to Auth0', async () => {
    const response = await request(app.getHttpServer()).get('/auth/cli?port=9876');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('auth0.example.com');
  });

  it('GET /auth/cli returns 400 when port is missing', async () => {
    const response = await request(app.getHttpServer()).get('/auth/cli');

    expect(response.status).toBe(400);
  });

  it('GET /auth/cli returns 400 when port is out of range', async () => {
    const response = await request(app.getHttpServer()).get('/auth/cli?port=80');

    expect(response.status).toBe(400);
  });

  it('GET /auth/cli returns 400 when port is not a number', async () => {
    const response = await request(app.getHttpServer()).get('/auth/cli?port=abc');

    expect(response.status).toBe(400);
  });

  // ── Bearer token tests ──────────────────────────────────────────

  it('POST /v1/ingest/events passes with valid Bearer token', async () => {
    const token = sign(
      { sub: 'cli-user-1', email: 'cli@example.com', tenantId: 'tenant-jwt' },
      JWT_SECRET,
    );

    const payload = { eventId: 'evt-2', eventType: 'heartbeat' };

    const response = await request(app.getHttpServer())
      .post('/v1/ingest/events')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.tenantId).toBe('tenant-jwt');
    expect(response.body.userId).toBe('cli-user-1');
  });

  it('POST /v1/ingest/events returns 401 with expired Bearer token', async () => {
    const token = sign(
      { sub: 'cli-user-1', tenantId: 'tenant-jwt' },
      JWT_SECRET,
      -1, // expired
    );

    const response = await request(app.getHttpServer())
      .post('/v1/ingest/events')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(401);
  });

  it('POST /v1/ingest/events returns 401 with invalid Bearer token (no fallthrough)', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/ingest/events')
      .set('Authorization', 'Bearer invalid-token')
      .set('x-tenant-id', 'tenant-1')
      .set('x-user-id', 'user-1')
      .send({});

    // Should NOT fall through to header strategy when Bearer is present but invalid
    expect(response.status).toBe(401);
  });
});
