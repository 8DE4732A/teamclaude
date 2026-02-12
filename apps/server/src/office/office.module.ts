import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TenantContextGuard } from '../auth/tenant-context.guard';
import { OfficeController } from './office.controller';
import { OfficeService } from './office.service';

@Module({
  imports: [AuthModule],
  controllers: [OfficeController],
  providers: [OfficeService, TenantContextGuard],
})
export class OfficeModule {}
