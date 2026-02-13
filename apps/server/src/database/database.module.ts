import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import Redis from 'ioredis';

import { EventDedup, EventDedupSchema } from './schemas/event-dedup.schema';
import { EventRaw, EventRawSchema } from './schemas/event-raw.schema';
import { User, UserSchema } from './schemas/user.schema';

export const REDIS = 'REDIS';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/teamclaude',
        serverSelectionTimeoutMS: 5000,
      }),
    }),
    MongooseModule.forFeature([
      { name: EventRaw.name, schema: EventRawSchema },
      { name: EventDedup.name, schema: EventDedupSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [
    {
      provide: REDIS,
      useFactory: async () => {
        const redis = new Redis(
          process.env.REDIS_URL ?? 'redis://localhost:6379',
          { lazyConnect: true },
        );
        try {
          await redis.connect();
        } catch (error) {
          console.warn('Redis connection failed, some features may be degraded:', error);
        }
        return redis;
      },
    },
  ],
  exports: [MongooseModule, REDIS],
})
export class DatabaseModule {}
