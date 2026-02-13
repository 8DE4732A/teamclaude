import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ type: String, required: true }) tenantId: string;
  @Prop({ type: String, required: true }) userId: string;
  @Prop({ type: String }) seatId?: string;
  @Prop({ type: String }) avatarPresetId?: string;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
