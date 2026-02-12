import { describe, expect, it } from 'vitest';

import { sign, verify } from './jwt.util';

const SECRET = 'test-secret-key-for-jwt';

describe('jwt.util', () => {
  const payload = {
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    tenantId: 'tenant-1',
  };

  it('sign/verify round-trip returns correct payload', () => {
    const token = sign(payload, SECRET);
    const decoded = verify(token, SECRET);

    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe('user-123');
    expect(decoded!.email).toBe('test@example.com');
    expect(decoded!.name).toBe('Test User');
    expect(decoded!.tenantId).toBe('tenant-1');
    expect(decoded!.iat).toBeTypeOf('number');
    expect(decoded!.exp).toBeTypeOf('number');
    expect(decoded!.exp).toBeGreaterThan(decoded!.iat);
  });

  it('rejects tampered payload', () => {
    const token = sign(payload, SECRET);
    const parts = token.split('.');
    // Tamper with the payload
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...payload, sub: 'hacker', iat: 0, exp: 9999999999 }),
    ).toString('base64url');
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    expect(verify(tampered, SECRET)).toBeNull();
  });

  it('rejects tampered signature', () => {
    const token = sign(payload, SECRET);
    const tampered = token.slice(0, -4) + 'XXXX';

    expect(verify(tampered, SECRET)).toBeNull();
  });

  it('rejects wrong secret', () => {
    const token = sign(payload, SECRET);
    expect(verify(token, 'wrong-secret')).toBeNull();
  });

  it('rejects expired token', () => {
    const token = sign(payload, SECRET, -1); // expired 1 second ago
    expect(verify(token, SECRET)).toBeNull();
  });

  it('rejects malformed token (missing parts)', () => {
    expect(verify('not-a-jwt', SECRET)).toBeNull();
    expect(verify('a.b', SECRET)).toBeNull();
    expect(verify('', SECRET)).toBeNull();
  });

  it('rejects token with invalid base64url body', () => {
    const token = sign(payload, SECRET);
    const parts = token.split('.');
    const broken = `${parts[0]}.!!!invalid!!!.${parts[2]}`;

    expect(verify(broken, SECRET)).toBeNull();
  });
});
