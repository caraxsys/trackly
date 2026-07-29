import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { createPreferenceRepository } from '../preferences/preference.repository.js';
import { createHabitController } from './habit.controller.js';
import { createHabitCommandController } from './habit-command.controller.js';
import { createHabitCommandRepository } from './habit-command.repository.js';
import { createHabitCommandService } from './habit-command.service.js';
import {
  habitCreateBodySchema,
  habitCollectionDataSchema,
  habitCheckInBodyJsonSchema,
  habitCheckInDataSchema,
  habitDeleteDataSchema,
  habitDetailDataSchema,
  habitMutationDataSchema,
  habitStreakDataSchema,
  habitStateDataSchema,
  habitUpdateBodySchema,
} from './habit.openapi.js';
import { createHabitRepository } from './habit.repository.js';
import { createHabitStreakQueryController } from './habit-streak.controller.js';
import { createHabitStreakQueryRepository } from './habit-streak.repository.js';
import { createHabitStreakQueryService } from './habit-streak.service.js';
import {
  habitCollectionQuerySchema,
  habitCheckInBodySchema,
  createHabitBodySchema,
  habitParamsSchema,
  updateHabitBodySchema,
  type CreateHabitBody,
  type HabitCollectionRequestQuery,
  type HabitCheckInBody,
  type HabitParams,
  type UpdateHabitBody,
} from './habit.schema.js';
import { createHabitService } from './habit.service.js';

const service = createHabitService({
  habitRepository: createHabitRepository(database),
  preferenceRepository: createPreferenceRepository(database),
});
const controller = createHabitController(service);
const streakController = createHabitStreakQueryController(
  createHabitStreakQueryService({
    habitStreakRepository: createHabitStreakQueryRepository(database),
    preferenceRepository: createPreferenceRepository(database),
  }),
);
const commandController = createHabitCommandController(
  createHabitCommandService(
    createHabitCommandRepository(database),
    createPreferenceRepository(database),
  ),
);

const idParamsJsonSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

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
              enum: ['today', 'all', 'archived', 'inactive'],
              default: 'today',
              description:
                'Use archived for inactive non-deleted Habits. inactive remains a compatibility alias.',
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
    '/habits/:id/streak',
    {
      preValidation: validateRequest({ params: habitParamsSchema }),
      schema: {
        tags: ['habits'],
        summary: "Get an authenticated user's habit streak",
        description:
          'Derives current and longest streaks from completed scheduled occurrences through the user-local current date. Inactive habits retain historical streaks.',
        security: [{ cookieAuth: [] }],
        params: idParamsJsonSchema,
        response: {
          200: successResponseJsonSchema(habitStreakDataSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    streakController,
  );

  app.get<{ Params: HabitParams }>(
    '/habits/:id',
    {
      preValidation: validateRequest({ params: habitParamsSchema }),
      schema: {
        tags: ['habits'],
        summary: "Get an authenticated user's habit",
        description:
          'Returns an active or archived owned habit with the current local-date projection. Missing, deleted, and unowned habits return the same 404 response.',
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

  app.post<{ Body: CreateHabitBody }>(
    '/habits',
    {
      preValidation: validateRequest({ body: createHabitBodySchema }),
      schema: {
        tags: ['habits'],
        summary: 'Create a habit',
        description:
          'Creates an owned habit and its weekday schedule atomically. Daily schedules ignore weekdays.',
        security: [{ cookieAuth: [] }],
        body: habitCreateBodySchema,
        response: {
          201: successResponseJsonSchema(habitMutationDataSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    commandController.create,
  );

  app.patch<{ Body: UpdateHabitBody; Params: HabitParams }>(
    '/habits/:id',
    {
      preValidation: validateRequest({
        params: habitParamsSchema,
        body: updateHabitBodySchema,
      }),
      schema: {
        tags: ['habits'],
        summary: 'Update a habit',
        description:
          'Partially updates an owned, non-deleted habit. Schedule replacement is transactional.',
        security: [{ cookieAuth: [] }],
        params: idParamsJsonSchema,
        body: habitUpdateBodySchema,
        response: {
          200: successResponseJsonSchema(habitMutationDataSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    commandController.update,
  );

  app.delete<{ Params: HabitParams }>(
    '/habits/:id',
    {
      preValidation: validateRequest({ params: habitParamsSchema }),
      schema: {
        tags: ['habits'],
        summary: 'Soft delete a habit',
        description:
          'Sets deleted_at without physically deleting the habit or its schedule.',
        security: [{ cookieAuth: [] }],
        params: idParamsJsonSchema,
        response: {
          200: successResponseJsonSchema(habitDeleteDataSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    commandController.softDelete,
  );

  app.post<{ Body: HabitCheckInBody; Params: HabitParams }>(
    '/habits/:id/check-in',
    {
      preValidation: validateRequest({
        params: habitParamsSchema,
        body: habitCheckInBodySchema,
      }),
      schema: {
        tags: ['habits'],
        summary: 'Set habit progress for a calendar date',
        description:
          "Sets absolute progress for an active, owned habit on a scheduled date. Omitting date uses the authenticated user's local today. Zero removes the stored check-in.",
        security: [{ cookieAuth: [] }],
        params: idParamsJsonSchema,
        body: habitCheckInBodyJsonSchema,
        response: {
          200: successResponseJsonSchema(habitCheckInDataSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          404: errorResponseJsonSchema,
          409: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    commandController.checkIn,
  );

  for (const [path, summary, handler] of [
    ['/habits/:id/archive', 'Archive a habit', commandController.archive],
    [
      '/habits/:id/restore',
      'Restore an archived habit',
      commandController.restore,
    ],
    ['/habits/:id/activate', 'Activate a habit', commandController.activate],
    [
      '/habits/:id/deactivate',
      'Deactivate a habit',
      commandController.deactivate,
    ],
  ] as const) {
    app.post<{ Params: HabitParams }>(
      path,
      {
        preValidation: validateRequest({ params: habitParamsSchema }),
        schema: {
          tags: ['habits'],
          summary,
          security: [{ cookieAuth: [] }],
          params: idParamsJsonSchema,
          response: {
            200: successResponseJsonSchema(habitStateDataSchema),
            400: errorResponseJsonSchema,
            401: errorResponseJsonSchema,
            404: errorResponseJsonSchema,
            409: errorResponseJsonSchema,
            500: errorResponseJsonSchema,
          },
        },
      },
      handler,
    );
  }
}
