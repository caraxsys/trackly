import type { FastifyInstance } from 'fastify';

import { getCurrentAuthSession } from '../../controllers/auth.controller.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';

export function authRoutes(app: FastifyInstance) {
  app.get(
    '/auth/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Get the current authenticated user and session',
        response: {
          200: successResponseJsonSchema({
            type: 'object',
            required: ['user', 'session'],
            properties: {
              user: {
                type: 'object',
                required: ['id', 'name', 'email', 'image'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  image: { type: ['string', 'null'] },
                },
              },
              session: {
                type: 'object',
                required: ['expiresAt'],
                properties: {
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          }),
          401: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    getCurrentAuthSession,
  );
}
