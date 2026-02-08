import { Injectable } from '@nestjs/common';

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

@Injectable()
export class PresenceService {
  private readonly records = new Map<string, PresenceRecord>();
  private broadcastConsumer?: PresenceBroadcastConsumer;

  registerBroadcastConsumer(consumer: PresenceBroadcastConsumer): void {
    this.broadcastConsumer = consumer;
  }

  onEvent(tenantId: string, userId: string, at: Date = new Date()): void {
    const record = this.getOrCreateRecord(tenantId, userId);
    const previousState = record.state;
    record.lastEventAt = at;
    record.state = PresenceState.Coding;

    this.emitStateChangedIfNeeded(record, previousState, at);
  }

  onHeartbeat(tenantId: string, userId: string, at: Date = new Date()): void {
    const record = this.getOrCreateRecord(tenantId, userId);
    const previousState = record.state;
    record.lastHeartbeatAt = at;
    record.state = this.computeState(record, at);

    this.emitStateChangedIfNeeded(record, previousState, at);
  }

  tick(now: Date): void {
    for (const record of this.records.values()) {
      const previousState = record.state;
      record.state = this.computeState(record, now);
      this.emitStateChangedIfNeeded(record, previousState, now);
    }
  }

  getState(tenantId: string, userId: string): PresenceState {
    return this.records.get(this.getKey(tenantId, userId))?.state ?? PresenceState.Offline;
  }

  private getOrCreateRecord(tenantId: string, userId: string): PresenceRecord {
    const key = this.getKey(tenantId, userId);
    const existing = this.records.get(key);

    if (existing) {
      return existing;
    }

    const created: PresenceRecord = {
      tenantId,
      userId,
      state: PresenceState.Offline,
    };
    this.records.set(key, created);
    return created;
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

  private emitStateChangedIfNeeded(record: PresenceRecord, previousState: PresenceState, at: Date): void {
    if (record.state === previousState) {
      return;
    }

    this.broadcastConsumer?.onStateChanged({
      tenantId: record.tenantId,
      userId: record.userId,
      state: record.state,
      occurredAt: at.toISOString(),
    });
  }

  private getKey(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`;
  }
}
