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

  it('returns a standardized HTTP 400 for an empty JSON body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/habits/00000000-0000-4000-8000-000000000000/deactivate',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'The request body is not valid JSON.',
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

  it('rejects unauthenticated habit collection and detail requests', async () => {
    const [collection, detail] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/habits' }),
      app.inject({
        method: 'GET',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000',
      }),
    ]);

    expect(collection.statusCode).toBe(401);
    expect(detail.statusCode).toBe(401);
    expect(collection.json()).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('validates habit streak identifiers and requires authentication', async () => {
    const [invalid, unauthenticated] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/api/v1/habits/not-a-uuid/streak',
      }),
      app.inject({
        method: 'GET',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000/streak',
      }),
    ]);

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(unauthenticated.statusCode).toBe(401);
    expect(unauthenticated.json()).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('documents the habit streak endpoint and standard responses', () => {
    const document = app.swagger();
    const operation = document.paths?.['/api/v1/habits/{id}/streak']?.get;

    expect(operation).toBeDefined();
    for (const status of ['200', '400', '401', '404', '500']) {
      expect(operation?.responses?.[status]).toBeDefined();
    }
  });

  it('validates analytics queries and rejects unauthenticated access', async () => {
    const invalidResponses = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/api/v1/analytics/summary?period=year',
      }),
      app.inject({
        method: 'GET',
        url: '/api/v1/analytics/summary?period=week&date=2026-02-30',
      }),
      app.inject({
        method: 'GET',
        url: '/api/v1/analytics/summary',
      }),
    ]);
    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/summary?period=week',
    });

    expect(invalidResponses.every(({ statusCode }) => statusCode === 400)).toBe(
      true,
    );
    expect(unauthenticated.statusCode).toBe(401);
    expect(unauthenticated.json()).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('defaults, validates, protects, and documents analytics history', async () => {
    const [defaultQuery, invalidPeriod, invalidGranularity] = await Promise.all(
      [
        app.inject({ method: 'GET', url: '/api/v1/analytics/history' }),
        app.inject({
          method: 'GET',
          url: '/api/v1/analytics/history?period=1y',
        }),
        app.inject({
          method: 'GET',
          url: '/api/v1/analytics/history?granularity=week',
        }),
      ],
    );

    expect(defaultQuery.statusCode).toBe(401);
    expect(defaultQuery.json()).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
    expect(invalidPeriod.statusCode).toBe(400);
    expect(invalidGranularity.statusCode).toBe(400);

    const operation = app.swagger().paths?.['/api/v1/analytics/history']?.get;
    expect(operation).toBeDefined();
    for (const status of ['200', '400', '401', '500']) {
      expect(operation?.responses?.[status]).toBeDefined();
    }
  });

  it('defaults, validates, protects, and documents analytics insights', async () => {
    const [defaultQuery, invalidPeriod] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/analytics/insights' }),
      app.inject({
        method: 'GET',
        url: '/api/v1/analytics/insights?period=1y',
      }),
    ]);

    expect(defaultQuery.statusCode).toBe(401);
    expect(defaultQuery.json()).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
    expect(invalidPeriod.statusCode).toBe(400);

    const operation = app.swagger().paths?.['/api/v1/analytics/insights']?.get;
    expect(operation).toBeDefined();
    for (const status of ['200', '400', '401', '500']) {
      expect(operation?.responses?.[status]).toBeDefined();
    }
  });

  it('defaults, validates, protects, and documents analytics heatmap', async () => {
    const [defaultQuery, invalidPeriod] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/analytics/heatmap' }),
      app.inject({
        method: 'GET',
        url: '/api/v1/analytics/heatmap?period=30d',
      }),
    ]);

    expect(defaultQuery.statusCode).toBe(401);
    expect(defaultQuery.json()).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
    expect(invalidPeriod.statusCode).toBe(400);

    const operation = app.swagger().paths?.['/api/v1/analytics/heatmap']?.get;
    expect(operation).toBeDefined();
    for (const status of ['200', '400', '401', '500']) {
      expect(operation?.responses?.[status]).toBeDefined();
    }
  });

  it.each(['categories', 'habits'])(
    'validates, protects, and documents analytics %s rankings',
    async (resource) => {
      const unauthorized = await app.inject({
        method: 'GET',
        url: `/api/v1/analytics/${resource}`,
      });
      const invalid = await app.inject({
        method: 'GET',
        url: `/api/v1/analytics/${resource}?period=365d`,
      });
      expect(unauthorized.statusCode).toBe(401);
      expect(invalid.statusCode).toBe(400);
      expect(
        app.swagger().paths?.[`/api/v1/analytics/${resource}`]?.get,
      ).toBeDefined();
    },
  );

  it('protects, validates, and documents Goal CRUD routes', async () => {
    const unauthorized = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/goals' }),
      app.inject({
        method: 'GET',
        url: `/api/v1/goals/${crypto.randomUUID()}`,
      }),
      app.inject({ method: 'POST', url: '/api/v1/goals', payload: {} }),
      app.inject({
        method: 'PATCH',
        url: `/api/v1/goals/${crypto.randomUUID()}`,
        payload: {},
      }),
      app.inject({
        method: 'DELETE',
        url: `/api/v1/goals/${crypto.randomUUID()}`,
      }),
    ]);
    expect(unauthorized[0].statusCode).toBe(401);
    expect(unauthorized[1].statusCode).toBe(401);
    expect(unauthorized[2].statusCode).toBe(400);
    expect(unauthorized[3].statusCode).toBe(400);
    expect(unauthorized[4].statusCode).toBe(401);
    for (const path of ['/api/v1/goals', '/api/v1/goals/{id}']) {
      expect(app.swagger().paths?.[path]).toBeDefined();
    }
    const document = app.swagger();
    expect(
      JSON.stringify(
        document.paths?.['/api/v1/goals/{id}']?.get?.responses?.['200'],
      ),
    ).toContain('"progress"');
    const createOperation = document.paths?.['/api/v1/goals']?.post;
    expect(createOperation && 'requestBody' in createOperation).toBe(true);
    if (createOperation && 'requestBody' in createOperation) {
      expect(JSON.stringify(createOperation.requestBody)).not.toContain(
        '"progress"',
      );
    }
  });

  it('validates habit collection query parameters and detail UUIDs', async () => {
    const invalidQueries = await Promise.all(
      [
        'date=2026-02-30',
        'view=deleted',
        'page=0',
        'limit=101',
        'sort=unknown',
        'order=sideways',
      ].map((query) =>
        app.inject({ method: 'GET', url: `/api/v1/habits?${query}` }),
      ),
    );
    const invalidId = await app.inject({
      method: 'GET',
      url: '/api/v1/habits/not-a-uuid',
    });

    expect(
      invalidQueries.every((response) => response.statusCode === 400),
    ).toBe(true);
    expect(invalidId.statusCode).toBe(400);
  });

  it('requires authentication for all valid habit mutation requests', async () => {
    const requests = [
      app.inject({
        method: 'POST',
        url: '/api/v1/habits',
        payload: {
          name: 'Read',
          frequencyType: 'daily',
          startDate: '2026-01-01',
        },
      }),
      app.inject({
        method: 'PATCH',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000',
        payload: { name: 'Read more' },
      }),
      app.inject({
        method: 'DELETE',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000',
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000/activate',
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000/deactivate',
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000/check-in',
        payload: { completedCount: 1 },
      }),
    ];

    const responses = await Promise.all(requests);
    expect(responses.every((response) => response.statusCode === 401)).toBe(
      true,
    );
  });

  it('rejects malformed habit mutation payloads', async () => {
    const responses = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/habits',
        payload: {
          name: ' ',
          frequencyType: 'daily',
          startDate: '2026-01-01',
        },
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/habits',
        payload: {
          name: 'Read',
          frequencyType: 'weekly',
          startDate: '2026-01-01',
          weekdays: [1, 1],
        },
      }),
      app.inject({
        method: 'PATCH',
        url: '/api/v1/habits/not-a-uuid',
        payload: { name: 'Read' },
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000/check-in',
        payload: { date: '2026-02-30', completedCount: 1 },
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/habits/00000000-0000-4000-8000-000000000000/check-in',
        payload: { completedCount: -1 },
      }),
    ]);

    expect(responses.every((response) => response.statusCode === 400)).toBe(
      true,
    );
  });

  it('rejects unauthenticated Today and category reads', async () => {
    const [today, categories] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/today' }),
      app.inject({ method: 'GET', url: '/api/v1/categories' }),
    ]);

    expect(today.statusCode).toBe(401);
    expect(categories.statusCode).toBe(401);
  });

  it('rejects malformed and impossible Today dates', async () => {
    for (const date of ['2026-2-3', '2026-02-30', '2026-02-03T00:00:00Z']) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/today?date=${encodeURIComponent(date)}`,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
        error: { code: 'VALIDATION_ERROR' },
      });
    }
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

  it('allows browser preflights for habit mutation methods', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/habits/00000000-0000-4000-8000-000000000000',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'content-type,x-request-id',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
    expect(response.headers['access-control-allow-methods']).toContain(
      'DELETE',
    );
  });
});
