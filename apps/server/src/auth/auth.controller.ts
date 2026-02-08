import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { TenantAwareRequest, TenantContextGuard } from './tenant-context.guard';

@Controller('v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('ingest/events')
  @UseGuards(TenantContextGuard)
  ingestEvents(@Req() request: TenantAwareRequest, @Body() body: unknown) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new Error('Tenant context should be set by TenantContextGuard');
    }

    return this.authService.ingestEvent(tenantContext, body);
  }
}
