import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { PresenceGateway } from './gateway/presence.gateway';
import { IngestModule } from './ingest/ingest.module';
import { PresenceModule } from './presence/presence.module';

@Module({
  imports: [AuthModule, IngestModule, PresenceModule],
  controllers: [HealthController],
  providers: [PresenceGateway],
})
export class AppModule {}
