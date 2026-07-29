import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import fastifyPlugin from 'fastify-plugin';

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const requestStartedAt = new WeakMap<object, bigint>();

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUserId?: string;
  }
}

function requestPath(url: string) {
  return url.split('?', 1)[0] ?? '/';
}

export function resolveRequestId(request: Pick<IncomingMessage, 'headers'>) {
  const header = request.headers['x-request-id'];
  const candidate = Array.isArray(header) ? header[0] : header;

  return candidate && requestIdPattern.test(candidate)
    ? candidate
    : randomUUID();
}

export const requestContextPlugin = fastifyPlugin(
  (app) => {
    app.addHook('onRequest', async (request, reply) => {
      requestStartedAt.set(request, process.hrtime.bigint());
      reply.header('x-request-id', request.id);
    });

    app.addHook('onResponse', async (request, reply) => {
      const startedAt = requestStartedAt.get(request);
      const durationMs = startedAt
        ? Number(process.hrtime.bigint() - startedAt) / 1_000_000
        : 0;

      request.log.info(
        {
          event: 'http.request.completed',
          requestId: request.id,
          method: request.method,
          path: requestPath(request.url),
          status: reply.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
          ...(request.authenticatedUserId
            ? { userId: request.authenticatedUserId }
            : {}),
        },
        'Request completed',
      );
    });
  },
  { name: 'request-context' },
);
