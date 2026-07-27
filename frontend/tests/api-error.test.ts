import { describe, expect, it } from 'vitest';

import { ApiError, normalizeApiError } from '@/services/api-error';

describe('API error normalization', () => {
  it('normalizes the backend error envelope', () => {
    const result = normalizeApiError({
      isAxiosError: true,
      response: {
        status: 400,
        headers: { 'x-request-id': 'request-42' },
        data: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed.',
            details: [{ path: 'value', message: 'Required' }],
          },
        },
      },
    });

    expect(result).toBeInstanceOf(ApiError);
    expect(result).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
      status: 400,
      requestId: 'request-42',
    });
  });
});
