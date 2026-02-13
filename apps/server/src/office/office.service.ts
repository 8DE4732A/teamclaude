import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { readFileSync } from 'node:fs';
import { Model } from 'mongoose';

import { User } from '../database/schemas/user.schema';

interface OfficeDesk {
  id: string;
  gridX: number;
  gridY: number;
  seatX: number;
  seatY: number;
}

interface OfficeMap {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  desks: OfficeDesk[];
  spawnPoint: { x: number; y: number };
}

@Injectable()
export class OfficeService {
  private readonly officeMap: OfficeMap = JSON.parse(
    readFileSync(new URL('./map/default-office-map.json', import.meta.url), 'utf-8'),
  ) as OfficeMap;

  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  getMap(): OfficeMap {
    return this.officeMap;
  }

  async getMe(tenantId: string, userId: string) {
    const user = await this.userModel.findOne({ tenantId, userId }).lean();

    return {
      tenantId,
      userId,
      seatId: user?.seatId ?? null,
      avatarPresetId: user?.avatarPresetId ?? null,
    };
  }

  async setSeat(tenantId: string, userId: string, seatId: string) {
    const isSeatExists = this.officeMap.desks.some((desk) => desk.id === seatId);

    if (!isSeatExists) {
      throw new BadRequestException('Invalid seatId');
    }

    await this.userModel.findOneAndUpdate(
      { tenantId, userId },
      { $set: { seatId } },
      { upsert: true },
    );

    return {
      tenantId,
      userId,
      seatId,
    };
  }

  async setAvatar(tenantId: string, userId: string, avatarPresetId: string) {
    const normalizedAvatarPresetId = avatarPresetId.trim();

    if (!normalizedAvatarPresetId) {
      throw new BadRequestException('Invalid avatarPresetId');
    }

    await this.userModel.findOneAndUpdate(
      { tenantId, userId },
      { $set: { avatarPresetId: normalizedAvatarPresetId } },
      { upsert: true },
    );

    return {
      tenantId,
      userId,
      avatarPresetId: normalizedAvatarPresetId,
    };
  }
}
