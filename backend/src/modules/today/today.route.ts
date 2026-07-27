import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { createGoalRepository } from '../goals/goal.repository.js';
import { createHabitRepository } from '../habits/habit.repository.js';
import { createPreferenceRepository } from '../preferences/preference.repository.js';
import { createTaskRepository } from '../tasks/task.repository.js';
import { createTodayController } from './today.controller.js';
import { todayDataJsonSchema } from './today.openapi.js';
import { todayQuerySchema, type TodayQuery } from './today.schema.js';
import { createTodayService } from './today.service.js';

const todayService = createTodayService({
  preferenceRepository: createPreferenceRepository(database),
  habitRepository: createHabitRepository(database),
  taskRepository: createTaskRepository(database),
  goalRepository: createGoalRepository(database),
});

export function todayRoutes(app: FastifyInstance) {
  app.get<{ Querystring: TodayQuery }>(
    '/today',
    {
      preValidation: validateRequest({ query: todayQuerySchema }),
      schema: {
        tags: ['today'],
        summary: "Get the authenticated user's Today dashboard data",
        description:
          'Returns habits, relevant tasks, active goals, and a derived daily summary. Empty accounts return empty collections.',
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description:
                "Optional logical date in the user's timezone (YYYY-MM-DD).",
            },
          },
        },
        response: {
          200: successResponseJsonSchema(todayDataJsonSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    createTodayController(todayService),
  );
}
