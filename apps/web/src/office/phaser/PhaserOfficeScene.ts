import Phaser from 'phaser';

import type { AvatarState } from '../OfficeScene';
import { OfficeScene } from '../OfficeScene';
import { findPath, type PathNode } from '../pathfinding/astar';
import { pickWanderTarget } from '../pathfinding/wander';
import { PresenceStore } from '../presence-store';
import type { AnimationType, PresenceState } from '../types';
import { buildCollisionData, type CollisionData } from './collision-grid';
import {
  AVATAR_SPEED,
  FRAME,
  GAME_HEIGHT,
  GAME_WIDTH,
  IDLE_WANDER_MAX_MS,
  IDLE_WANDER_MIN_MS,
  TILE_SIZE,
  WALKABLE_GIDS,
  WANDERABLE_GIDS,
} from './constants';
import { readSeats, readSpawn, type SeatData } from './map-objects';

export interface HudChangePayload {
  userId: string;
  state: PresenceState;
  screenX: number;
  screenY: number;
}

interface SpriteData {
  sprite: Phaser.GameObjects.Sprite;
  bubble: Phaser.GameObjects.Image | null;
  userId: string;
  gridX: number;
  gridY: number;
  path: PathNode[];
  pathIndex: number;
  animation: AnimationType;
  animationFrame: number;
  animationTimer: number;
  paletteIndex: number;
  state: PresenceState;
  isOffline: boolean;
  wanderTimer: number;
}

interface SceneInitData {
  store: PresenceStore;
  sceneState: OfficeScene;
  onHudChange: (payload: HudChangePayload | null) => void;
}

export class PhaserOfficeScene extends Phaser.Scene {
  private store!: PresenceStore;
  private sceneState!: OfficeScene;
  private onHudChange!: (payload: HudChangePayload | null) => void;

  private sprites = new Map<string, SpriteData>();
  private collisionData!: CollisionData;
  private seats: SeatData[] = [];
  private spawnPoint = { x: 15, y: 18 };
  private paletteCounter = 0;
  private unsubscribe?: () => void;

  constructor() {
    super({ key: 'PhaserOfficeScene' });
  }

  init(data: SceneInitData): void {
    this.store = data.store;
    this.sceneState = data.sceneState;
    this.onHudChange = data.onHudChange;
  }

