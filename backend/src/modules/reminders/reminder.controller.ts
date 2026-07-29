import type { FastifyReply, FastifyRequest } from 'fastify';

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
    ) =>
      reply
        .status(201)
        .send(
          successResponse(
            await service.create(
              await requireUserId(request),
              request.params.habitId,
              request.body,
            ),
          ),
        ),

    update: async (
      request: FastifyRequest<{
        Params: ReminderParams;
        Body: ReminderUpdateBody;
      }>,
    ) =>
      successResponse(
        await service.update(
          await requireUserId(request),
          request.params.habitId,
          request.params.reminderId!,
          request.body,
        ),
      ),

    softDelete: async (request: FastifyRequest<{ Params: ReminderParams }>) =>
      successResponse(
        await service.softDelete(
          await requireUserId(request),
          request.params.habitId,
          request.params.reminderId!,
        ),
      ),
  };
}
