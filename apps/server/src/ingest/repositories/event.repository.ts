import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { EventDedup } from '../../database/schemas/event-dedup.schema';
import { EventRaw } from '../../database/schemas/event-raw.schema';
import { IngestEventDto } from '../dto/ingest-events.dto';

@Injectable()
export class EventRepository {
  constructor(
    @InjectModel(EventRaw.name) private readonly eventRawModel: Model<EventRaw>,
    @InjectModel(EventDedup.name) private readonly eventDedupModel: Model<EventDedup>,
  ) {}

  async hasEventId(tenantId: string, eventId: string): Promise<boolean> {
    const scopedEventId = this.toScopedKey(tenantId, eventId);
    const existing = await this.eventDedupModel.exists({ scopedEventId });
    return existing !== null;
  }

  async save(event: IngestEventDto): Promise<void> {
    const scopedEventId = this.toScopedKey(event.tenantId ?? '', event.eventId);

    await this.eventRawModel.create({
      tenantId: event.tenantId,
      userId: event.userId,
      eventId: event.eventId,
      deviceId: event.deviceId,
      eventType: event.eventType,
      ts: event.ts,
      durationMs: event.durationMs,
      tokenUsage: event.tokenUsage,
      projectHash: event.projectHash,
    });

    await this.eventDedupModel
      .updateOne({ scopedEventId }, { $setOnInsert: { scopedEventId, createdAt: new Date() } }, { upsert: true })
      .catch(() => {
        /* ignore duplicate key */
      });
  }

  async listByTenant(tenantId: string): Promise<IngestEventDto[]> {
    const docs = await this.eventRawModel.find({ tenantId }).lean();
    return docs.map((doc) => this.toDto(doc));
  }

  async listByTenantUser(tenantId: string, userId: string): Promise<IngestEventDto[]> {
    const docs = await this.eventRawModel.find({ tenantId, userId }).lean();
    return docs.map((doc) => this.toDto(doc));
  }

  private toDto(doc: Record<string, unknown>): IngestEventDto {
    return {
      eventId: doc.eventId as string,
      tenantId: doc.tenantId as string,
      userId: doc.userId as string,
      deviceId: doc.deviceId as string | undefined,
      eventType: doc.eventType as string | undefined,
      ts: doc.ts as string | undefined,
      durationMs: doc.durationMs as number | undefined,
      tokenUsage: doc.tokenUsage as number | undefined,
      projectHash: doc.projectHash as string | undefined,
    };
  }

  private toScopedKey(tenantId: string, eventId: string): string {
    return `${tenantId}:${eventId}`;
  }
}
