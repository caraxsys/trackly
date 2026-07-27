import type { FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { fromNodeHeaders } from 'better-auth/node';

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

export const authPlugin = fastifyPlugin(
  (app) => {
    app.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      async handler(request, reply) {
        const response = await auth.handler(createWebRequest(request));

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });

        const body = response.body ? await response.text() : null;
        return reply.send(body);
      },
    });
  },
  { name: 'auth' },
);
