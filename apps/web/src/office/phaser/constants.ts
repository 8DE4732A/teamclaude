export const TILE_SIZE = 16;
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 320;
export const CSS_SCALE = 2;
export const AVATAR_SPEED = 2;
export const IDLE_WANDER_MIN_MS = 3000;
export const IDLE_WANDER_MAX_MS = 5000;

export const FRAME = {
  IDLE: 0,
  WALK_DOWN_0: 1,
  WALK_DOWN_1: 2,
  WALK_UP_0: 3,
  WALK_UP_1: 4,
  WALK_LEFT_0: 5,
  WALK_LEFT_1: 6,
  WALK_RIGHT_0: 7,
  WALK_RIGHT_1: 8,
  TYPING: 9,
} as const;

/** GIDs that avatars can walk on (Floor=1, Corridor=4, BreakArea=5, Door=7) */
export const WALKABLE_GIDS = new Set([1, 4, 5, 7]);

/** GIDs that idle avatars will wander to (Corridor=4, BreakArea=5) */
export const WANDERABLE_GIDS = new Set([4, 5]);
