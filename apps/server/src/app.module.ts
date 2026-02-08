import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { IngestModule } from './ingest/ingest.module';

@Module({
  imports: [AuthModule, IngestModule],
  controllers: [HealthController],
})
export class AppModule {}
