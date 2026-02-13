import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS } from '../database/database.module';

export enum PresenceState {
  Coding = 'Coding',
  Idle = 'Idle',
  Offline = 'Offline',
}

interface PresenceRecord {
  tenantId: string;
  userId: string;
  state: PresenceState;
  lastEventAt?: Date;
  lastHeartbeatAt?: Date;
}

export interface PresenceStateChangedEvent {
  tenantId: string;
  userId: string;
  state: PresenceState;
  occurredAt: string;
}

export interface PresenceTargetChangedEvent {
  tenantId: string;
  userId: string;
  targetUserId: string | null;
  occurredAt: string;
}

export interface PresenceBroadcastConsumer {
  onStateChanged(event: PresenceStateChangedEvent): void;
  onTargetChanged(event: PresenceTargetChangedEvent): void;
}

const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000;
const PRESENCE_TTL_SECONDS = 20 * 60; // 20 minutes

@Injectable()
export class PresenceService {
  private broadcastConsumer?: PresenceBroadcastConsumer;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  registerBroadcastConsumer(consumer: PresenceBroadcastConsumer): void {
    this.broadcastConsumer = consumer;
  }

  async onEvent(tenantId: string, userId: string, at: Date = new Date()): Promise<void> {
    const key = this.getRedisKey(tenantId, userId);
    const previousState = await this.getStateFromRedis(key);

    await this.redis.hset(key, {
      tenantId,
      userId,
      state: PresenceState.Coding,
      lastEventAt: at.toISOString(),
    });
    await this.redis.expire(key, PRESENCE_TTL_SECONDS);

    this.emitStateChangedIfNeeded(
      { tenantId, userId, state: PresenceState.Coding },
      previousState,
      at,
    );
  }

  async onHeartbeat(tenantId: string, userId: string, at: Date = new Date()): Promise<void> {
    const key = this.getRedisKey(tenantId, userId);
    const record = await this.getRecordFromRedis(key, tenantId, userId);
    const previousState = record.state;

    record.lastHeartbeatAt = at;
    const newState = this.computeState(record, at);

    await this.redis.hset(key, {
      tenantId,
      userId,
      state: newState,
      lastHeartbeatAt: at.toISOString(),
      ...(record.lastEventAt ? { lastEventAt: record.lastEventAt.toISOString() } : {}),
    });
    await this.redis.expire(key, PRESENCE_TTL_SECONDS);

    this.emitStateChangedIfNeeded(
      { tenantId, userId, state: newState },
      previousState,
      at,
    );
  }

  async tick(now: Date): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        'presence:user:*',
        'COUNT',
        100,
      );
      cursor = nextCursor;

      for (const key of keys) {
        const data = await this.redis.hgetall(key);
        if (!data.tenantId || !data.userId) continue;

        const record: PresenceRecord = {
          tenantId: data.tenantId,
          userId: data.userId,
          state: (data.state as PresenceState) ?? PresenceState.Offline,
          lastEventAt: data.lastEventAt ? new Date(data.lastEventAt) : undefined,
          lastHeartbeatAt: data.lastHeartbeatAt ? new Date(data.lastHeartbeatAt) : undefined,
        };

        const previousState = record.state;
        const newState = this.computeState(record, now);

        if (newState !== previousState) {
          await this.redis.hset(key, 'state', newState);
          this.emitStateChangedIfNeeded(
            { tenantId: record.tenantId, userId: record.userId, state: newState },
            previousState,
            now,
          );
        }
      }
    } while (cursor !== '0');
  }

  async getState(tenantId: string, userId: string): Promise<PresenceState> {
    const key = this.getRedisKey(tenantId, userId);
    return this.getStateFromRedis(key);
  }

  private async getStateFromRedis(key: string): Promise<PresenceState> {
    const state = await this.redis.hget(key, 'state');
    return (state as PresenceState) ?? PresenceState.Offline;
  }

  private async getRecordFromRedis(
    key: string,
    tenantId: string,
    userId: string,
  ): Promise<PresenceRecord> {
    const data = await this.redis.hgetall(key);

    return {
      tenantId,
      userId,
      state: (data.state as PresenceState) ?? PresenceState.Offline,
      lastEventAt: data.lastEventAt ? new Date(data.lastEventAt) : undefined,
      lastHeartbeatAt: data.lastHeartbeatAt ? new Date(data.lastHeartbeatAt) : undefined,
    };
  }

  private computeState(record: PresenceRecord, now: Date): PresenceState {
    if (record.lastHeartbeatAt && now.getTime() - record.lastHeartbeatAt.getTime() > OFFLINE_THRESHOLD_MS) {
      return PresenceState.Offline;
    }

    if (record.lastEventAt) {
      if (now.getTime() - record.lastEventAt.getTime() > IDLE_THRESHOLD_MS) {
        return PresenceState.Idle;
      }

      return PresenceState.Coding;
    }

    return PresenceState.Offline;
  }

  private emitStateChangedIfNeeded(
    current: { tenantId: string; userId: string; state: PresenceState },
    previousState: PresenceState,
    at: Date,
  ): void {
    if (current.state === previousState) {
      return;
    }

    const occurredAt = at.toISOString();

    this.broadcastConsumer?.onStateChanged({
      tenantId: current.tenantId,
      userId: current.userId,
      state: current.state,
      occurredAt,
    });

    this.broadcastConsumer?.onTargetChanged({
      tenantId: current.tenantId,
      userId: current.userId,
      targetUserId: current.state === PresenceState.Coding ? current.userId : null,
      occurredAt,
    });
  }

  private getRedisKey(tenantId: string, userId: string): string {
    return `presence:user:${tenantId}:${userId}`;
  }
}
