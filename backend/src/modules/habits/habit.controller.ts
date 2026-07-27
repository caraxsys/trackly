import type { FastifyRequest } from 'fastify';

import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type {
  HabitCollectionRequestQuery,
  HabitParams,
} from './habit.schema.js';
import type { HabitService } from './habit.service.js';

function context(request: FastifyRequest, userId: string) {
  return {
    userId,
    onTimezoneFallback: () => {
      request.log.warn(
        'Invalid stored user timezone; falling back to UTC for Habit query',
      );
    },
  };
}

export function createHabitController(service: HabitService) {
  return {
    list: async (
      request: FastifyRequest<{ Querystring: HabitCollectionRequestQuery }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await service.list(context(request, userId), request.query),
      );
    },

    detail: async (request: FastifyRequest<{ Params: HabitParams }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await service.detail(context(request, userId), request.params.id),
      );
    },
  };
}
