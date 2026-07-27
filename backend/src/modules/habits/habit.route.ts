import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { createPreferenceRepository } from '../preferences/preference.repository.js';
import { createHabitController } from './habit.controller.js';
import {
  habitCollectionDataSchema,
  habitDetailDataSchema,
} from './habit.openapi.js';
import { createHabitRepository } from './habit.repository.js';
import {
  habitCollectionQuerySchema,
  habitParamsSchema,
  type HabitCollectionRequestQuery,
  type HabitParams,
} from './habit.schema.js';
import { createHabitService } from './habit.service.js';

const service = createHabitService({
  habitRepository: createHabitRepository(database),
  preferenceRepository: createPreferenceRepository(database),
});
const controller = createHabitController(service);

export function habitRoutes(app: FastifyInstance) {
  app.get<{ Querystring: HabitCollectionRequestQuery }>(
    '/habits',
    {
      preValidation: validateRequest({ query: habitCollectionQuerySchema }),
      schema: {
        tags: ['habits'],
        summary: "List the authenticated user's habits",
        description:
          'Returns a deterministic, paginated collection. Empty and out-of-range pages return an empty items array.',
        security: [{ cookieAuth: [] }],
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            view: {
              type: 'string',
              enum: ['today', 'all', 'inactive'],
              default: 'today',
            },
            date: { type: 'string', format: 'date' },
            search: { type: 'string', default: '' },
            sort: {
              type: 'string',
              enum: ['position', 'name', 'createdAt', 'updatedAt'],
              default: 'position',
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
            },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
        },
        response: {
          200: successResponseJsonSchema(habitCollectionDataSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    controller.list,
  );

  app.get<{ Params: HabitParams }>(
    '/habits/:id',
    {
      preValidation: validateRequest({ params: habitParamsSchema }),
      schema: {
        tags: ['habits'],
        summary: "Get an authenticated user's habit",
        description:
          'Returns a read-only habit detail with the current local-date projection. Missing, deleted, and unowned habits return the same 404 response.',
        security: [{ cookieAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: successResponseJsonSchema(habitDetailDataSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    controller.detail,
  );
}
