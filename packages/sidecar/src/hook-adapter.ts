export const ALLOWED_EVENT_FIELDS = [
  'eventId',
  'tenantId',
  'userId',
  'deviceId',
  'eventType',
  'ts',
  'durationMs',
  'tokenUsage',
  'projectHash',
] as const;

export type AllowedEventField = (typeof ALLOWED_EVENT_FIELDS)[number];

export interface SidecarEvent {
  eventId: string;
  tenantId?: string;
  userId?: string;
  deviceId?: string;
  eventType?: string;
  ts?: string;
  durationMs?: number;
  tokenUsage?: number;
  projectHash?: string;
}

const ALLOWED_FIELD_SET = new Set<string>(ALLOWED_EVENT_FIELDS);

export function adaptHookEvent(input: Record<string, unknown>): SidecarEvent {
  const event: Partial<SidecarEvent> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_FIELD_SET.has(key)) {
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    switch (key) {
      case 'durationMs':
      case 'tokenUsage': {
        if (typeof value === 'number') {
          event[key] = value;
        }
        break;
      }
      default: {
        if (typeof value === 'string') {
          event[key as Exclude<AllowedEventField, 'durationMs' | 'tokenUsage'>] = value;
        }
      }
    }
  }

  if (!event.eventId || typeof event.eventId !== 'string' || event.eventId.trim().length === 0) {
    throw new Error('eventId is required');
  }

  return event as SidecarEvent;
}
