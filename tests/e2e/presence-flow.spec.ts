import '../../apps/server/node_modules/reflect-metadata';

import { afterAll, beforeAll, describe, expect, it } from '../../apps/server/node_modules/vitest';

import { NestFactory } from '../../apps/server/node_modules/@nestjs/core';
import { AppModule } from '../../apps/server/src/app.module';
import { PresenceGateway } from '../../apps/server/src/gateway/presence.gateway';

type PresenceEvent = {
  event: string;
  payload: {
    state?: string;
    tenantId?: string;
    userId?: string;
  };
};

describe('Presence flow (e2e)', () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let baseUrl: string;
  const eventStore: PresenceEvent[] = [];

  beforeAll(async () => {
    app = await NestFactory.create(AppModule);

    const gateway = app.get(PresenceGateway);
    gateway.setServer({
      to: () => ({
        emit: (event: string, payload: unknown) => {
          eventStore.push({
            event,
            payload: payload as PresenceEvent['payload'],
          });
        },
      }),
    });

    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('emits stateChanged(Coding) within 2 seconds after ingest event', async () => {
    const startedAt = Date.now();

    const ingestResponse = await fetch(`${baseUrl}/v1/ingest/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'tenant-e2e',
        'x-user-id': 'user-e2e',
      },
      body: JSON.stringify({
        eventId: 'evt-e2e-1',
        eventType: 'heartbeat',
      }),
    });

    expect(ingestResponse.status).toBe(201);

    const stateChanged = eventStore.find(
      (event) =>
        event.event === 'presence.stateChanged' &&
        event.payload?.tenantId === 'tenant-e2e' &&
        event.payload?.userId === 'user-e2e' &&
        event.payload?.state === 'Coding',
    );

    expect(stateChanged).toBeDefined();
    expect(Date.now() - startedAt).toBeLessThanOrEqual(2000);
  });
});
