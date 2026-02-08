import { Injectable } from '@nestjs/common';

import {
  PresenceBroadcastConsumer,
  PresenceService,
  PresenceStateChangedEvent,
  PresenceTargetChangedEvent,
} from '../presence/presence.service';

type SocketServer = {
  to: (room: string) => {
    emit: (event: string, payload: unknown) => void;
  };
};

type SocketClient = {
  handshake?: {
    auth?: {
      tenantId?: string;
    };
    query?: {
      tenantId?: string;
    };
  };
  join?: (room: string) => void;
  emit?: (event: string, payload: unknown) => void;
};

@Injectable()
export class PresenceGateway implements PresenceBroadcastConsumer {
  private server?: SocketServer;

  constructor(private readonly presenceService?: PresenceService) {
    this.presenceService?.registerBroadcastConsumer(this);
  }

  setServer(server: SocketServer): void {
    this.server = server;
  }

  handleConnection(client: SocketClient): void {
    const tenantId = client.handshake?.auth?.tenantId ?? client.handshake?.query?.tenantId;

    if (!tenantId) {
      return;
    }

    const room = this.getTenantRoom(tenantId);
    client.join?.(room);
    client.emit?.('office.userSnapshot', {
      tenantId,
      users: [],
    });
  }

  onStateChanged(event: PresenceStateChangedEvent): void {
    this.broadcastStateChanged(event);
  }

  onTargetChanged(event: PresenceTargetChangedEvent): void {
    this.broadcastTargetChanged(event);
  }

  broadcastStateChanged(event: PresenceStateChangedEvent): void {
    const room = this.getTenantRoom(event.tenantId);
    this.server?.to(room).emit('presence.stateChanged', event);
  }

  broadcastTargetChanged(event: PresenceTargetChangedEvent): void {
    const room = this.getTenantRoom(event.tenantId);
    this.server?.to(room).emit('presence.targetChanged', event);
  }

  private getTenantRoom(tenantId: string): string {
    return `tenant:${tenantId}`;
  }
}
