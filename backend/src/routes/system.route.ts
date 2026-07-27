import type { FastifyInstance } from 'fastify';

import {
  createGetReadiness,
  getHealth,
} from '../controllers/health.controller.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../http/openapi-schemas.js';
import type { DatabaseConnectionCheck } from '../plugins/database.js';

const systemStatusDataSchema = {
  type: 'object',
  required: ['status', 'service', 'timestamp'],
  properties: {
    status: { type: 'string' },
    service: { type: 'string', enum: ['trackly-api'] },
    timestamp: { type: 'string', format: 'date-time' },
  },
} as const;

interface SystemRouteOptions {
  connectionCheck: DatabaseConnectionCheck;
}

export function systemRoutes(
  app: FastifyInstance,
  options: SystemRouteOptions,
) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Check whether the API process is running',
        response: {
          200: successResponseJsonSchema(systemStatusDataSchema),
        },
      },
    },
    getHealth,
  );

  app.get(
    '/ready',
    {
      schema: {
        tags: ['system'],
        summary: 'Check whether the API and PostgreSQL are ready',
        response: {
          200: successResponseJsonSchema(systemStatusDataSchema),
          503: errorResponseJsonSchema,
        },
      },
    },
    createGetReadiness(options.connectionCheck),
  );
}
