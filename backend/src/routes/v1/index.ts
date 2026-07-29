import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { validateDiagnosticRequest } from '../../controllers/diagnostic.controller.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { authRoutes } from './auth.route.js';
import { categoryRoutes } from '../../modules/categories/category.route.js';
import { todayRoutes } from '../../modules/today/today.route.js';
import { habitRoutes } from '../../modules/habits/habit.route.js';
import { analyticsRoutes } from '../../modules/analytics/analytics.route.js';
import { goalRoutes } from '../../modules/goals/goal.route.js';
import { preferenceRoutes } from '../../modules/preferences/preference.route.js';
import { reminderRoutes } from '../../modules/reminders/reminder.route.js';
import { pushSubscriptionRoutes } from '../../modules/push-subscriptions/push-subscription.route.js';

const diagnosticBodySchema = z.object({
  value: z.string().trim().min(1).max(100),
});

export async function v1Routes(app: FastifyInstance) {
  await app.register(authRoutes);
  await app.register(todayRoutes);
  await app.register(categoryRoutes);
  await app.register(habitRoutes);
  await app.register(analyticsRoutes);
  await app.register(goalRoutes);
  await app.register(preferenceRoutes);
  await app.register(reminderRoutes);
  await app.register(pushSubscriptionRoutes);

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
