import { describe, expect, it, vi } from 'vitest';

import { resolveSession } from '../src/auth/session.js';

describe('session resolution', () => {
  it('preserves a valid unauthenticated result', async () => {
    await expect(resolveSession(vi.fn().mockResolvedValue(null))).resolves.toBe(
      null,
    );
  });

  it('reports session dependency failures as service unavailable', async () => {
    const failure = new Error('database connection details');

    await expect(
      resolveSession(vi.fn().mockRejectedValue(failure)),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'The authentication service is temporarily unavailable.',
      cause: failure,
    });
  });
});
