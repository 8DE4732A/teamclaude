import { Injectable } from '@nestjs/common';

export enum PresenceState {
  Coding = 'Coding',
  Idle = 'Idle',
  Offline = 'Offline',
}

interface PresenceRecord {
  state: PresenceState;
  lastEventAt?: Date;
  lastHeartbeatAt?: Date;
}

const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000;

@Injectable()
export class PresenceService {
  private readonly records = new Map<string, PresenceRecord>();

  onEvent(tenantId: string, userId: string, at: Date = new Date()): void {
    const record = this.getOrCreateRecord(tenantId, userId);
    record.lastEventAt = at;
    record.state = PresenceState.Coding;
  }

  onHeartbeat(tenantId: string, userId: string, at: Date = new Date()): void {
    const record = this.getOrCreateRecord(tenantId, userId);
    record.lastHeartbeatAt = at;
    record.state = this.computeState(record, at);
  }

  tick(now: Date): void {
    for (const record of this.records.values()) {
      record.state = this.computeState(record, now);
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

    if (record.lastHeartbeatAt) {
      return PresenceState.Idle;
    }

    return PresenceState.Offline;
  }

  private getKey(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`;
  }
}
