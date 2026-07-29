import { describe, expect, it } from 'vitest';

import { environmentSchema } from '../src/config/environment.js';

const baseEnvironment = {
  DATABASE_URL: 'postgresql://trackly:trackly@localhost:5432/trackly',
  BETTER_AUTH_SECRET: 'a-secure-random-secret-that-is-long-enough',
};

describe('security environment policy', () => {
  it('keeps development usable and hides production diagnostics by default', () => {
    const development = environmentSchema.parse({
      ...baseEnvironment,
      NODE_ENV: 'development',
    });
    expect(development).toMatchObject({
      AUTH_REQUIRE_EMAIL_VERIFICATION: false,
      EXPOSE_API_DOCS: true,
      ENABLE_DIAGNOSTICS: true,
      TRUST_PROXY: false,
    });

    const production = environmentSchema.parse({
      ...baseEnvironment,
      NODE_ENV: 'production',
      BETTER_AUTH_URL: 'https://api.trackly.example',
      CORS_ORIGINS: 'https://trackly.example',
      BETTER_AUTH_TRUSTED_ORIGINS: 'https://trackly.example',
      WEB_PUSH_VAPID_PUBLIC_KEY: 'public-key',
      WEB_PUSH_VAPID_PRIVATE_KEY: 'private-key',
      WEB_PUSH_SUBJECT: 'mailto:admin@trackly.example',
    });
    expect(production).toMatchObject({
      AUTH_REQUIRE_EMAIL_VERIFICATION: true,
      EXPOSE_API_DOCS: false,
      ENABLE_DIAGNOSTICS: false,
    });
  });

  it('rejects unsafe production origins, secrets, and policy overrides', () => {
    const result = environmentSchema.safeParse({
      ...baseEnvironment,
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'development-only-secret-change-before-production',
      BETTER_AUTH_URL: 'http://localhost:4000',
      CORS_ORIGINS: 'http://localhost:3000',
      BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
      AUTH_REQUIRE_EMAIL_VERIFICATION: 'false',
      ENABLE_DIAGNOSTICS: 'true',
      WEB_PUSH_VAPID_PUBLIC_KEY: 'public-key',
      WEB_PUSH_VAPID_PRIVATE_KEY: 'private-key',
      WEB_PUSH_SUBJECT: 'mailto:admin@trackly.example',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(
      expect.arrayContaining([
        'BETTER_AUTH_URL',
        'CORS_ORIGINS',
        'BETTER_AUTH_TRUSTED_ORIGINS',
        'BETTER_AUTH_SECRET',
        'AUTH_REQUIRE_EMAIL_VERIFICATION',
        'ENABLE_DIAGNOSTICS',
      ]),
    );
  });
});
