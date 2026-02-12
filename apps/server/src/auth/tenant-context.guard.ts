import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import './session.types';
import { AuthService } from './auth.service';

export interface TenantRequestContext {
  tenantId: string;
  userId: string;
}

export interface TenantAwareRequest extends Request {
  tenantContext?: TenantRequestContext;
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();

    // Strategy 1: Session-based (browser users)
    const sessionUser = request.session?.user;
    if (sessionUser) {
      const tenantId = process.env.DEFAULT_TENANT_ID ?? 'default';
      request.tenantContext = {
        tenantId,
        userId: sessionUser.sub,
      };
      return true;
    }

    // Strategy 2: Bearer JWT (CLI plugins)
    const authHeader = request.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = this.authService.verifyCliToken(token);
      if (!payload) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      request.tenantContext = {
        tenantId: payload.tenantId,
        userId: payload.sub,
      };
      return true;
    }

    // Strategy 3: Header-based fallback (sidecar plugins)
    const tenantId = request.header('x-tenant-id');
    const userId = request.header('x-user-id');

    if (tenantId && userId) {
      request.tenantContext = {
        tenantId,
        userId,
      };
      return true;
    }

    throw new UnauthorizedException('Missing tenant context');
  }
}
