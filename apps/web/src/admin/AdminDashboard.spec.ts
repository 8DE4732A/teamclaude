import { describe, expect, it } from 'vitest';

import { AdminDashboard } from './AdminDashboard';
import type { ApiClient } from '../api/client';

class FakeElement {
  public textContent = '';
  public style = { cssText: '' };
  public title = '';
  public href = '';
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
}

describe('AdminDashboard', () => {
  it('renders overview cards, trend chart, heatmap, and member table', async () => {
    globalThis.document = {
      createElement: () => new FakeElement('div'),
      createElementNS: (_ns: string, tag: string) => new FakeElement(tag),
    } as unknown as Document;

    const apiClient: ApiClient = {
      getOfficeMap: async () => ({ mapId: 'test' }),
      getMe: async () => ({ id: 'u1', name: 'Alice' }),
      getTodayStats: async () => ({ interactions: 0, lastActiveAt: null, heatmap: [] }),
      checkAuth: async () => ({ sub: 'u1' }),
      getTeamTrend: async () => [
        { date: '2026-02-09', interactions: 5 },
      ],
      getTeamMembers: async () => ({
        members: [
          { userId: 'user-a', interactions: 10, lastActiveAt: '2026-02-09T14:00:00.000Z', status: 'active' as const },
        ],
        summary: { totalInteractions: 10, activeMembers: 1, peakHour: 14 },
        heatmap: Array.from({ length: 24 }, (_, i) => ({ hour: i, interactions: i === 14 ? 10 : 0 })),
      }),
    };

    const root = (await AdminDashboard(apiClient)) as unknown as FakeElement;

    expect(root.getAttribute('data-testid')).toBe('admin-dashboard');
    expect(root.querySelector('[data-testid="team-overview-cards"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="team-trend-chart"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="activity-heatmap"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="team-member-table"]')).not.toBeNull();
  });
});
