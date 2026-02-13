import { describe, expect, it } from 'vitest';

import { buildCollisionData } from './collision-grid';
import { readSeats, readSpawn } from './map-objects';

function makeMockTilemap(layerData: number[][], objects?: Record<string, Array<Record<string, unknown>>>) {
  const height = layerData.length;
  const width = layerData[0].length;

  const tileData = layerData.map((row) =>
    row.map((index) => ({ index })),
  );

  const objectLayers: Record<string, { objects: Array<Record<string, unknown>> }> = {};
  if (objects) {
    for (const [name, objs] of Object.entries(objects)) {
      objectLayers[name] = { objects: objs };
    }
  }

  return {
    getLayer(name: string) {
      if (name === 'Ground') {
        return { width, height, data: tileData };
      }
      return null;
    },
    getObjectLayer(name: string) {
      return objectLayers[name] ?? null;
    },
  };
}

describe('buildCollisionData', () => {
  it('marks walkable GIDs as 0 and non-walkable as 1', () => {
    // GIDs: 1=Floor(walkable), 2=Wall, 4=Corridor(walkable), 3=Desk
    const map = makeMockTilemap([
      [1, 2, 4],
      [2, 1, 3],
    ]);

    const result = buildCollisionData(map as never, 'Ground');

    expect(result.walkableGrid).toEqual([
      [0, 1, 0],
      [1, 0, 1],
    ]);
    expect(result.gidGrid).toEqual([
      [1, 2, 4],
      [2, 1, 3],
    ]);
  });

  it('handles all walkable GIDs: 1, 4, 5, 7', () => {
    const map = makeMockTilemap([
      [1, 4, 5, 7, 2, 3, 6, 8],
    ]);

    const result = buildCollisionData(map as never, 'Ground');

    expect(result.walkableGrid).toEqual([
      [0, 0, 0, 0, 1, 1, 1, 1],
    ]);
  });

  it('throws when layer not found', () => {
    const map = makeMockTilemap([[1]]);
    expect(() => buildCollisionData(map as never, 'Missing')).toThrow('Layer "Missing" not found');
  });
});

describe('readSeats', () => {
  it('reads seat objects with properties', () => {
    const map = makeMockTilemap([[1]], {
      Seats: [
        {
          name: 'desk-1',
          type: 'seat',
          x: 88,
          y: 88,
          properties: [
            { name: 'deskGridX', value: 5 },
            { name: 'deskGridY', value: 4 },
          ],
        },
        {
          name: 'desk-2',
          type: 'seat',
          x: 136,
          y: 88,
          properties: [
            { name: 'deskGridX', value: 8 },
            { name: 'deskGridY', value: 4 },
          ],
        },
      ],
    });

    const seats = readSeats(map as never);

    expect(seats).toEqual([
      { id: 'desk-1', seatX: 5, seatY: 5, deskGridX: 5, deskGridY: 4 },
      { id: 'desk-2', seatX: 8, seatY: 5, deskGridX: 8, deskGridY: 4 },
    ]);
  });

  it('returns empty array when no Seats layer', () => {
    const map = makeMockTilemap([[1]]);
    const seats = readSeats(map as never);
    expect(seats).toEqual([]);
  });
});

describe('readSpawn', () => {
  it('reads spawn point and converts to grid coords', () => {
    const map = makeMockTilemap([[1]], {
      Spawn: [
        { name: 'spawn', type: 'spawn', x: 248, y: 296 },
      ],
    });

    const spawn = readSpawn(map as never);
    expect(spawn).toEqual({ x: 15, y: 18 });
  });

  it('returns default spawn when no Spawn layer', () => {
    const map = makeMockTilemap([[1]]);
    const spawn = readSpawn(map as never);
    expect(spawn).toEqual({ x: 15, y: 18 });
  });
});
