import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { buildApp } from '../src/app.js';

const originalEnvironment = { ...process.env };

describe('production endpoint exposure', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    vi.resetModules();
    Object.assign(process.env, {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://trackly:trackly@localhost:5432/trackly',
      BETTER_AUTH_SECRET: 'production-random-secret-value-0123456789abcdef',
      BETTER_AUTH_URL: 'https://api.trackly.example',
      BETTER_AUTH_TRUSTED_ORIGINS: 'https://trackly.example',
      CORS_ORIGINS: 'https://trackly.example',
      WEB_PUSH_VAPID_PUBLIC_KEY: 'public-key',
      WEB_PUSH_VAPID_PRIVATE_KEY: 'private-key',
      WEB_PUSH_SUBJECT: 'mailto:admin@trackly.example',
    });
    delete process.env.EXPOSE_API_DOCS;
    delete process.env.ENABLE_DIAGNOSTICS;

    const { buildApp } = await import('../src/app.js');
    app = await buildApp({
      connectionCheck: () => Promise.resolve(),
      logger: false,
    });
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnvironment;
  });

  it('does not register Swagger or temporary diagnostics by default', async () => {
    const [swagger, diagnostics, health] = await Promise.all([
      app.inject({ method: 'GET', url: '/docs' }),
      app.inject({
        method: 'POST',
        url: '/api/v1/diagnostics/validation',
        payload: { value: 'test' },
      }),
      app.inject({ method: 'GET', url: '/health' }),
    ]);

    expect(swagger.statusCode).toBe(404);
    expect(diagnostics.statusCode).toBe(404);
    expect(health.headers['content-security-policy']).not.toContain(
      "'unsafe-inline'",
    );
  });
});
