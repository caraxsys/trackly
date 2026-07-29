import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type {
  PushSubscriptionCreateBody,
  PushSubscriptionDeleteBody,
} from './push-subscription.schema.js';
import type { PushSubscriptionService } from './push-subscription.service.js';

export function createPushSubscriptionController(
  service: PushSubscriptionService,
) {
  return {
    subscribe: async (
      request: FastifyRequest<{ Body: PushSubscriptionCreateBody }>,
      reply: FastifyReply,
    ) => {
      const result = await service.subscribe(
        await requireUserId(request),
        request.body,
      );
      return reply
        .status(result.created ? 201 : 200)
        .send(successResponse(result.subscription));
    },

    list: async (request: FastifyRequest) =>
      successResponse(await service.list(await requireUserId(request))),

    unsubscribe: async (
      request: FastifyRequest<{ Body: PushSubscriptionDeleteBody }>,
    ) =>
      successResponse(
        await service.unsubscribe(await requireUserId(request), request.body),
      ),
  };
}
