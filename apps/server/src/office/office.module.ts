import { Module } from '@nestjs/common';

import { TenantContextGuard } from '../auth/tenant-context.guard';
import { OfficeController } from './office.controller';
import { OfficeService } from './office.service';

@Module({
  controllers: [OfficeController],
  providers: [OfficeService, TenantContextGuard],
})
export class OfficeModule {}
