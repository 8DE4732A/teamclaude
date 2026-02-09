import type { PresenceEvent } from './OfficeScene';

type Listener = (snapshot: ReadonlyMap<string, PresenceEvent>) => void;

export class PresenceStore {
  private readonly state = new Map<string, PresenceEvent>();
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  update(event: PresenceEvent): void {
    this.state.set(event.userId, event);
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  getState(): ReadonlyMap<string, PresenceEvent> {
    return new Map(this.state);
  }
}
