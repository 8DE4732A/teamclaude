import { Module } from '@nestjs/common';

import { TenantContextGuard } from '../auth/tenant-context.guard';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { EventRepository } from './repositories/event.repository';

@Module({
  controllers: [IngestController],
  providers: [IngestService, EventRepository, TenantContextGuard],
})
export class IngestModule {}
