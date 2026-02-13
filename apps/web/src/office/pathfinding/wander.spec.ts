import { describe, expect, it } from 'vitest';

import { pickWanderTarget } from './wander';

const F = 0;
const C = 4;
const B = 5;
const W = 1;
const WANDERABLE = new Set([4, 5]);

describe('wander', () => {
  it('picks a Corridor or BreakArea tile', () => {
    const grid = [
      [W, W, W, W, W],
      [W, F, C, B, W],
      [W, F, F, C, W],
      [W, W, W, W, W],
    ];

    const target = pickWanderTarget(grid, { x: 1, y: 1 }, WANDERABLE);
    const tile = grid[target.y][target.x];
    expect(tile === 4 || tile === 5).toBe(true);
  });

  it('returns current position when no Corridor/BreakArea tiles exist', () => {
    const grid = [
      [W, W, W],
      [W, F, W],
      [W, W, W],
    ];

    const target = pickWanderTarget(grid, { x: 1, y: 1 }, WANDERABLE);
    expect(target).toEqual({ x: 1, y: 1 });
  });

  it('does not pick the current position', () => {
    const grid = [
      [W, W, W, W],
      [W, C, C, W],
      [W, W, W, W],
    ];

    // Position is on a Corridor tile, should pick the other one
    for (let i = 0; i < 20; i++) {
      const target = pickWanderTarget(grid, { x: 1, y: 1 }, WANDERABLE);
      expect(target).toEqual({ x: 2, y: 1 });
    }
  });
});
