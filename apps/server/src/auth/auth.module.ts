import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantContextGuard } from './tenant-context.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TenantContextGuard],
})
export class AuthModule {}
