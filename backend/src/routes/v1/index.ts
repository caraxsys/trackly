import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { validateDiagnosticRequest } from '../../controllers/diagnostic.controller.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { authRoutes } from './auth.route.js';

const diagnosticBodySchema = z.object({
  value: z.string().trim().min(1).max(100),
});

export async function v1Routes(app: FastifyInstance) {
  await app.register(authRoutes);

  app.post(
    '/diagnostics/validation',
    {
      preValidation: validateRequest({ body: diagnosticBodySchema }),
      schema: {
        tags: ['diagnostics'],
        summary: 'Verify the request validation pipeline',
        description:
          'Temporary non-business endpoint for backend foundation diagnostics.',
        body: {
          type: 'object',
          required: ['value'],
          additionalProperties: false,
          properties: {
            value: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        response: {
          200: successResponseJsonSchema({
            type: 'object',
            required: ['value'],
            properties: { value: { type: 'string' } },
          }),
          400: errorResponseJsonSchema,
        },
      },
    },
    validateDiagnosticRequest,
  );
}