  preload(): void {
    this.load.image('tileset', '/assets/office-tileset.png');
    this.load.tilemapTiledJSON('office-map', '/assets/office-map.json');
    this.load.spritesheet('avatar', '/assets/avatar-spritesheet.png', {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
    this.load.image('typing-bubble', '/assets/typing-bubble.png');
  }

  create(): void {
    const map = this.make.tilemap({ key: 'office-map' });
    const tileset = map.addTilesetImage('office-tileset', 'tileset');
    if (!tileset) return;

    map.createLayer('Ground', tileset, 0, 0);

    this.collisionData = buildCollisionData(map, 'Ground');
    this.seats = readSeats(map);
    this.spawnPoint = readSpawn(map);

    this.createAnimations();

    this.unsubscribe = this.store.subscribe((snapshot) => {
      snapshot.forEach((event) => this.sceneState.applyPresence(event));
      this.syncAvatars();
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      let clicked = false;
      for (const [, data] of this.sprites) {
        const sprite = data.sprite;
        const bounds = sprite.getBounds();
        if (bounds.contains(worldX, worldY)) {
          this.onHudChange({
            userId: data.userId,
            state: data.state,
            screenX: pointer.x * this.scale.zoom,
            screenY: pointer.y * this.scale.zoom,
          });
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        this.onHudChange(null);
      }
    });
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);

    for (const data of this.sprites.values()) {
      if (data.isOffline) continue;

      if (data.path.length > 0 && data.pathIndex < data.path.length) {
        const target = data.path[data.pathIndex];
        const targetPixelX = target.x * TILE_SIZE;
        const targetPixelY = target.y * TILE_SIZE;

        const dx = targetPixelX - data.sprite.x;
        const dy = targetPixelY - data.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveAmount = AVATAR_SPEED * TILE_SIZE * dt;

        if (dist <= moveAmount) {
          data.sprite.x = targetPixelX;
          data.sprite.y = targetPixelY;
          data.gridX = target.x;
          data.gridY = target.y;
          data.pathIndex++;

          if (data.pathIndex >= data.path.length) {
            data.path = [];
            data.pathIndex = 0;
            if (data.state === 'Coding') {
              this.setAnimationState(data, 'typing');
            } else {
              this.setAnimationState(data, 'idle-stand');
            }
          }
        } else {
          const nx = dx / dist;
          const ny = dy / dist;
          data.sprite.x += nx * moveAmount;
          data.sprite.y += ny * moveAmount;

          const walkAnim = this.getWalkAnimation(dx, dy);
          if (data.animation !== walkAnim) {
            this.setAnimationState(data, walkAnim);
          }
        }

        data.animationTimer += dt;
        if (data.animationTimer >= 0.25) {
          data.animationTimer = 0;
          data.animationFrame = (data.animationFrame + 1) % 2;
          this.updateSpriteFrame(data);
        }
      }

      // Idle wander
      if (data.state === 'Idle' && data.path.length === 0 && !data.isOffline) {
        data.wanderTimer -= dt;
        if (data.wanderTimer <= 0) {
          const target = pickWanderTarget(
            this.collisionData.gidGrid,
            { x: data.gridX, y: data.gridY },
            WANDERABLE_GIDS,
          );
          this.setPathTo(data, target.x, target.y);
          data.wanderTimer =
            (IDLE_WANDER_MIN_MS + Math.random() * (IDLE_WANDER_MAX_MS - IDLE_WANDER_MIN_MS)) / 1000;
        }
      }

      // Update bubble position
      if (data.bubble) {
        data.bubble.x = data.sprite.x + 8;
        data.bubble.y = data.sprite.y - 6;
      }

      // Y-sort depth
      data.sprite.setDepth(data.sprite.y);
      if (data.bubble) {
        data.bubble.setDepth(data.sprite.y + 1);
      }
    }
  }

  destroy(): void {
    this.unsubscribe?.();
    super.destroy();
  }

  private syncAvatars(): void {
    const avatars = this.sceneState.getAllAvatars();

    for (const [userId, avatarState] of avatars) {
      let data = this.sprites.get(userId);

      if (!data) {
        data = this.createSpriteData(userId, avatarState);
        this.sprites.set(userId, data);
      }

      const prevState = data.state;
      data.state = avatarState.state;
      data.isOffline = avatarState.isOffline;

      if (avatarState.isOffline) {
        data.sprite.setAlpha(0.3);
        this.setAnimationState(data, 'idle-stand');
        data.path = [];
        data.pathIndex = 0;
        this.removeBubble(data);
      } else {
        data.sprite.setAlpha(1);

        if (avatarState.state === 'Coding' && avatarState.target) {
          const seat = this.seats.find(
            (s) => s.seatX === avatarState.target!.x && s.seatY === avatarState.target!.y,
          );
          if (seat) {
            if (data.gridX !== seat.seatX || data.gridY !== seat.seatY) {
              this.setPathTo(data, seat.seatX, seat.seatY);
              this.removeBubble(data);
            } else if (data.path.length === 0) {
              this.setAnimationState(data, 'typing');
              this.showBubble(data);
            }
          }
        } else if (avatarState.state === 'Idle' && prevState !== 'Idle') {
          data.wanderTimer =
            (IDLE_WANDER_MIN_MS + Math.random() * (IDLE_WANDER_MAX_MS - IDLE_WANDER_MIN_MS)) / 1000;
          if (data.path.length === 0) {
            this.setAnimationState(data, 'idle-stand');
          }
          this.removeBubble(data);
        }
      }
    }

    // Remove sprites for users no longer in scene
    for (const [userId, data] of this.sprites) {
      if (!avatars.has(userId)) {
        data.sprite.destroy();
        data.bubble?.destroy();
        this.sprites.delete(userId);
      }
    }
  }

  private createSpriteData(userId: string, avatarState: AvatarState): SpriteData {
    const paletteIndex = this.paletteCounter++ % 6;
    const startX = this.spawnPoint.x * TILE_SIZE;
    const startY = this.spawnPoint.y * TILE_SIZE;

    const sprite = this.add.sprite(startX, startY, 'avatar', paletteIndex * 10 + FRAME.IDLE);
    sprite.setOrigin(0, 0);
    sprite.setInteractive();

    return {
      sprite,
      bubble: null,
      userId,
      gridX: this.spawnPoint.x,
      gridY: this.spawnPoint.y,
      path: [],
      pathIndex: 0,
      animation: 'idle-stand',
      animationFrame: 0,
      animationTimer: 0,
      paletteIndex,
      state: avatarState.state,
      isOffline: avatarState.isOffline,
      wanderTimer: 0,
    };
  }

  private setPathTo(data: SpriteData, targetX: number, targetY: number): void {
    const start: PathNode = { x: data.gridX, y: data.gridY };
    const end: PathNode = { x: targetX, y: targetY };
    const walkable = (t: number) => WALKABLE_GIDS.has(t);
    const path = findPath(this.collisionData.gidGrid, start, end, walkable);
    if (path.length > 1) {
      data.path = path;
      data.pathIndex = 1;
    }
  }

  private getWalkAnimation(dx: number, dy: number): AnimationType {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'walk-right' : 'walk-left';
    }
    return dy > 0 ? 'walk-down' : 'walk-up';
  }

  private setAnimationState(data: SpriteData, animation: AnimationType): void {
    data.animation = animation;
    data.animationFrame = 0;
    data.animationTimer = 0;
    this.updateSpriteFrame(data);
  }

  private updateSpriteFrame(data: SpriteData): void {
    const row = data.paletteIndex;
    let col: number;

    switch (data.animation) {
      case 'walk-down':
        col = data.animationFrame === 0 ? FRAME.WALK_DOWN_0 : FRAME.WALK_DOWN_1;
        break;
      case 'walk-up':
        col = data.animationFrame === 0 ? FRAME.WALK_UP_0 : FRAME.WALK_UP_1;
        break;
      case 'walk-left':
        col = data.animationFrame === 0 ? FRAME.WALK_LEFT_0 : FRAME.WALK_LEFT_1;
        break;
      case 'walk-right':
        col = data.animationFrame === 0 ? FRAME.WALK_RIGHT_0 : FRAME.WALK_RIGHT_1;
        break;
      case 'typing':
        col = FRAME.TYPING;
        break;
      default:
        col = FRAME.IDLE;
    }

    data.sprite.setFrame(row * 10 + col);
  }

  private showBubble(data: SpriteData): void {
    if (data.bubble) return;
    data.bubble = this.add.image(
      data.sprite.x + 8,
      data.sprite.y - 6,
      'typing-bubble',
    );
    data.bubble.setOrigin(0.5, 1);
  }

  private removeBubble(data: SpriteData): void {
    if (data.bubble) {
      data.bubble.destroy();
      data.bubble = null;
    }
  }

  private createAnimations(): void {
    // Animations are frame-based, managed manually in update()
    // No Phaser animation configs needed since we use setFrame directly
  }
}
