import type { FastifyRequest } from 'fastify';

import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type { HabitParams } from './habit.schema.js';
import type { HabitStreakQueryService } from './habit-streak.service.js';

export function createHabitStreakQueryController(
  service: HabitStreakQueryService,
) {
  return async function getHabitStreak(
    request: FastifyRequest<{ Params: HabitParams }>,
  ) {
    const userId = await requireUserId(request);
    return successResponse(
      await service.getStreak(
        {
          userId,
          onTimezoneFallback: () => {
            request.log.warn(
              'Invalid stored user timezone; falling back to UTC for Habit streak query',
            );
          },
        },
        request.params.id,
      ),
    );
  };
}
