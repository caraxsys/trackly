import type { FastifyReply, FastifyRequest } from 'fastify';

import { runAuditedOperation } from '../../audit/audit-logger.js';
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
    ) => {
      const userId = await requireUserId(request);
      const data = await runAuditedOperation(
        request,
        {
          actorId: userId,
          action: 'goal.create',
          resourceType: 'goal',
        },
        () => service.create(userId, request.body),
        (result) => result.id,
      );
      return reply.code(201).send(successResponse(data));
    },
    update: async (
      request: FastifyRequest<{ Params: GoalParams; Body: GoalUpdateBody }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'goal.update',
            resourceType: 'goal',
            resourceId: request.params.id,
          },
          () => service.update(userId, request.params.id, request.body),
        ),
      );
    },
    remove: async (request: FastifyRequest<{ Params: GoalParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'goal.delete',
            resourceType: 'goal',
            resourceId: request.params.id,
          },
          () => service.remove(userId, request.params.id),
        ),
      );
    },
  };
}
