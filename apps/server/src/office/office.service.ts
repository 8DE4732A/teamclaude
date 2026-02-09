import { BadRequestException, Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';

interface OfficeDesk {
  id: string;
  x: number;
  y: number;
}

interface OfficeMap {
  id: string;
  name: string;
  desks: OfficeDesk[];
}

interface UserSettings {
  seatId?: string;
  avatarPresetId?: string;
}

@Injectable()
export class OfficeService {
  private readonly officeMap: OfficeMap = JSON.parse(
    readFileSync(new URL('./map/default-office-map.json', import.meta.url), 'utf-8'),
  ) as OfficeMap;

  private readonly userSettings = new Map<string, UserSettings>();

  getMap(): OfficeMap {
    return this.officeMap;
  }

  getMe(tenantId: string, userId: string) {
    const settings = this.userSettings.get(this.getSettingsKey(tenantId, userId));

    return {
      tenantId,
      userId,
      seatId: settings?.seatId ?? null,
      avatarPresetId: settings?.avatarPresetId ?? null,
    };
  }

  setSeat(tenantId: string, userId: string, seatId: string) {
    const isSeatExists = this.officeMap.desks.some((desk) => desk.id === seatId);

    if (!isSeatExists) {
      throw new BadRequestException('Invalid seatId');
    }

    const key = this.getSettingsKey(tenantId, userId);
    const current = this.userSettings.get(key) ?? {};
    this.userSettings.set(key, { ...current, seatId });

    return {
      tenantId,
      userId,
      seatId,
    };
  }

  setAvatar(tenantId: string, userId: string, avatarPresetId: string) {
    const normalizedAvatarPresetId = avatarPresetId.trim();

    if (!normalizedAvatarPresetId) {
      throw new BadRequestException('Invalid avatarPresetId');
    }

    const key = this.getSettingsKey(tenantId, userId);
    const current = this.userSettings.get(key) ?? {};
    this.userSettings.set(key, { ...current, avatarPresetId: normalizedAvatarPresetId });

    return {
      tenantId,
      userId,
      avatarPresetId: normalizedAvatarPresetId,
    };
  }

  private getSettingsKey(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`;
  }
}
