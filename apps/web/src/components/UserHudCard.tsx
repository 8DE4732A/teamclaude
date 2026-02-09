import type { TodayStatsResponse } from '../api/client';

export function UserHudCard(stats: TodayStatsResponse): HTMLElement {
  const card = document.createElement('section');
  card.setAttribute('data-testid', 'user-hud-card');

  const interactions = document.createElement('p');
  interactions.textContent = `Interactions today: ${stats.interactions}`;

  const lastActiveAt = document.createElement('p');
  lastActiveAt.textContent = `Last active at: ${stats.lastActiveAt ?? 'N/A'}`;

  card.append(interactions, lastActiveAt);
  return card;
}
