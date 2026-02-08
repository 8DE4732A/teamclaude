import { Body, Controller, Inject, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { TenantAwareRequest, TenantContextGuard } from './tenant-context.guard';

@Controller('v1')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('ingest/events')
  @UseGuards(TenantContextGuard)
  ingestEvents(@Req() request: TenantAwareRequest, @Body() body: unknown) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    return this.authService.ingestEvent(tenantContext, body);
  }
}
