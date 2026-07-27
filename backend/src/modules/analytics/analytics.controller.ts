import type { FastifyRequest } from 'fastify';

import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type { AnalyticsSummaryQuery } from './analytics.schema.js';
import type { AnalyticsQueryService } from './analytics.service.js';

export function createAnalyticsQueryController(
  analyticsService: AnalyticsQueryService,
) {
  return async function getAnalyticsSummary(
    request: FastifyRequest<{ Querystring: AnalyticsSummaryQuery }>,
  ) {
    const userId = await requireUserId(request);
    const data = await analyticsService.getSummary({
      userId,
      period: request.query.period,
      ...(request.query.date ? { date: request.query.date } : {}),
      onTimezoneFallback: () => {
        request.log.warn(
          'Invalid stored user timezone; falling back to UTC for Analytics query',
        );
      },
    });

    return successResponse(data);
  };
}
