import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import type { Configuration } from 'openid-client';

import './session.types';
import {
  getOidcConfig,
  buildAuthorizationUrl,
  exchangeCode,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
} from './oidc.config';
import { sign, verify, type JwtPayload } from './jwt.util';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private config: Configuration | null = null;

  async onModuleInit(): Promise<void> {
    try {
      this.config = await getOidcConfig();
      this.logger.log('OIDC discovery completed');
    } catch (error) {
      this.logger.warn('OIDC discovery failed — auth endpoints will not work', error);
    }
  }

  private requireConfig(): Configuration {
    if (!this.config) {
      throw new ServiceUnavailableException(
        'OIDC is not configured. Set OIDC_ISSUER and OIDC_CLIENT_ID in your environment.',
      );
    }
    return this.config;
  }

  generateState(): string {
    return randomPKCECodeVerifier();
  }

  async generateCodeVerifier(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
    return { codeVerifier, codeChallenge };
  }

  getAuthorizationUrl(state: string, codeChallenge: string, redirectUri?: string): string {
    const config = this.requireConfig();
    const callbackUrl = redirectUri ?? process.env.OIDC_CALLBACK_URL ?? 'http://localhost:3000/auth/callback';

    const url = buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return url.href;
  }

  async exchangeCodeForUser(
    currentUrl: URL,
    expectedState: string,
    codeVerifier: string,
  ): Promise<{ sub: string; email?: string; name?: string }> {
    const config = this.requireConfig();
    const tokens = await exchangeCode(config, currentUrl, {
      expectedState,
      pkceCodeVerifier: codeVerifier,
    });

    const claims = tokens.claims();
    if (!claims) {
      throw new Error('No ID token claims in token response');
    }

    return {
      sub: claims.sub,
      email: claims.email as string | undefined,
      name: claims.name as string | undefined,
    };
  }

  getLogoutUrl(returnTo: string): string {
    const issuer = process.env.OIDC_ISSUER ?? '';
    const clientId = process.env.OIDC_CLIENT_ID ?? '';
    const baseUrl = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;

    const params = new URLSearchParams({
      client_id: clientId,
      returnTo,
    });

    return `${baseUrl}/v2/logout?${params.toString()}`;
  }

  private getJwtSecret(): string {
    return process.env.JWT_SECRET || process.env.SESSION_SECRET || 'change-this-to-a-random-string';
  }

  signCliToken(user: { sub: string; email?: string; name?: string }): string {
    const tenantId = process.env.DEFAULT_TENANT_ID ?? 'default';
    return sign(
      { sub: user.sub, email: user.email, name: user.name, tenantId },
      this.getJwtSecret(),
      30 * 24 * 3600, // 30 days
    );
  }

  verifyCliToken(token: string): JwtPayload | null {
    return verify(token, this.getJwtSecret());
  }
}
