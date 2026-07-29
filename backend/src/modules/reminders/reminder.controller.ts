import type { FastifyReply, FastifyRequest } from 'fastify';

import { runAuditedOperation } from '../../audit/audit-logger.js';
import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type {
  ReminderCreateBody,
  ReminderParams,
  ReminderUpdateBody,
} from './reminder.schema.js';
import type { ReminderService } from './reminder.service.js';

export function createReminderController(service: ReminderService) {
  return {
    list: async (request: FastifyRequest<{ Params: ReminderParams }>) =>
      successResponse(
        await service.list(
          await requireUserId(request),
          request.params.habitId,
        ),
      ),

    create: async (
      request: FastifyRequest<{
        Params: ReminderParams;
        Body: ReminderCreateBody;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = await requireUserId(request);
      const data = await runAuditedOperation(
        request,
        {
          actorId: userId,
          action: 'reminder.create',
          resourceType: 'reminder',
        },
        () => service.create(userId, request.params.habitId, request.body),
        (result) => result.id,
      );
      return reply.status(201).send(successResponse(data));
    },

    update: async (
      request: FastifyRequest<{
        Params: ReminderParams;
        Body: ReminderUpdateBody;
      }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'reminder.update',
            resourceType: 'reminder',
            resourceId: request.params.reminderId!,
          },
          () =>
            service.update(
              userId,
              request.params.habitId,
              request.params.reminderId!,
              request.body,
            ),
        ),
      );
    },

    softDelete: async (request: FastifyRequest<{ Params: ReminderParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'reminder.delete',
            resourceType: 'reminder',
            resourceId: request.params.reminderId!,
          },
          () =>
            service.softDelete(
              userId,
              request.params.habitId,
              request.params.reminderId!,
            ),
        ),
      );
    },
  };
}
