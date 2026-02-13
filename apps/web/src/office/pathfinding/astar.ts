export interface PathNode {
  x: number;
  y: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export function findPath(
  grid: number[][],
  start: PathNode,
  end: PathNode,
  walkable: (t: number) => boolean = (t) => t === 0,
): PathNode[] {
  const rows = grid.length;
  const cols = grid[0].length;

  if (start.x === end.x && start.y === end.y) {
    return [{ x: start.x, y: start.y }];
  }

  if (
    end.x < 0 || end.x >= cols || end.y < 0 || end.y >= rows ||
    !walkable(grid[end.y][end.x])
  ) {
    return [];
  }

  const closedSet = new Set<string>();
  const openList: AStarNode[] = [];
  const key = (x: number, y: number) => `${x},${y}`;

  const h = (x: number, y: number) => Math.abs(x - end.x) + Math.abs(y - end.y);

  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: h(start.x, start.y),
    f: h(start.x, start.y),
    parent: null,
  };

  openList.push(startNode);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (openList.length > 0) {
    // Find node with lowest f
    let bestIndex = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[bestIndex].f) {
        bestIndex = i;
      }
    }

    const current = openList.splice(bestIndex, 1)[0];
    const currentKey = key(current.x, current.y);

    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(current);
    }

    closedSet.add(currentKey);

    for (const { dx, dy } of directions) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (!walkable(grid[ny][nx])) continue;
      if (closedSet.has(key(nx, ny))) continue;

      const g = current.g + 1;
      const existingIndex = openList.findIndex((n) => n.x === nx && n.y === ny);

      if (existingIndex !== -1) {
        if (g < openList[existingIndex].g) {
          openList[existingIndex].g = g;
          openList[existingIndex].f = g + openList[existingIndex].h;
          openList[existingIndex].parent = current;
        }
      } else {
        const hVal = h(nx, ny);
        openList.push({ x: nx, y: ny, g, h: hVal, f: g + hVal, parent: current });
      }
    }
  }

  return [];
}

function reconstructPath(node: AStarNode): PathNode[] {
  const path: PathNode[] = [];
  let current: AStarNode | null = node;
  while (current) {
    path.push({ x: current.x, y: current.y });
    current = current.parent;
  }
  return path.reverse();
}
