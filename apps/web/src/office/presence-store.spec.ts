import { describe, expect, it, vi } from 'vitest';

import { PresenceStore } from './presence-store';

describe('PresenceStore', () => {
  it('replays initial snapshot on subscribe', () => {
    const store = new PresenceStore();
    store.update({ userId: 'u1', state: 'Coding', target: { x: 1, y: 2 } });

    const listener = vi.fn();
    store.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    const snapshot = listener.mock.calls[0][0] as ReadonlyMap<string, unknown>;
    expect(snapshot.get('u1')).toMatchObject({ state: 'Coding', target: { x: 1, y: 2 } });
  });

  it('notifies subscribers on update', () => {
    const store = new PresenceStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ userId: 'u2', state: 'Idle', target: { x: 3, y: 4 } });

    expect(listener).toHaveBeenCalledTimes(2);
    const snapshot = listener.mock.calls[1][0] as ReadonlyMap<string, unknown>;
    expect(snapshot.get('u2')).toMatchObject({ state: 'Idle', target: { x: 3, y: 4 } });
  });

  it('stops notifying after unsubscribe', () => {
    const store = new PresenceStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.update({ userId: 'u3', state: 'Offline' });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
