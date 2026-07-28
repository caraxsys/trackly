import type { FastifyInstance } from 'fastify';
import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { createPreferenceController } from './preference.controller.js';
import {
  preferenceProperties,
  preferenceResponseSchema,
} from './preference.openapi.js';
import { createPreferenceRepository } from './preference.repository.js';
import {
  preferenceUpdateSchema,
  type PreferenceUpdate,
} from './preference.schema.js';
import { createPreferenceService } from './preference.service.js';

const controller = createPreferenceController(
  createPreferenceService(createPreferenceRepository(database)),
);
const errors = {
  400: errorResponseJsonSchema,
  401: errorResponseJsonSchema,
  500: errorResponseJsonSchema,
};

export function preferenceRoutes(app: FastifyInstance) {
  app.get(
    '/preferences',
    {
      schema: {
        tags: ['preferences'],
        summary: 'Get resolved user preferences',
        security: [{ cookieAuth: [] }],
        response: {
          200: successResponseJsonSchema(preferenceResponseSchema),
          ...errors,
        },
      },
    },
    controller.get,
  );

  app.patch<{ Body: PreferenceUpdate }>(
    '/preferences',
    {
      preValidation: validateRequest({ body: preferenceUpdateSchema }),
      schema: {
        tags: ['preferences'],
        summary: 'Partially update user preferences',
        description:
          'Upserts the authenticated user preference row and preserves omitted values.',
        security: [{ cookieAuth: [] }],
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: preferenceProperties,
        },
        response: {
          200: successResponseJsonSchema(preferenceResponseSchema),
          ...errors,
        },
      },
    },
    controller.update,
  );
}
