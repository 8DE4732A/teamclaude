import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { TenantAwareRequest, TenantContextGuard } from '../auth/tenant-context.guard';
import { OfficeService } from './office.service';

@Controller('v1')
export class OfficeController {
  constructor(@Inject(OfficeService) private readonly officeService: OfficeService) {}

  @Get('office/map')
  getMap() {
    return this.officeService.getMap();
  }

  @Get('me')
  @UseGuards(TenantContextGuard)
  getMe(@Req() request: TenantAwareRequest) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    return this.officeService.getMe(tenantContext.tenantId, tenantContext.userId);
  }

  @Post('me/seat')
  @HttpCode(200)
  @UseGuards(TenantContextGuard)
  setSeat(@Req() request: TenantAwareRequest, @Body() body: { seatId?: string }) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    return this.officeService.setSeat(tenantContext.tenantId, tenantContext.userId, body.seatId ?? '');
  }

  @Post('me/avatar')
  @HttpCode(200)
  @UseGuards(TenantContextGuard)
  setAvatar(@Req() request: TenantAwareRequest, @Body() body: { avatarPresetId?: string }) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    return this.officeService.setAvatar(
      tenantContext.tenantId,
      tenantContext.userId,
      body.avatarPresetId ?? '',
    );
  }
}
