import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Logger,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';

import './session.types';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get('login')
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    const state = this.authService.generateState();
    const { codeVerifier, codeChallenge } = await this.authService.generateCodeVerifier();

    req.session.oidcState = state;
    req.session.oidcCodeVerifier = codeVerifier;

    const authUrl = this.authService.getAuthorizationUrl(state, codeChallenge);
    res.redirect(authUrl);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const expectedState = req.session.oidcState;
    const codeVerifier = req.session.oidcCodeVerifier;

    if (!expectedState || !codeVerifier) {
      this.logger.warn('Missing OIDC state or code verifier in session');
      res.redirect('/auth/login');
      return;
    }

    try {
      const callbackUrl = process.env.OIDC_CALLBACK_URL ?? 'http://localhost:3000/auth/callback';
      const currentUrl = new URL(
        `${callbackUrl}?${new URLSearchParams(req.query as Record<string, string>).toString()}`,
      );

      const user = await this.authService.exchangeCodeForUser(currentUrl, expectedState, codeVerifier);

      delete req.session.oidcState;
      delete req.session.oidcCodeVerifier;
      req.session.user = user;

      res.redirect('/');
    } catch (error) {
      this.logger.error('OIDC callback failed', error);
      res.redirect('/auth/login');
    }
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response): void {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
    const logoutUrl = this.authService.getLogoutUrl(apiBaseUrl);

    req.session.destroy(() => {
      res.redirect(logoutUrl);
    });
  }

  @Get('me')
  me(@Req() req: Request): Record<string, unknown> {
    const user = req.session?.user;

    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    return user;
  }

  // ── CLI Plugin Auth ────────────────────────────────────────────

  @Get('cli')
  async cliLogin(@Req() req: Request, @Res() res: Response): Promise<void> {
    const portStr = req.query.port as string | undefined;
    const port = Number(portStr);

    if (!portStr || !Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new BadRequestException('port must be an integer between 1024 and 65535');
    }

    const state = this.authService.generateState();
    const { codeVerifier, codeChallenge } = await this.authService.generateCodeVerifier();

    req.session.oidcState = state;
    req.session.oidcCodeVerifier = codeVerifier;
    req.session.cliPort = port;

    const cliCallbackUrl =
      process.env.OIDC_CLI_CALLBACK_URL ?? 'http://localhost:3000/auth/cli/callback';

    const authUrl = this.authService.getAuthorizationUrl(state, codeChallenge, cliCallbackUrl);
    res.redirect(authUrl);
  }

  @Get('cli/callback')
  async cliCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const expectedState = req.session.oidcState;
    const codeVerifier = req.session.oidcCodeVerifier;
    const cliPort = req.session.cliPort;

    if (!expectedState || !codeVerifier || !cliPort) {
      this.logger.warn('Missing OIDC state, code verifier, or cliPort in session');
      res.redirect('/auth/login');
      return;
    }

    try {
      const cliCallbackUrl =
        process.env.OIDC_CLI_CALLBACK_URL ?? 'http://localhost:3000/auth/cli/callback';
      const currentUrl = new URL(
        `${cliCallbackUrl}?${new URLSearchParams(req.query as Record<string, string>).toString()}`,
      );

      const user = await this.authService.exchangeCodeForUser(currentUrl, expectedState, codeVerifier);

      delete req.session.oidcState;
      delete req.session.oidcCodeVerifier;
      delete req.session.cliPort;

      const token = this.authService.signCliToken(user);
      res.redirect(`http://localhost:${cliPort}/callback?token=${encodeURIComponent(token)}`);
    } catch (error) {
      this.logger.error('CLI OIDC callback failed', error);
      res.redirect('/auth/login');
    }
  }
}
