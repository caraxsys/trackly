import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchServer: vi.fn() }));

vi.mock('@/services/server-api', () => ({
  fetchServer: mocks.fetchServer,
  ServerApiError: class ServerApiError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
    ) {
      super(code);
    }
  },
}));

import { loadServerSession } from '@/lib/auth-session';

describe('server session loading', () => {
  beforeEach(() => mocks.fetchServer.mockReset());

  it('returns null for a valid unauthenticated session response', async () => {
    mocks.fetchServer.mockResolvedValue(
      new Response('null', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(loadServerSession()).resolves.toBeNull();
  });

  it('does not convert a session dependency failure to unauthenticated', async () => {
    mocks.fetchServer.mockResolvedValue(
      new Response('Service unavailable', { status: 503 }),
    );

    await expect(loadServerSession()).rejects.toMatchObject({
      code: 'SESSION_SERVICE_UNAVAILABLE',
    });
  });
});
