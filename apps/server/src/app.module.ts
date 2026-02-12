import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { PresenceGateway } from './gateway/presence.gateway';
import { IngestModule } from './ingest/ingest.module';
import { PresenceModule } from './presence/presence.module';
import { OfficeModule } from './office/office.module';
import { StatsModule } from './stats/stats.module';

const staticRoot =
  process.env.STATIC_ROOT || join(__dirname, '..', '..', 'web', 'dist');

@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: staticRoot }),
    AuthModule,
    IngestModule,
    PresenceModule,
    OfficeModule,
    StatsModule,
  ],
  controllers: [HealthController],
  providers: [PresenceGateway],
})
export class AppModule {}
