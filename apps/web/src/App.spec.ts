import { afterEach, describe, expect, it } from 'vitest';

import { App } from './App';
import type { ApiClient } from './api/client';

class FakeElement {
  public textContent = '';
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
    if (!testId) {
      return null;
    }

    const queue = [...this.children];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      if (current.attributes.get('data-testid') === testId) {
        return current;
      }

      queue.push(...current.children);
    }

    return null;
  }

  toFlatText(): string {
    return [this.textContent, ...this.children.map((child) => child.toFlatText())].join(' ');
  }
}

describe('App', () => {
  const previousDocument = globalThis.document;

  afterEach(() => {
    globalThis.document = previousDocument;
  });

  it('renders map placeholder, HUD card, and avatar state', async () => {
    globalThis.document = {
      createElement: () => new FakeElement(),
    } as unknown as Document;

    const apiClient: ApiClient = {
      getOfficeMap: async () => ({ mapId: 'floor-a' }),
      getMe: async () => ({ id: 'u1', name: 'Alice' }),
      getTodayStats: async () => ({ interactions: 5, lastActiveAt: '2026-02-09T10:00:00.000Z' }),
      checkAuth: async () => ({ sub: 'u1', email: 'alice@example.com' }),
    };

    const root = (await App(apiClient)) as unknown as FakeElement;

    expect(root.querySelector('[data-testid="office-map-placeholder"]')?.textContent).toContain('floor-a');
    expect(root.querySelector('[data-testid="user-hud-card"]')?.toFlatText()).toContain('Interactions today: 5');

    const avatarStateText = root.querySelector('[data-testid="avatar-state"]')?.textContent ?? '';
    expect(avatarStateText).toContain('"userId": "u1"');
    expect(avatarStateText).toContain('"state": "Coding"');
    expect(avatarStateText).toContain('"isOffline": false');
  });
});
