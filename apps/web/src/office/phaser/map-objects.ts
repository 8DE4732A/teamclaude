import Phaser from 'phaser';

import { TILE_SIZE } from './constants';

export interface SeatData {
  id: string;
  seatX: number;
  seatY: number;
  deskGridX: number;
  deskGridY: number;
}

export function readSeats(tilemap: Phaser.Tilemaps.Tilemap): SeatData[] {
  const layer = tilemap.getObjectLayer('Seats');
  if (!layer) return [];

  return layer.objects.map((obj) => {
    const props = obj.properties as Array<{ name: string; value: number }> | undefined;
    const getProp = (name: string): number => {
      const p = props?.find((p) => p.name === name);
      return p?.value ?? 0;
    };

    return {
      id: obj.name,
      seatX: Math.floor((obj.x ?? 0) / TILE_SIZE),
      seatY: Math.floor((obj.y ?? 0) / TILE_SIZE),
      deskGridX: getProp('deskGridX'),
      deskGridY: getProp('deskGridY'),
    };
  });
}

export function readSpawn(tilemap: Phaser.Tilemaps.Tilemap): { x: number; y: number } {
  const layer = tilemap.getObjectLayer('Spawn');
  if (!layer || layer.objects.length === 0) {
    return { x: 15, y: 18 };
  }

  const obj = layer.objects[0];
  return {
    x: Math.floor((obj.x ?? 0) / TILE_SIZE),
    y: Math.floor((obj.y ?? 0) / TILE_SIZE),
  };
}
