import { describe, expect, it } from 'vitest';

import { TeamTrendChart } from './TeamTrendChart';

class FakeElement {
  public textContent = '';
  public style = { cssText: '' };
  private readonly tag: string;
  private readonly attributes = new Map<string, string>();
  private readonly children: FakeElement[] = [];

  constructor(tag = 'div') {
    this.tag = tag;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  getTag(): string {
    return this.tag;
  }

  getChildren(): FakeElement[] {
    return this.children;
  }
}

describe('TeamTrendChart', () => {
  it('renders an SVG with bars for each data point', () => {
    let svgCreated: FakeElement | null = null;

    globalThis.document = {
      createElement: () => new FakeElement('div'),
      createElementNS: (_ns: string, tag: string) => {
        const el = new FakeElement(tag);
        if (tag === 'svg') svgCreated = el;
        return el;
      },
    } as unknown as Document;

    const data = [
      { date: '2026-02-03', interactions: 10 },
      { date: '2026-02-04', interactions: 20 },
      { date: '2026-02-05', interactions: 5 },
    ];

    const el = TeamTrendChart(data) as unknown as FakeElement;

    expect(el.getAttribute('data-testid')).toBe('team-trend-chart');
    expect(svgCreated).not.toBeNull();

    // SVG should have rects (bars) and texts (labels)
    const children = svgCreated!.getChildren();
    const rects = children.filter((c) => c.getTag() === 'rect');
    const texts = children.filter((c) => c.getTag() === 'text');

    expect(rects).toHaveLength(3);
    // 4 grid labels + 3 x-axis labels
    expect(texts.length).toBeGreaterThanOrEqual(3);
  });
});
