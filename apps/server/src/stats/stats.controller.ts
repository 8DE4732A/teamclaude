import { Controller, Get, Inject, Req, UnauthorizedException, UseGuards } from '@nestjs/common';

import { TenantAwareRequest, TenantContextGuard } from '../auth/tenant-context.guard';
import { StatsService } from './stats.service';

@Controller('v1/stats')
export class StatsController {
  constructor(@Inject(StatsService) private readonly statsService: StatsService) {}

  @Get('me/today')
  @UseGuards(TenantContextGuard)
  async getMyToday(@Req() request: TenantAwareRequest) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    return await this.statsService.getMyToday(tenantContext.tenantId, tenantContext.userId);
  }

  @Get('team/trend')
  @UseGuards(TenantContextGuard)
  async getTeamTrend(@Req() request: TenantAwareRequest) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    return await this.statsService.getTeamTrend(tenantContext.tenantId);
  }

  @Get('team/members')
  @UseGuards(TenantContextGuard)
  async getTeamMembers(@Req() request: TenantAwareRequest) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    return await this.statsService.getTeamMembers(tenantContext.tenantId);
  }
}
