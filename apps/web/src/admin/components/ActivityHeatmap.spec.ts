import { describe, expect, it } from 'vitest';

import { ActivityHeatmap } from './ActivityHeatmap';

class FakeElement {
  public textContent = '';
  public title = '';
  public style = { cssText: '' };
  private readonly attributes = new Map<string, string>();
  private readonly children: FakeElement[] = [];

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  querySelector(selector: string): FakeElement | null {
    const testId = selector.match(/^\[data-testid="(.+)"\]$/)?.[1];
    if (!testId) return null;
    const queue = [...this.children];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.attributes.get('data-testid') === testId) return current;
      queue.push(...current.children);
    }
    return null;
  }

  getChildren(): FakeElement[] {
    return this.children;
  }
}

describe('ActivityHeatmap', () => {
  it('renders 24 cells in the heatmap grid', () => {
    globalThis.document = { createElement: () => new FakeElement() } as unknown as Document;

    const data = Array.from({ length: 24 }, (_, i) => ({ hour: i, interactions: i * 2 }));

    const el = ActivityHeatmap(data) as unknown as FakeElement;

    expect(el.getAttribute('data-testid')).toBe('activity-heatmap');
    const grid = el.querySelector('[data-testid="heatmap-grid"]');
    expect(grid).not.toBeNull();
    expect(grid!.getChildren()).toHaveLength(24);
  });

  it('first cell shows hour 0', () => {
    globalThis.document = { createElement: () => new FakeElement() } as unknown as Document;

    const data = Array.from({ length: 24 }, (_, i) => ({ hour: i, interactions: 0 }));

    const el = ActivityHeatmap(data) as unknown as FakeElement;
    const grid = el.querySelector('[data-testid="heatmap-grid"]');
    const firstCell = grid!.getChildren()[0];
    expect(firstCell.textContent).toBe('0');
  });
});
