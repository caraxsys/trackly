import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { createGoalController } from './goal.controller.js';
import { goalJsonSchema, goalStatusJsonSchema } from './goal.openapi.js';
import { createGoalRepository } from './goal.repository.js';
import {
  goalCreateBodySchema,
  goalListQuerySchema,
  goalParamsSchema,
  goalUpdateBodySchema,
  type GoalCreateBody,
  type GoalListQuery,
  type GoalParams,
  type GoalUpdateBody,
} from './goal.schema.js';
import { createGoalService } from './goal.service.js';

const controller = createGoalController(
  createGoalService(createGoalRepository(database)),
);
const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
} as const;
const bodyProperties = {
  habitId: { type: 'string', format: 'uuid' },
  name: { type: 'string', minLength: 1, maxLength: 200 },
  targetCount: { type: 'integer', minimum: 1 },
  startDate: { type: 'string', format: 'date' },
  endDate: { type: 'string', format: 'date' },
  status: goalStatusJsonSchema,
} as const;
const responses = {
  400: errorResponseJsonSchema,
  401: errorResponseJsonSchema,
  404: errorResponseJsonSchema,
  409: errorResponseJsonSchema,
  500: errorResponseJsonSchema,
};

export function goalRoutes(app: FastifyInstance) {
  app.get<{ Querystring: GoalListQuery }>(
    '/goals',
    {
      preValidation: validateRequest({ query: goalListQuerySchema }),
      schema: {
        tags: ['goals'],
        summary: 'List owned Goals',
        security: [{ cookieAuth: [] }],
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: goalStatusJsonSchema,
            habitId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
        response: {
          200: successResponseJsonSchema({
            type: 'array',
            items: goalJsonSchema,
          }),
          ...responses,
        },
      },
    },
    controller.list,
  );
  app.get<{ Params: GoalParams }>(
    '/goals/:id',
    {
      preValidation: validateRequest({ params: goalParamsSchema }),
      schema: {
        tags: ['goals'],
        summary: 'Get an owned Goal',
        security: [{ cookieAuth: [] }],
        params,
        response: {
          200: successResponseJsonSchema(goalJsonSchema),
          ...responses,
        },
      },
    },
    controller.detail,
  );
  app.post<{ Body: GoalCreateBody }>(
    '/goals',
    {
      preValidation: validateRequest({ body: goalCreateBodySchema }),
      schema: {
        tags: ['goals'],
        summary: 'Create a Goal',
        security: [{ cookieAuth: [] }],
        body: {
          type: 'object',
          required: ['habitId', 'name', 'targetCount', 'startDate', 'endDate'],
          additionalProperties: false,
          properties: bodyProperties,
        },
        response: {
          201: successResponseJsonSchema(goalJsonSchema),
          ...responses,
        },
      },
    },
    controller.create,
  );
  app.patch<{ Params: GoalParams; Body: GoalUpdateBody }>(
    '/goals/:id',
    {
      preValidation: validateRequest({
        params: goalParamsSchema,
        body: goalUpdateBodySchema,
      }),
      schema: {
        tags: ['goals'],
        summary: 'Update an owned Goal',
        security: [{ cookieAuth: [] }],
        params,
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: bodyProperties,
        },
        response: {
          200: successResponseJsonSchema(goalJsonSchema),
          ...responses,
        },
      },
    },
    controller.update,
  );
  app.delete<{ Params: GoalParams }>(
    '/goals/:id',
    {
      preValidation: validateRequest({ params: goalParamsSchema }),
      schema: {
        tags: ['goals'],
        summary: 'Soft delete an owned Goal',
        security: [{ cookieAuth: [] }],
        params,
        response: {
          200: successResponseJsonSchema({
            type: 'object',
            required: ['id', 'deleted'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              deleted: { type: 'boolean', const: true },
            },
          }),
          ...responses,
        },
      },
    },
    controller.remove,
  );
}
