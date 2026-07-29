import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

describe('application rate limiting', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({
      connectionCheck: () => Promise.resolve(),
      logger: false,
    });
    app.post('/api/v1/test-rate-limit', () => ({ success: true }));
  });

  afterAll(async () => app.close());

  it('returns the standard 429 response for mutation abuse', async () => {
    const responses = [];
    for (let attempt = 0; attempt < 31; attempt += 1) {
      responses.push(
        await app.inject({ method: 'POST', url: '/api/v1/test-rate-limit' }),
      );
    }
    const limited = responses.at(-1);

    expect(limited?.statusCode).toBe(429);
    expect(limited?.json()).toEqual({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
    expect(limited?.headers['retry-after']).toBeDefined();
  });
});
