import type { OverviewData } from '../types';

export function TeamOverviewCards(data: OverviewData): HTMLElement {
  const container = document.createElement('section');
  container.setAttribute('data-testid', 'team-overview-cards');
  container.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;';

  const cards: { label: string; value: string; testId: string }[] = [
    { label: 'Total Interactions', value: String(data.totalInteractions), testId: 'card-total' },
    { label: 'Active Members', value: String(data.activeMembers), testId: 'card-active' },
    { label: 'Peak Hour', value: data.peakHour !== null ? `${String(data.peakHour).padStart(2, '0')}:00 UTC` : 'N/A', testId: 'card-peak' },
  ];

  for (const card of cards) {
    const el = document.createElement('div');
    el.setAttribute('data-testid', card.testId);
    el.style.cssText =
      'background:#16213e;border-radius:8px;padding:20px;text-align:center;border:1px solid #2a2a4a;';

    const value = document.createElement('div');
    value.textContent = card.value;
    value.style.cssText = 'font-size:32px;font-weight:700;color:#4fc3f7;';

    const label = document.createElement('div');
    label.textContent = card.label;
    label.style.cssText = 'font-size:13px;color:#999;margin-top:8px;';

    el.append(value, label);
    container.append(el);
  }

  return container;
}
