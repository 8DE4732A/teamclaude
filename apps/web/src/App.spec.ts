import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { ApiClient } from './api/client';

vi.mock('phaser', () => {
  return {
    default: {
      AUTO: 0,
      Scene: class {},
      Game: class {
        scene = { start: vi.fn() };
        destroy = vi.fn();
      },
    },
  };
});

vi.mock('./office/phaser/create-game', () => ({
  createPhaserGame: vi.fn(() => ({
    destroy: vi.fn(),
  })),
}));

class FakeElement {
  public textContent = '';
  public tagName = 'div';
  public style: Record<string, string> = {};
  public width = 0;
  public height = 0;
  private readonly attributes = new Map<string, string>();
  private readonly children: FakeElement[] = [];
  private readonly eventListeners = new Map<string, Function[]>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  remove(): void {
    // no-op in test
  }

  addEventListener(type: string, cb: Function): void {
    const list = this.eventListeners.get(type) ?? [];
    list.push(cb);
    this.eventListeners.set(type, list);
  }

  removeEventListener(type: string, _cb: Function): void {
    this.eventListeners.delete(type);
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 960, height: 640 };
  }

  getContext() {
    return {
      fillStyle: '',
      globalAlpha: 1,
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };
  }

  querySelector(selector: string): FakeElement | null {
    const testId = selector.match(/^\[data-testid="(.+)"\]$/)?.[1];
    if (!testId) return null;

    const queue = [...this.children];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (current.attributes.get('data-testid') === testId) return current;
      queue.push(...current.children);
    }
    return null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const testId = selector.match(/^\[data-testid="(.+)"\]$/)?.[1];
    if (!testId) return [];

    const results: FakeElement[] = [];
    const queue = [...this.children];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (current.attributes.get('data-testid') === testId) results.push(current);
      queue.push(...current.children);
    }
    return results;
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

  it('renders game container and HUD card', async () => {
    globalThis.document = {
      createElement: () => new FakeElement(),
    } as unknown as Document;

    const apiClient: ApiClient = {
      getOfficeMap: async () => ({
        mapId: 'default-office-map',
        gridWidth: 30,
        gridHeight: 20,
        desks: [
          { id: 'desk-1', gridX: 5, gridY: 4, seatX: 5, seatY: 5 },
        ],
        spawnPoint: { x: 15, y: 18 },
      }),
      getMe: async () => ({ id: 'u1', name: 'Alice', seatId: 'desk-1' }),
      getTodayStats: async () => ({ interactions: 5, lastActiveAt: '2026-02-09T10:00:00.000Z', heatmap: [] }),
      getTeamTrend: async () => [],
      getTeamMembers: async () => ({
        members: [],
        summary: { totalInteractions: 0, activeMembers: 0, peakHour: null },
        heatmap: [],
      }),
      checkAuth: async () => ({ sub: 'u1', email: 'alice@example.com' }),
    };

    const root = (await App(apiClient)) as unknown as FakeElement;

    // Game container should exist
    const gameContainer = root.querySelector('[data-testid="office-game"]');
    expect(gameContainer).not.toBeNull();

    // HUD card should exist (bottom stats)
    const hudCard = root.querySelector('[data-testid="user-hud-card"]');
    expect(hudCard).not.toBeNull();
    expect(hudCard!.toFlatText()).toContain('Interactions today: 5');
  });
});
