import Phaser from 'phaser';

import { WALKABLE_GIDS } from './constants';

export interface CollisionData {
  walkableGrid: number[][];
  gidGrid: number[][];
}

export function buildCollisionData(
  tilemap: Phaser.Tilemaps.Tilemap,
  layerName: string,
): CollisionData {
  const layer = tilemap.getLayer(layerName);
  if (!layer) {
    throw new Error(`Layer "${layerName}" not found in tilemap`);
  }

  const rows = layer.height;
  const cols = layer.width;

  const walkableGrid: number[][] = [];
  const gidGrid: number[][] = [];

  for (let y = 0; y < rows; y++) {
    const walkRow: number[] = [];
    const gidRow: number[] = [];

    for (let x = 0; x < cols; x++) {
      const tile = layer.data[y][x];
      const gid = tile.index;
      gidRow.push(gid);
      walkRow.push(WALKABLE_GIDS.has(gid) ? 0 : 1);
    }

    walkableGrid.push(walkRow);
    gidGrid.push(gidRow);
  }

  return { walkableGrid, gidGrid };
}
