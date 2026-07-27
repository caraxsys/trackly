import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { AppError } from '../src/errors/app-error.js';
import { ErrorCode } from '../src/errors/error-codes.js';

describe('backend foundation', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({
      connectionCheck: () => Promise.resolve(),
      logger: false,
    });

    app.get('/test/application-error', () => {
      throw new AppError({
        statusCode: 409,
        code: ErrorCode.ApplicationError,
        message: 'Test application error.',
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns process health without querying PostgreSQL', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        status: 'healthy',
        service: 'trackly-api',
      },
    });
  });

  it('returns readiness when PostgreSQL is available', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        status: 'ready',
        service: 'trackly-api',
      },
    });
  });

  it('returns the standardized not-found response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/missing',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /missing was not found.',
      },
    });
  });

  it('formats application errors consistently', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/application-error',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'APPLICATION_ERROR',
        message: 'Test application error.',
      },
    });
  });

  it('returns HTTP 400 for Zod validation failures', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnostics/validation',
      payload: { value: ' ' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
      },
    });
  });

  it('rejects unauthenticated access to the protected auth endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required.',
      },
    });
  });

  it('returns a valid incoming request ID in the response header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': 'test-request-123',
      },
    });

    expect(response.headers['x-request-id']).toBe('test-request-123');
  });
});
