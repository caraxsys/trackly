import type { FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { fromNodeHeaders } from 'better-auth/node';

import { writeAuditEvent } from '../audit/audit-logger.js';
import { auth } from '../auth/auth.js';
import { environment } from '../config/environment.js';

function createWebRequest(request: FastifyRequest) {
  const url = new URL(request.url, environment.BETTER_AUTH_URL);
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD' && request.body != null;

  return new Request(url, {
    method,
    headers: fromNodeHeaders(request.headers),
    ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
  });
}

const auditActions = new Map<string, readonly [string, string]>([
  ['/api/auth/sign-up/email', ['auth.register', 'account']],
  ['/api/auth/sign-in/email', ['auth.login', 'session']],
  ['/api/auth/sign-out', ['auth.logout', 'session']],
  ['/api/auth/update-user', ['account.profile_update', 'account']],
  ['/api/auth/change-email', ['account.email_change', 'account']],
  ['/api/auth/delete-user', ['account.delete', 'account']],
] as const);

function requestPath(url: string) {
  return url.split('?', 1)[0] ?? '/';
}

function responseActorId(body: string | null) {
  if (!body) return null;
  try {
    const value: unknown = JSON.parse(body);
    if (!value || typeof value !== 'object' || !('user' in value)) return null;
    const user = value.user;
    return user &&
      typeof user === 'object' &&
      'id' in user &&
      typeof user.id === 'string'
      ? user.id
      : null;
  } catch {
    return null;
  }
}

export const authPlugin = fastifyPlugin(
  (app) => {
    app.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      async handler(request, reply) {
        const auditDefinition = auditActions.get(requestPath(request.url));
        let response: Response;
        try {
          response = await auth.handler(createWebRequest(request));
        } catch (error) {
          if (auditDefinition) {
            writeAuditEvent(
              request,
              {
                actorId: request.authenticatedUserId ?? null,
                action: auditDefinition[0],
                resourceType: auditDefinition[1],
              },
              'failure',
              'AUTH_SERVICE_ERROR',
            );
          }
          throw error;
        }

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });

        const body = response.body ? await response.text() : null;
        if (auditDefinition) {
          const actorId = request.authenticatedUserId ?? responseActorId(body);
          writeAuditEvent(
            request,
            {
              actorId,
              action: auditDefinition[0],
              resourceType: auditDefinition[1],
              ...(actorId ? { resourceId: actorId } : {}),
            },
            response.ok ? 'success' : 'failure',
            response.ok ? undefined : `HTTP_${response.status}`,
          );
        }
        return reply.send(body);
      },
    });
  },
  { name: 'auth' },
);
