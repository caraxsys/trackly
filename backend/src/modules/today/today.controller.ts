import type { FastifyRequest } from 'fastify';

import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type { TodayQuery } from './today.schema.js';
import type { TodayService } from './today.service.js';

export function createTodayController(todayService: TodayService) {
  return async function getToday(
    request: FastifyRequest<{ Querystring: TodayQuery }>,
  ) {
    const userId = await requireUserId(request);
    const data = await todayService.getToday({
      userId,
      ...(request.query.date ? { date: request.query.date } : {}),
      onTimezoneFallback: () => {
        request.log.warn(
          'Invalid stored user timezone; falling back to UTC for Today query',
        );
      },
    });

    return successResponse(data);
  };
}
