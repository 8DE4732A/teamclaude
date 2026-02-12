import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  tenantId: string;
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

const HEADER = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

function hmacSign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function sign(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, expiresInSeconds = 30 * 24 * 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const body = base64url(JSON.stringify(full));
  const signature = hmacSign(`${HEADER}.${body}`, secret);
  return `${HEADER}.${body}.${signature}`;
}

export function verify(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const expectedSig = hmacSign(`${header}.${body}`, secret);

  // Timing-safe comparison
  const sigBuf = base64urlDecode(sig);
  const expectedBuf = base64urlDecode(expectedSig);

  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(base64urlDecode(body).toString('utf8')) as JwtPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
