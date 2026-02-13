import type { HourlyInteractions } from '../../api/client';

export function ActivityHeatmap(data: HourlyInteractions[]): HTMLElement {
  const container = document.createElement('section');
  container.setAttribute('data-testid', 'activity-heatmap');
  container.style.cssText = 'background:#16213e;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #2a2a4a;';

  const title = document.createElement('h3');
  title.textContent = '24h Activity Heatmap';
  title.style.cssText = 'color:#e0e0e0;font-size:14px;margin:0 0 16px 0;font-weight:600;';
  container.append(title);

  const grid = document.createElement('div');
  grid.setAttribute('data-testid', 'heatmap-grid');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(24,1fr);gap:3px;';

  const maxVal = Math.max(...data.map((d) => d.interactions), 1);

  for (const entry of data) {
    const cell = document.createElement('div');
    const intensity = entry.interactions / maxVal;
    const r = Math.round(15 + intensity * 64);
    const g = Math.round(15 + intensity * 180);
    const b = Math.round(30 + intensity * 217);
    cell.style.cssText = `background:rgb(${r},${g},${b});border-radius:3px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#e0e0e0;`;
    cell.textContent = String(entry.hour);
    cell.title = `${String(entry.hour).padStart(2, '0')}:00 — ${entry.interactions} interactions`;
    grid.append(cell);
  }

  container.append(grid);
  return container;
}
