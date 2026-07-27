import type { FastifyRequest } from 'fastify';

import { requireSession } from '../auth/session.js';
import { successResponse } from '../http/responses.js';

export async function getCurrentAuthSession(request: FastifyRequest) {
  const { user, session } = await requireSession(request);

  return successResponse({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
    },
    session: {
      expiresAt: session.expiresAt.toISOString(),
    },
  });
}
