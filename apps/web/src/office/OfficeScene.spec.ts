import { describe, expect, it } from 'vitest';

import { OfficeScene } from './OfficeScene';

describe('OfficeScene', () => {
  it('moves avatar back to workstation target on Coding presence event', () => {
    const scene = new OfficeScene();

    scene.applyPresence({
      userId: 'user-1',
      state: 'Coding',
      target: { x: 12, y: 34 },
    });

    expect(scene.getAvatar('user-1')).toMatchObject({
      userId: 'user-1',
      state: 'Coding',
      target: { x: 12, y: 34 },
      isOffline: false,
    });
  });

  it('keeps prior target when Idle event has no target', () => {
    const scene = new OfficeScene();

    scene.applyPresence({
      userId: 'user-1',
      state: 'Coding',
      target: { x: 3, y: 4 },
    });
    scene.applyPresence({
      userId: 'user-1',
      state: 'Idle',
    });

    expect(scene.getAvatar('user-1')).toMatchObject({
      userId: 'user-1',
      state: 'Idle',
      target: { x: 3, y: 4 },
      isOffline: false,
    });
  });

  it('marks avatar as offline on Offline event', () => {
    const scene = new OfficeScene();

    scene.applyPresence({
      userId: 'user-1',
      state: 'Coding',
      target: { x: 9, y: 9 },
    });
    scene.applyPresence({
      userId: 'user-1',
      state: 'Offline',
    });

    expect(scene.getAvatar('user-1')).toMatchObject({
      userId: 'user-1',
      state: 'Offline',
      target: { x: 9, y: 9 },
      isOffline: true,
    });
  });
});
