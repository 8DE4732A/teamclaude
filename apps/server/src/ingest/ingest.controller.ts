import { Body, Controller, Inject, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';

import { TenantAwareRequest, TenantContextGuard } from '../auth/tenant-context.guard';
import { IngestService } from './ingest.service';

@Controller('v1')
export class IngestController {
  constructor(@Inject(IngestService) private readonly ingestService: IngestService) {}

  @Post('ingest/events')
  @UseGuards(TenantContextGuard)
  async ingestEvents(@Req() request: TenantAwareRequest, @Body() body: unknown) {
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException('Missing tenant context');
    }

    return await this.ingestService.ingestEvent(tenantContext, body);
  }
}
