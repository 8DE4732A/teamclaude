import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'events_dedup' })
export class EventDedup {
  @Prop({ type: String, required: true, unique: true }) scopedEventId: string;
  @Prop({ type: Date, expires: 86400, default: () => new Date() }) createdAt: Date;
}

export type EventDedupDocument = HydratedDocument<EventDedup>;

export const EventDedupSchema = SchemaFactory.createForClass(EventDedup);
