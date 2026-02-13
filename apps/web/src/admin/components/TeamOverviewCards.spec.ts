import { describe, expect, it } from 'vitest';

import { TeamOverviewCards } from './TeamOverviewCards';

class FakeElement {
  public textContent = '';
  public style = { cssText: '' };
  private readonly attributes = new Map<string, string>();
  private readonly children: FakeElement[] = [];

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
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

  toFlatText(): string {
    return [this.textContent, ...this.children.map((c) => c.toFlatText())].join(' ');
  }
}

describe('TeamOverviewCards', () => {
  it('renders three cards with correct values', () => {
    globalThis.document = { createElement: () => new FakeElement() } as unknown as Document;

    const el = TeamOverviewCards({
      totalInteractions: 42,
      activeMembers: 5,
      peakHour: 14,
    }) as unknown as FakeElement;

    expect(el.querySelector('[data-testid="card-total"]')?.toFlatText()).toContain('42');
    expect(el.querySelector('[data-testid="card-active"]')?.toFlatText()).toContain('5');
    expect(el.querySelector('[data-testid="card-peak"]')?.toFlatText()).toContain('14:00 UTC');
  });

  it('shows N/A when peakHour is null', () => {
    globalThis.document = { createElement: () => new FakeElement() } as unknown as Document;

    const el = TeamOverviewCards({
      totalInteractions: 0,
      activeMembers: 0,
      peakHour: null,
    }) as unknown as FakeElement;

    expect(el.querySelector('[data-testid="card-peak"]')?.toFlatText()).toContain('N/A');
  });
});
