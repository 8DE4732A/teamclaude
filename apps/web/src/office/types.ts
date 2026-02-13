export type PresenceState = 'Coding' | 'Idle' | 'Offline';

export type AnimationType =
  | 'idle-stand'
  | 'walk-down'
  | 'walk-up'
  | 'walk-left'
  | 'walk-right'
  | 'typing';

export interface Position {
  x: number;
  y: number;
}

export interface PresenceEvent {
  userId: string;
  state: PresenceState;
  target?: Position;
}
