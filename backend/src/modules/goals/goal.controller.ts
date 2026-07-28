import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type {
  GoalCreateBody,
  GoalListQuery,
  GoalParams,
  GoalUpdateBody,
} from './goal.schema.js';
import type { GoalService } from './goal.service.js';

export function createGoalController(service: GoalService) {
  return {
    list: async (request: FastifyRequest<{ Querystring: GoalListQuery }>) =>
      successResponse(
        await service.list(await requireUserId(request), request.query),
      ),
    detail: async (request: FastifyRequest<{ Params: GoalParams }>) =>
      successResponse(
        await service.detail(await requireUserId(request), request.params.id),
      ),
    create: async (
      request: FastifyRequest<{ Body: GoalCreateBody }>,
      reply: FastifyReply,
    ) =>
      reply
        .code(201)
        .send(
          successResponse(
            await service.create(await requireUserId(request), request.body),
          ),
        ),
    update: async (
      request: FastifyRequest<{ Params: GoalParams; Body: GoalUpdateBody }>,
    ) =>
      successResponse(
        await service.update(
          await requireUserId(request),
          request.params.id,
          request.body,
        ),
      ),
    remove: async (request: FastifyRequest<{ Params: GoalParams }>) =>
      successResponse(
        await service.remove(await requireUserId(request), request.params.id),
      ),
  };
}
