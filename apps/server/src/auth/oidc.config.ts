import * as client from 'openid-client';

let cachedConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (cachedConfig) return cachedConfig;

  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;

  if (!issuer || !clientId) {
    throw new Error('OIDC_ISSUER and OIDC_CLIENT_ID must be set');
  }

  cachedConfig = await client.discovery(
    new URL(issuer),
    clientId,
    clientSecret || undefined,
  );

  return cachedConfig;
}

export function buildAuthorizationUrl(
  config: client.Configuration,
  params: Record<string, string>,
): URL {
  return client.buildAuthorizationUrl(config, params);
}

export async function exchangeCode(
  config: client.Configuration,
  currentUrl: URL,
  checks: { expectedState: string; pkceCodeVerifier: string },
): Promise<client.TokenEndpointResponse> {
  return client.authorizationCodeGrant(config, currentUrl, {
    expectedState: checks.expectedState,
    pkceCodeVerifier: checks.pkceCodeVerifier,
  });
}

export function randomPKCECodeVerifier(): string {
  return client.randomPKCECodeVerifier();
}

export async function calculatePKCECodeChallenge(
  codeVerifier: string,
): Promise<string> {
  return client.calculatePKCECodeChallenge(codeVerifier);
}

/** Reset cached config (for testing) */
export function resetOidcConfigCache(): void {
  cachedConfig = null;
}
