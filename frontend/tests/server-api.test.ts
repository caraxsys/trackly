import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn().mockResolvedValue({ toString: () => 'session=test' }),
}));

vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/server-environment', () => ({
  getInternalApiUrl: () => 'http://backend.test',
}));

import { fetchServer, requestServerApi } from '@/services/server-api';

describe('server API requests', () => {
  beforeEach(() => {
    mocks.cookies.mockResolvedValue({ toString: () => 'session=test' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns data from the standard success envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { value: 1 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(
      requestServerApi<{ value: number }>('/api/v1/test'),
    ).resolves.toEqual({ value: 1 });
  });

  it('preserves a public API status and error code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Not found.' },
          }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(requestServerApi('/api/v1/test')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('rejects malformed API responses predictably', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>failure</html>', {
          status: 502,
          headers: { 'content-type': 'text/html' },
        }),
      ),
    );

    await expect(requestServerApi('/api/v1/test')).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_API_RESPONSE',
    });
  });

  it('aborts requests after the common timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: unknown, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    );

    const assertion = expect(
      fetchServer('/api/v1/test', 25),
    ).rejects.toMatchObject({
      status: 504,
      code: 'API_TIMEOUT',
    });
    await vi.advanceTimersByTimeAsync(25);

    await assertion;
  });
});
