import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { PresenceGateway } from './gateway/presence.gateway';
import { IngestModule } from './ingest/ingest.module';
import { PresenceModule } from './presence/presence.module';
import { OfficeModule } from './office/office.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [AuthModule, IngestModule, PresenceModule, OfficeModule, StatsModule],
  controllers: [HealthController],
  providers: [PresenceGateway],
})
export class AppModule {}
