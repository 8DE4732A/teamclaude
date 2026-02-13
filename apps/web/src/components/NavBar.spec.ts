import { describe, expect, it } from 'vitest';

import { NavBar } from './NavBar';

class FakeElement {
  public textContent = '';
  public style = { cssText: '' };
  public href = '';
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

  querySelectorAll(selector: string): FakeElement[] {
    const testIdMatch = selector.match(/^\[data-testid\^="(.+)"\]$/);
    if (!testIdMatch) return [];
    const prefix = testIdMatch[1];
    return this.children.filter((c) => (c.attributes.get('data-testid') ?? '').startsWith(prefix));
  }

  querySelector(selector: string): FakeElement | null {
    const testId = selector.match(/^\[data-testid="(.+)"\]$/)?.[1];
    if (!testId) return null;
    return this.children.find((c) => c.attributes.get('data-testid') === testId) ?? null;
  }
}

describe('NavBar', () => {
  it('renders navigation links for each item', () => {
    globalThis.document = { createElement: () => new FakeElement() } as unknown as Document;

    const items = [
      { label: 'Office', path: '/office' },
      { label: 'Admin', path: '/admin' },
    ];

    const nav = NavBar(items, '/office') as unknown as FakeElement;

    expect(nav.getAttribute('data-testid')).toBe('nav-bar');
    const links = nav.querySelectorAll('[data-testid^="nav-link"]');
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe('Office');
    expect(links[1].textContent).toBe('Admin');
  });

  it('highlights the active route', () => {
    globalThis.document = { createElement: () => new FakeElement() } as unknown as Document;

    const items = [
      { label: 'Office', path: '/office' },
      { label: 'Admin', path: '/admin' },
    ];

    const nav = NavBar(items, '/admin') as unknown as FakeElement;

    const adminLink = nav.querySelector('[data-testid="nav-link-admin"]');
    expect(adminLink?.style.cssText).toContain('#4fc3f7');
  });
});
