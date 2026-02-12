import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TenantContextGuard } from '../auth/tenant-context.guard';
import { PresenceModule } from '../presence/presence.module';
import { HeartbeatController } from './heartbeat.controller';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { EventRepository } from './repositories/event.repository';

@Module({
  imports: [PresenceModule, AuthModule],
  controllers: [IngestController, HeartbeatController],
  providers: [IngestService, EventRepository, TenantContextGuard],
  exports: [EventRepository],
})
export class IngestModule {}
