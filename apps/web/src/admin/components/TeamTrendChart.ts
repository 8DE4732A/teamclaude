import type { DailyInteractions } from '../../api/client';

export function TeamTrendChart(data: DailyInteractions[]): HTMLElement {
  const container = document.createElement('section');
  container.setAttribute('data-testid', 'team-trend-chart');
  container.style.cssText = 'background:#16213e;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #2a2a4a;';

  const title = document.createElement('h3');
  title.textContent = '7-Day Trend';
  title.style.cssText = 'color:#e0e0e0;font-size:14px;margin:0 0 16px 0;font-weight:600;';
  container.append(title);

  const maxVal = Math.max(...data.map((d) => d.interactions), 1);
  const svgWidth = 420;
  const svgHeight = 200;
  const barPadding = 8;
  const barWidth = (svgWidth - barPadding * (data.length + 1)) / data.length;
  const gridLines = 4;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight + 30}`);
  svg.setAttribute('width', '100%');
  svg.style.cssText = 'display:block;';

  // Y-axis grid lines
  for (let i = 1; i <= gridLines; i++) {
    const y = svgHeight - (svgHeight * i) / gridLines;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(svgWidth));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', '#2a2a4a');
    line.setAttribute('stroke-width', '1');
    svg.append(line);

    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', '4');
    label.setAttribute('y', String(y - 4));
    label.setAttribute('fill', '#666');
    label.setAttribute('font-size', '10');
    label.textContent = String(Math.round((maxVal * i) / gridLines));
    svg.append(label);
  }

  // Bars + X-axis labels
  data.forEach((d, i) => {
    const barHeight = (d.interactions / maxVal) * svgHeight;
    const x = barPadding + i * (barWidth + barPadding);
    const y = svgHeight - barHeight;

    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(barWidth));
    rect.setAttribute('height', String(barHeight));
    rect.setAttribute('fill', '#4fc3f7');
    rect.setAttribute('rx', '3');
    svg.append(rect);

    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', String(x + barWidth / 2));
    text.setAttribute('y', String(svgHeight + 16));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#999');
    text.setAttribute('font-size', '10');
    text.textContent = d.date.slice(5); // MM-DD
    svg.append(text);
  });

  container.append(svg);
  return container;
}
