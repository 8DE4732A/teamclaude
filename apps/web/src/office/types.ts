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
