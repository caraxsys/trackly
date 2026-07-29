import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { createPushSubscriptionController } from './push-subscription.controller.js';
import {
  pushSubscriptionDeleteJsonSchema,
  pushSubscriptionJsonSchema,
  pushSubscriptionListJsonSchema,
} from './push-subscription.openapi.js';
import { createPushSubscriptionRepository } from './push-subscription.repository.js';
import {
  pushSubscriptionCreateBodySchema,
  pushSubscriptionDeleteBodySchema,
  type PushSubscriptionCreateBody,
  type PushSubscriptionDeleteBody,
} from './push-subscription.schema.js';
import { createPushSubscriptionService } from './push-subscription.service.js';

const controller = createPushSubscriptionController(
  createPushSubscriptionService(createPushSubscriptionRepository(database)),
);
const endpointProperty = { type: 'string', format: 'uri', maxLength: 4096 };
const errors = {
  400: errorResponseJsonSchema,
  401: errorResponseJsonSchema,
  409: errorResponseJsonSchema,
  500: errorResponseJsonSchema,
};

export function pushSubscriptionRoutes(app: FastifyInstance) {
  app.get(
    '/push-subscriptions',
    {
      schema: {
        tags: ['push-subscriptions'],
        summary: 'List active browser push subscriptions',
        security: [{ cookieAuth: [] }],
        response: {
          200: successResponseJsonSchema(pushSubscriptionListJsonSchema),
          ...errors,
        },
      },
    },
    controller.list,
  );

  app.post<{ Body: PushSubscriptionCreateBody }>(
    '/push-subscriptions',
    {
      preValidation: validateRequest({
        body: pushSubscriptionCreateBodySchema,
      }),
      schema: {
        tags: ['push-subscriptions'],
        summary: 'Create, update, or reactivate a browser push subscription',
        security: [{ cookieAuth: [] }],
        body: {
          type: 'object',
          required: ['endpoint', 'keys'],
          additionalProperties: false,
          properties: {
            endpoint: endpointProperty,
            keys: {
              type: 'object',
              required: ['p256dh', 'auth'],
              additionalProperties: false,
              properties: {
                p256dh: { type: 'string', minLength: 16, maxLength: 2048 },
                auth: { type: 'string', minLength: 16, maxLength: 2048 },
              },
            },
            userAgent: { type: 'string', minLength: 1, maxLength: 512 },
          },
        },
        response: {
          200: successResponseJsonSchema(pushSubscriptionJsonSchema),
          201: successResponseJsonSchema(pushSubscriptionJsonSchema),
          ...errors,
        },
      },
    },
    controller.subscribe,
  );

  app.delete<{ Body: PushSubscriptionDeleteBody }>(
    '/push-subscriptions',
    {
      preValidation: validateRequest({
        body: pushSubscriptionDeleteBodySchema,
      }),
      schema: {
        tags: ['push-subscriptions'],
        summary: 'Disable an owned browser push subscription',
        security: [{ cookieAuth: [] }],
        body: {
          type: 'object',
          required: ['endpoint'],
          additionalProperties: false,
          properties: { endpoint: endpointProperty },
        },
        response: {
          200: successResponseJsonSchema(pushSubscriptionDeleteJsonSchema),
          ...errors,
        },
      },
    },
    controller.unsubscribe,
  );
}
