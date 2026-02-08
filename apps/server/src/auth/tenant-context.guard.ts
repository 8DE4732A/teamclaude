import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export interface TenantRequestContext {
  tenantId: string;
  userId: string;
}

export interface TenantAwareRequest extends Request {
  tenantContext?: TenantRequestContext;
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const tenantId = request.header('x-tenant-id');
    const userId = request.header('x-user-id');

    if (!tenantId || !userId) {
      throw new UnauthorizedException('Missing tenant context');
    }

    request.tenantContext = {
      tenantId,
      userId,
    };

    return true;
  }
}
