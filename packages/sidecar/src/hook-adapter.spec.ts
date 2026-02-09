import { describe, expect, it } from 'vitest';

import { adaptHookEvent } from './hook-adapter';

describe('adaptHookEvent', () => {
  it('keeps only whitelist fields and drops sensitive fields', () => {
    const event = adaptHookEvent({
      eventId: 'evt-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      eventType: 'command',
      durationMs: 120,
      tokenUsage: 33,
      projectHash: 'proj-hash',
      prompt: 'secret prompt',
      code: 'sensitive source code',
      codeContent: 'sensitive source code',
    });

    expect(event).toEqual({
      eventId: 'evt-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      eventType: 'command',
      durationMs: 120,
      tokenUsage: 33,
      projectHash: 'proj-hash',
    });
    expect(event).not.toHaveProperty('prompt');
    expect(event).not.toHaveProperty('code');
    expect(event).not.toHaveProperty('codeContent');
  });

  it('throws when eventId is missing or blank', () => {
    expect(() => adaptHookEvent({ tenantId: 'tenant-1' })).toThrow('eventId is required');
    expect(() => adaptHookEvent({ eventId: '   ' })).toThrow('eventId is required');
  });
});
