import type { ApiClient } from './api/client';
import { UserHudCard } from './components/UserHudCard';
import { OfficeScene } from './office/OfficeScene';
import { createPhaserGame, type HudChangePayload } from './office/phaser/create-game';
import { PresenceStore } from './office/presence-store';

export async function App(apiClient: ApiClient): Promise<HTMLElement> {
  const root = document.createElement('main');
  root.setAttribute('data-testid', 'app-root');
  root.style.position = 'relative';

  const [map, me, stats] = await Promise.all([
    apiClient.getOfficeMap(),
    apiClient.getMe(),
    apiClient.getTodayStats(),
  ]);

  const scene = new OfficeScene();
  const store = new PresenceStore();

  // HUD card container
  let hudElement: HTMLElement | null = null;

  const onHudChange = (payload: HudChangePayload | null): void => {
    if (hudElement) {
      hudElement.remove();
      hudElement = null;
    }
    if (payload) {
      hudElement = UserHudCard(stats, {
        userId: payload.userId,
        state: payload.state,
        screenX: payload.screenX,
        screenY: payload.screenY,
        onClose: () => {
          hudElement?.remove();
          hudElement = null;
        },
      });
      root.append(hudElement);
    }
  };

  // Phaser game container
  const gameContainer = document.createElement('div');
  gameContainer.setAttribute('data-testid', 'office-game');
  root.append(gameContainer);

  createPhaserGame({
    parent: gameContainer,
    store,
    sceneState: scene,
    onHudChange,
  });

  // Subscribe store to sync scene state
  store.subscribe((snapshot) => {
    snapshot.forEach((event) => scene.applyPresence(event));
  });

  // Initialize current user with seat position if available
  const desk = map.desks?.find((d) => d.id === me.seatId);
  const target = desk ? { x: desk.seatX, y: desk.seatY } : map.spawnPoint;
  store.update({ userId: me.id, state: 'Coding', target });

  // Bottom stats bar
  root.append(UserHudCard(stats));

  return root;
}
