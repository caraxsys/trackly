import type { FastifyReply, FastifyRequest } from 'fastify';

import { runAuditedOperation } from '../../audit/audit-logger.js';
import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type { HabitCommandService } from './habit-command.service.js';
import type {
  CreateHabitBody,
  HabitCheckInBody,
  HabitParams,
  UpdateHabitBody,
} from './habit.schema.js';

export function createHabitCommandController(service: HabitCommandService) {
  return {
    create: async (
      request: FastifyRequest<{ Body: CreateHabitBody }>,
      reply: FastifyReply,
    ) => {
      const userId = await requireUserId(request);
      const data = await runAuditedOperation(
        request,
        {
          actorId: userId,
          action: 'habit.create',
          resourceType: 'habit',
        },
        () => service.create(userId, request.body),
        (result) => result.id,
      );
      return reply.status(201).send(successResponse(data));
    },

    update: async (
      request: FastifyRequest<{ Body: UpdateHabitBody; Params: HabitParams }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'habit.update',
            resourceType: 'habit',
            resourceId: request.params.id,
          },
          () => service.update(userId, request.params.id, request.body),
        ),
      );
    },

    softDelete: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'habit.delete',
            resourceType: 'habit',
            resourceId: request.params.id,
          },
          () => service.softDelete(userId, request.params.id),
        ),
      );
    },

    activate: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'habit.activate',
            resourceType: 'habit',
            resourceId: request.params.id,
          },
          () => service.activate(userId, request.params.id),
        ),
      );
    },

    deactivate: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'habit.deactivate',
            resourceType: 'habit',
            resourceId: request.params.id,
          },
          () => service.deactivate(userId, request.params.id),
        ),
      );
    },

    archive: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'habit.archive',
            resourceType: 'habit',
            resourceId: request.params.id,
          },
          () => service.archive(userId, request.params.id),
        ),
      );
    },

    restore: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'habit.restore',
            resourceType: 'habit',
            resourceId: request.params.id,
          },
          () => service.restore(userId, request.params.id),
        ),
      );
    },

    checkIn: async (
      request: FastifyRequest<{
        Body: HabitCheckInBody;
        Params: HabitParams;
      }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'habit.check_in',
            resourceType: 'habit',
            resourceId: request.params.id,
          },
          () => service.checkIn({ userId }, request.params.id, request.body),
        ),
      );
    },
  };
}
