import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { createPreferenceRepository } from '../preferences/preference.repository.js';
import { createReminderController } from './reminder.controller.js';
import {
  reminderDeleteJsonSchema,
  reminderJsonSchema,
  reminderListJsonSchema,
} from './reminder.openapi.js';
import { createReminderRepository } from './reminder.repository.js';
import {
  reminderCreateBodySchema,
  reminderParamsSchema,
  reminderUpdateBodySchema,
  type ReminderCreateBody,
  type ReminderParams,
  type ReminderUpdateBody,
} from './reminder.schema.js';
import { createReminderService } from './reminder.service.js';

const controller = createReminderController(
  createReminderService(
    createReminderRepository(database),
    createPreferenceRepository(database),
  ),
);
const collectionParamsJsonSchema = {
  type: 'object',
  required: ['habitId'],
  additionalProperties: false,
  properties: { habitId: { type: 'string', format: 'uuid' } },
} as const;
const itemParamsJsonSchema = {
  type: 'object',
  required: ['habitId', 'reminderId'],
  additionalProperties: false,
  properties: {
    habitId: { type: 'string', format: 'uuid' },
    reminderId: { type: 'string', format: 'uuid' },
  },
} as const;
const bodyProperties = {
  timeOfDay: {
    type: 'string',
    pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$',
    description: 'Strict 24-hour HH:mm user-local time.',
  },
  isEnabled: { type: 'boolean', default: true },
} as const;
const errors = {
  400: errorResponseJsonSchema,
  401: errorResponseJsonSchema,
  404: errorResponseJsonSchema,
  409: errorResponseJsonSchema,
  500: errorResponseJsonSchema,
};

export function reminderRoutes(app: FastifyInstance) {
  app.get<{ Params: ReminderParams }>(
    '/habits/:habitId/reminders',
    {
      preValidation: validateRequest({ params: reminderParamsSchema }),
      schema: {
        tags: ['reminders'],
        summary: 'List reminders for an owned Habit',
        description:
          'Returns active reminders ordered by local time. Archived Habits remain readable.',
        security: [{ cookieAuth: [] }],
        params: collectionParamsJsonSchema,
        response: {
          200: successResponseJsonSchema(reminderListJsonSchema),
          ...errors,
        },
      },
    },
    controller.list,
  );

  app.post<{ Params: ReminderParams; Body: ReminderCreateBody }>(
    '/habits/:habitId/reminders',
    {
      preValidation: validateRequest({
        params: reminderParamsSchema,
        body: reminderCreateBodySchema,
      }),
      schema: {
        tags: ['reminders'],
        summary: 'Create a reminder for an owned Habit',
        description:
          'Creates a user-local reminder time. Duplicate active times return 409.',
        security: [{ cookieAuth: [] }],
        params: collectionParamsJsonSchema,
        body: {
          type: 'object',
          required: ['timeOfDay'],
          additionalProperties: false,
          properties: bodyProperties,
        },
        response: {
          201: successResponseJsonSchema(reminderJsonSchema),
          ...errors,
        },
      },
    },
    controller.create,
  );

  app.patch<{
    Params: ReminderParams;
    Body: ReminderUpdateBody;
  }>(
    '/habits/:habitId/reminders/:reminderId',
    {
      preValidation: validateRequest({
        params: reminderParamsSchema,
        body: reminderUpdateBodySchema,
      }),
      schema: {
        tags: ['reminders'],
        summary: 'Update an owned Habit reminder',
        description:
          'Partially updates time or enabled state. Empty and unknown-field bodies are rejected.',
        security: [{ cookieAuth: [] }],
        params: itemParamsJsonSchema,
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: bodyProperties,
        },
        response: {
          200: successResponseJsonSchema(reminderJsonSchema),
          ...errors,
        },
      },
    },
    controller.update,
  );

  app.delete<{ Params: ReminderParams }>(
    '/habits/:habitId/reminders/:reminderId',
    {
      preValidation: validateRequest({ params: reminderParamsSchema }),
      schema: {
        tags: ['reminders'],
        summary: 'Soft delete an owned Habit reminder',
        description:
          'Soft deletion hides the reminder and permits recreating the same time later.',
        security: [{ cookieAuth: [] }],
        params: itemParamsJsonSchema,
        response: {
          200: successResponseJsonSchema(reminderDeleteJsonSchema),
          ...errors,
        },
      },
    },
    controller.softDelete,
  );
}
