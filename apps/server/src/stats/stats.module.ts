import { Module } from '@nestjs/common';

import { TenantContextGuard } from '../auth/tenant-context.guard';
import { IngestModule } from '../ingest/ingest.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [IngestModule],
  controllers: [StatsController],
  providers: [StatsService, TenantContextGuard],
})
export class StatsModule {}
