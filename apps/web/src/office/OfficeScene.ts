export type PresenceState = 'Coding' | 'Idle' | 'Offline';

export interface Position {
  x: number;
  y: number;
}

export interface PresenceEvent {
  userId: string;
  state: PresenceState;
  target?: Position;
}

export interface AvatarState {
  userId: string;
  state: PresenceState;
  target?: Position;
  isOffline: boolean;
}

export class OfficeScene {
  private readonly avatars = new Map<string, AvatarState>();

  applyPresence(event: PresenceEvent): void {
    const current = this.avatars.get(event.userId);
    const next: AvatarState = {
      userId: event.userId,
      state: event.state,
      target: current?.target,
      isOffline: false,
    };

    if (event.state === 'Coding') {
      next.target = event.target;
    }

    if (event.state === 'Idle') {
      next.target = event.target ?? current?.target;
    }

    if (event.state === 'Offline') {
      next.isOffline = true;
    }

    this.avatars.set(event.userId, next);
  }

  getAvatar(userId: string): AvatarState | undefined {
    return this.avatars.get(userId);
  }
}
