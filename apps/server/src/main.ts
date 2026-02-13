import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import RedisStore from 'connect-redis';
import session from 'express-session';
import Redis from 'ioredis';

import { AppModule } from './app.module';

const DEFAULT_PORT = 3000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function resolvePort(portValue: string | undefined): number {
  const parsedPort = Number.parseInt(portValue ?? '', 10);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    return DEFAULT_PORT;
  }

  return parsedPort;
}

function createSessionStore(): session.Store | undefined {
  try {
    const redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
    });
    redisClient.connect().catch(() => {
      /* handled below via status check */
    });
    const store = new RedisStore({ client: redisClient });
    console.log('Session store: Redis');
    return store;
  } catch {
    console.warn('Redis session store unavailable, falling back to MemoryStore');
    return undefined;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  const store = createSessionStore();

  app.use(
    session({
      ...(store ? { store } : {}),
      secret: process.env.SESSION_SECRET ?? 'dev-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: ONE_DAY_MS,
      },
    }),
  );

  const port = resolvePort(process.env.PORT);
  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
