import 'server-only';

import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';

import { getInternalApiUrl } from '@/lib/server-environment';

const DEFAULT_TIMEOUT_MS = 10_000;

const apiEnvelopeSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), data: z.unknown() }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
]);

export class ServerApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = 'The server request could not be completed.',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ServerApiError';
  }
}

export async function fetchServer(
  path: string | URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const cookieStore = await cookies();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(new URL(path, getInternalApiUrl()), {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        cookie: cookieStore.toString(),
      },
      signal: controller.signal,
    });
  } catch (cause) {
    unstable_rethrow(cause);
    if (controller.signal.aborted) {
      throw new ServerApiError(
        504,
        'API_TIMEOUT',
        'The server request timed out.',
        { cause },
      );
    }
    throw new ServerApiError(
      503,
      'API_UNAVAILABLE',
      'The API could not be reached.',
      { cause },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestServerApi<T>(path: string | URL): Promise<T> {
  const response = await fetchServer(path);
  let body: unknown;

  try {
    body = await response.json();
  } catch (cause) {
    throw new ServerApiError(
      response.status,
      'INVALID_API_RESPONSE',
      'The API returned an invalid response.',
      { cause },
    );
  }

  const payload = apiEnvelopeSchema.safeParse(body);
  if (!payload.success) {
    throw new ServerApiError(
      response.status,
      'INVALID_API_RESPONSE',
      'The API returned an invalid response.',
    );
  }

  if (!response.ok || !payload.data.success) {
    throw new ServerApiError(
      response.status,
      payload.data.success ? 'API_REQUEST_FAILED' : payload.data.error.code,
    );
  }

  return payload.data.data as T;
}
