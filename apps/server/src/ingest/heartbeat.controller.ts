import { Controller, Inject, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';

import { TenantAwareRequest, TenantContextGuard } from '../auth/tenant-context.guard';
import { PresenceService } from '../presence/presence.service';

@Controller('v1')
export class HeartbeatController {
  constructor(@Inject(PresenceService) private readonly presenceService: PresenceService) {}

  @Post('ingest/heartbeat')
  @UseGuards(TenantContextGuard)
  heartbeat(@Req() request: TenantAwareRequest) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    this.presenceService.onHeartbeat(tenantContext.tenantId, tenantContext.userId);

    return {
      accepted: true,
    };
  }
}
