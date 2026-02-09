import type { ApiClient } from './api/client';
import { UserHudCard } from './components/UserHudCard';
import { OfficeScene } from './office/OfficeScene';
import { PresenceStore } from './office/presence-store';

export async function App(apiClient: ApiClient): Promise<HTMLElement> {
  const root = document.createElement('main');
  root.setAttribute('data-testid', 'app-root');

  const map = await apiClient.getOfficeMap();
  const me = await apiClient.getMe();
  const stats = await apiClient.getTodayStats();

  const scene = new OfficeScene();
  const store = new PresenceStore();

  store.subscribe((snapshot) => {
    snapshot.forEach((event) => scene.applyPresence(event));
  });

  store.update({ userId: me.id, state: 'Coding', target: { x: 0, y: 0 } });

  const mapPlaceholder = document.createElement('section');
  mapPlaceholder.setAttribute('data-testid', 'office-map-placeholder');
  mapPlaceholder.textContent = `Map placeholder: ${map.mapId}`;

  const avatarInfo = document.createElement('pre');
  avatarInfo.setAttribute('data-testid', 'avatar-state');
  avatarInfo.textContent = JSON.stringify(scene.getAvatar(me.id), null, 2);

  root.append(mapPlaceholder, UserHudCard(stats), avatarInfo);

  return root;
}
