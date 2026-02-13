import { describe, expect, it } from 'vitest';

import { findPath } from './astar';

const F = 0;
const W = 1;

describe('astar', () => {
  it('finds a straight-line path on open grid', () => {
    const grid = [
      [F, F, F, F, F],
      [F, F, F, F, F],
      [F, F, F, F, F],
    ];

    const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path.length).toBe(5);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[4]).toEqual({ x: 4, y: 0 });
  });

  it('navigates around a wall', () => {
    const grid = [
      [F, F, F, F, F],
      [F, F, W, F, F],
      [F, F, W, F, F],
      [F, F, F, F, F],
    ];

    const path = findPath(grid, { x: 0, y: 1 }, { x: 4, y: 1 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 0, y: 1 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 1 });
    // Path should not pass through wall
    for (const node of path) {
      expect(grid[node.y][node.x]).not.toBe(W);
    }
  });

  it('returns empty array when path is blocked', () => {
    const grid = [
      [F, W, F],
      [F, W, F],
      [F, W, F],
    ];

    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(path).toEqual([]);
  });

  it('returns single-element path when start equals end', () => {
    const grid = [[F, F], [F, F]];
    const path = findPath(grid, { x: 1, y: 1 }, { x: 1, y: 1 });
    expect(path).toEqual([{ x: 1, y: 1 }]);
  });

  it('returns empty array when target is a wall', () => {
    const grid = [
      [F, W],
      [F, F],
    ];

    const path = findPath(grid, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(path).toEqual([]);
  });
});
