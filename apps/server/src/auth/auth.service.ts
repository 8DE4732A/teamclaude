import { Injectable } from '@nestjs/common';

import { TenantRequestContext } from './tenant-context.guard';

@Injectable()
export class AuthService {
  ingestEvent(context: TenantRequestContext, payload: unknown) {
    return {
      accepted: true,
      tenantId: context.tenantId,
      userId: context.userId,
      payload,
    };
  }
}
