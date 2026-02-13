import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRouter } from './router';

class FakeElement {
  public children: FakeElement[] = [];
  public textContent = '';

  replaceChildren(...nodes: FakeElement[]): void {
    this.children = [...nodes];
  }
}

describe('createRouter', () => {
  let hashChangeListeners: (() => void)[];
  let currentHash: string;

  beforeEach(() => {
    hashChangeListeners = [];
    currentHash = '';

    globalThis.window = {
      addEventListener: (_event: string, fn: () => void) => {
        hashChangeListeners.push(fn);
      },
      removeEventListener: (_event: string, fn: () => void) => {
        hashChangeListeners = hashChangeListeners.filter((l) => l !== fn);
      },
      location: {
        get hash() {
          return currentHash;
        },
        set hash(value: string) {
          currentHash = value;
          for (const listener of hashChangeListeners) listener();
        },
      },
    } as unknown as Window & typeof globalThis;

    globalThis.document = {
      createElement: () => new FakeElement(),
    } as unknown as Document;
  });

  afterEach(() => {
    hashChangeListeners = [];
  });

  it('renders fallback route when no hash is set', async () => {
    const officeEl = new FakeElement();
    officeEl.textContent = 'office';
    const container = new FakeElement() as unknown as HTMLElement;

    const router = createRouter(
      [{ path: '/office', render: () => officeEl as unknown as HTMLElement }],
      '/office',
    );
    router.mount(container);

    await vi.waitFor(() => {
      expect((container as unknown as FakeElement).children).toHaveLength(1);
    });

    expect((container as unknown as FakeElement).children[0]).toBe(officeEl);
    router.destroy();
  });

  it('navigates between routes on hashchange', async () => {
    const officeEl = new FakeElement();
    officeEl.textContent = 'office';
    const adminEl = new FakeElement();
    adminEl.textContent = 'admin';
    const container = new FakeElement() as unknown as HTMLElement;

    currentHash = '#/office';

    const router = createRouter(
      [
        { path: '/office', render: () => officeEl as unknown as HTMLElement },
        { path: '/admin', render: () => adminEl as unknown as HTMLElement },
      ],
      '/office',
    );
    router.mount(container);

    await vi.waitFor(() => {
      expect((container as unknown as FakeElement).children[0]).toBe(officeEl);
    });

    router.navigate('/admin');

    await vi.waitFor(() => {
      expect((container as unknown as FakeElement).children[0]).toBe(adminEl);
    });

    router.destroy();
  });

  it('destroy removes hashchange listener', () => {
    const container = new FakeElement() as unknown as HTMLElement;
    currentHash = '#/office';

    const router = createRouter(
      [{ path: '/office', render: () => new FakeElement() as unknown as HTMLElement }],
      '/office',
    );
    router.mount(container);

    expect(hashChangeListeners).toHaveLength(1);
    router.destroy();
    expect(hashChangeListeners).toHaveLength(0);
  });
});
