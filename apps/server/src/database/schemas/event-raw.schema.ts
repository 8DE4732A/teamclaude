import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'events_raw', timestamps: true })
export class EventRaw {
  @Prop({ type: String, required: true }) tenantId: string;
  @Prop({ type: String, required: true }) userId: string;
  @Prop({ type: String, required: true }) eventId: string;
  @Prop({ type: String }) deviceId?: string;
  @Prop({ type: String }) eventType?: string;
  @Prop({ type: String }) ts?: string;
  @Prop({ type: Number }) durationMs?: number;
  @Prop({ type: Number }) tokenUsage?: number;
  @Prop({ type: String }) projectHash?: string;
}

export type EventRawDocument = HydratedDocument<EventRaw>;

export const EventRawSchema = SchemaFactory.createForClass(EventRaw);

EventRawSchema.index({ tenantId: 1, userId: 1, ts: -1 });
EventRawSchema.index({ tenantId: 1, ts: -1 });
