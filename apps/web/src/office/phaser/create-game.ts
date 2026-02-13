import Phaser from 'phaser';

import type { OfficeScene } from '../OfficeScene';
import type { PresenceStore } from '../presence-store';
import type { PresenceState } from '../types';
import { CSS_SCALE, GAME_HEIGHT, GAME_WIDTH } from './constants';
import { PhaserOfficeScene } from './PhaserOfficeScene';

export interface HudChangePayload {
  userId: string;
  state: PresenceState;
  screenX: number;
  screenY: number;
}

export interface CreateGameOptions {
  parent: HTMLElement;
  store: PresenceStore;
  sceneState: OfficeScene;
  onHudChange: (payload: HudChangePayload | null) => void;
}

export function createPhaserGame(options: CreateGameOptions): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: options.parent,
    pixelArt: true,
    zoom: CSS_SCALE,
    backgroundColor: '#1a1a2e',
    scene: [PhaserOfficeScene],
    input: {
      mouse: { preventDefaultWheel: false },
    },
  });

  game.scene.start('PhaserOfficeScene', {
    store: options.store,
    sceneState: options.sceneState,
    onHudChange: options.onHudChange,
  });

  return game;
}
