import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import fastifyPlugin from 'fastify-plugin';

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

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
      reply.header('x-request-id', request.id);
    });
  },
  { name: 'request-context' },
);
