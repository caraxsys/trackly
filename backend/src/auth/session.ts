import type { FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';

import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { auth } from './auth.js';

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
type SessionLookup = () => Promise<AuthSession>;

const sessionLookups = new WeakMap<FastifyRequest, Promise<AuthSession>>();

export async function resolveSession(lookup: SessionLookup) {
  try {
    return await lookup();
  } catch (cause) {
    throw new AppError({
      statusCode: 503,
      code: ErrorCode.ServiceUnavailable,
      message: 'The authentication service is temporarily unavailable.',
      cause,
    });
  }
}

export function getSession(request: FastifyRequest): Promise<AuthSession> {
  const existingLookup = sessionLookups.get(request);

  if (existingLookup) {
    return existingLookup;
  }

  const lookup = resolveSession(() =>
    auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    }),
  );
  sessionLookups.set(request, lookup);
  return lookup;
}

export async function requireSession(request: FastifyRequest) {
  const session = await getSession(request);

  if (!session) {
    throw new AppError({
      statusCode: 401,
      code: ErrorCode.Unauthorized,
      message: 'Authentication is required.',
    });
  }

  return session;
}

export async function requireUserId(request: FastifyRequest) {
  return (await requireSession(request)).user.id;
}
