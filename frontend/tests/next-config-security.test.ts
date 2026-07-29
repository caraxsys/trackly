import { describe, expect, it } from 'vitest';

import nextConfig, { createContentSecurityPolicy } from '../next.config';

describe('frontend security headers', () => {
  it('uses a production CSP without unsafe eval or wildcard sources', () => {
    const policy = createContentSecurityPolicy(
      'production',
      'https://api.trackly.example',
    );

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("connect-src 'self' https://api.trackly.example");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("worker-src 'self'");
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain('*');
  });

  it('configures CSP and complementary response headers', async () => {
    const headers = await nextConfig.headers?.();
    const configured = new Map(
      headers?.[0]?.headers.map(({ key, value }) => [key, value]),
    );

    expect(configured.get('Content-Security-Policy')).toBeDefined();
    expect(configured.get('X-Content-Type-Options')).toBe('nosniff');
    expect(configured.get('X-Frame-Options')).toBe('DENY');
    expect(configured.get('Permissions-Policy')).not.toContain('camera=*');
  });
});
