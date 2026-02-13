import type { TodayStatsResponse } from '../api/client';
import type { PresenceState } from '../office/types';

export interface HudCardOptions {
  userId?: string;
  state?: PresenceState;
  screenX?: number;
  screenY?: number;
  onClose?: () => void;
}

export function UserHudCard(stats: TodayStatsResponse, options?: HudCardOptions): HTMLElement {
  const card = document.createElement('section');
  card.setAttribute('data-testid', 'user-hud-card');

  if (options?.screenX !== undefined && options?.screenY !== undefined) {
    card.style.position = 'absolute';
    card.style.left = `${options.screenX}px`;
    card.style.top = `${options.screenY}px`;
    card.style.zIndex = '100';
    card.style.background = '#2a2a3e';
    card.style.color = '#e0e0e0';
    card.style.padding = '8px';
    card.style.borderRadius = '4px';
    card.style.fontFamily = 'monospace';
    card.style.fontSize = '12px';
    card.style.border = '2px solid #4a4a6a';
  }

  if (options?.userId) {
    const userLine = document.createElement('p');
    userLine.setAttribute('data-testid', 'hud-user-id');
    userLine.textContent = `User: ${options.userId}`;
    card.append(userLine);
  }

  if (options?.state) {
    const stateLine = document.createElement('p');
    stateLine.setAttribute('data-testid', 'hud-state-badge');
    stateLine.textContent = `Status: ${options.state}`;
    card.append(stateLine);
  }

  const interactions = document.createElement('p');
  interactions.textContent = `Interactions today: ${stats.interactions}`;

  const lastActiveAt = document.createElement('p');
  lastActiveAt.textContent = `Last active at: ${stats.lastActiveAt ?? 'N/A'}`;

  card.append(interactions, lastActiveAt);

  if (options?.onClose) {
    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('data-testid', 'hud-close-btn');
    closeBtn.textContent = 'X';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '2px';
    closeBtn.style.right = '2px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#e0e0e0';
    closeBtn.style.fontSize = '10px';
    closeBtn.addEventListener('click', options.onClose);
    card.append(closeBtn);
  }

  return card;
}
