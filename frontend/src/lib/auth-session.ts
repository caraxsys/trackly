import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';

import { fetchServer, ServerApiError } from '@/services/server-api';

const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    image: z.string().nullable().optional(),
  }),
  session: z.object({
    expiresAt: z.coerce.date(),
  }),
});

export type AuthSession = z.infer<typeof sessionSchema>;

export class SessionServiceError extends Error {
  constructor(
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super('The session service could not be reached.', options);
    this.name = 'SessionServiceError';
  }
}

export async function loadServerSession(): Promise<AuthSession | null> {
  try {
    const response = await fetchServer('/api/auth/get-session');

    if (response.status === 401 || response.status === 403) {
      return null;
    }
    if (!response.ok) {
      throw new SessionServiceError('SESSION_SERVICE_UNAVAILABLE');
    }

    const body: unknown = await response.json();
    if (body === null) return null;

    const result = sessionSchema.safeParse(body);
    if (!result.success) {
      throw new SessionServiceError('INVALID_SESSION_RESPONSE');
    }
    return result.data;
  } catch (cause) {
    unstable_rethrow(cause);
    if (cause instanceof SessionServiceError) throw cause;
    if (cause instanceof ServerApiError) {
      throw new SessionServiceError(cause.code, { cause });
    }
    throw new SessionServiceError('INVALID_SESSION_RESPONSE', { cause });
  }
}

export const getServerSession = cache(loadServerSession);
