import { describe, expect, it } from 'vitest';

import { TeamMemberTable } from './TeamMemberTable';

class FakeElement {
  public textContent = '';
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

  toFlatText(): string {
    return [this.textContent, ...this.children.map((c) => c.toFlatText())].join(' ');
  }
}

describe('TeamMemberTable', () => {
  it('renders a row for each member', () => {
    globalThis.document = { createElement: () => new FakeElement() } as unknown as Document;

    const members = [
      { userId: 'user-a', interactions: 10, lastActiveAt: '2026-02-09T14:00:00.000Z', status: 'active' as const },
      { userId: 'user-b', interactions: 3, lastActiveAt: null, status: 'offline' as const },
    ];

    const el = TeamMemberTable(members) as unknown as FakeElement;

    expect(el.getAttribute('data-testid')).toBe('team-member-table');
    expect(el.querySelector('[data-testid="member-row-user-a"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="member-row-user-b"]')).not.toBeNull();
  });

  it('renders status badges with correct text', () => {
    globalThis.document = { createElement: () => new FakeElement() } as unknown as Document;

    const members = [
      { userId: 'user-a', interactions: 5, lastActiveAt: null, status: 'idle' as const },
    ];

    const el = TeamMemberTable(members) as unknown as FakeElement;
    const badge = el.querySelector('[data-testid="status-badge-user-a"]');
    expect(badge?.textContent).toBe('idle');
  });
});
