import type { FastifyReply, FastifyRequest } from 'fastify';

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
      const data = await service.create(userId, request.body);
      return reply.status(201).send(successResponse(data));
    },

    update: async (
      request: FastifyRequest<{ Body: UpdateHabitBody; Params: HabitParams }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await service.update(userId, request.params.id, request.body),
      );
    },

    softDelete: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await service.softDelete(userId, request.params.id),
      );
    },

    activate: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(await service.activate(userId, request.params.id));
    },

    deactivate: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await service.deactivate(userId, request.params.id),
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
        await service.checkIn({ userId }, request.params.id, request.body),
      );
    },
  };
}
