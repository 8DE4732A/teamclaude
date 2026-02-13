import type { PathNode } from './astar';

export function pickWanderTarget(grid: number[][], currentPos: PathNode, wanderableTiles: ReadonlySet<number> = new Set([0])): PathNode {
  const candidates: PathNode[] = [];
  const farCandidates: PathNode[] = [];
  const rows = grid.length;
  const cols = grid[0].length;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = grid[y][x];
      if (!wanderableTiles.has(tile)) continue;
      if (x === currentPos.x && y === currentPos.y) continue;

      const dist = Math.abs(x - currentPos.x) + Math.abs(y - currentPos.y);
      if (dist <= 10) {
        candidates.push({ x, y });
      } else {
        farCandidates.push({ x, y });
      }
    }
  }

  const pool = candidates.length > 0 ? candidates : farCandidates;
  if (pool.length === 0) {
    return { x: currentPos.x, y: currentPos.y };
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
