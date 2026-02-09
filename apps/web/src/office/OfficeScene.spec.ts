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
      target: { x: 12, y: 34 },
      isOffline: false,
    });
  });
});
