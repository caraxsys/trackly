import type { FastifyRequest } from 'fastify';

import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type {
  AnalyticsHeatmapQuery,
  AnalyticsHistoryQuery,
  AnalyticsInsightsQuery,
  AnalyticsRankingQuery,
  AnalyticsSummaryQuery,
} from './analytics.schema.js';
import type { AnalyticsQueryService } from './analytics.service.js';

export function createAnalyticsQueryController(
  analyticsService: AnalyticsQueryService,
) {
  function timezoneFallback(request: FastifyRequest) {
    return () => {
      request.log.warn(
        'Invalid stored user timezone; falling back to UTC for Analytics query',
      );
    };
  }

  return {
    categories: async (
      request: FastifyRequest<{ Querystring: AnalyticsRankingQuery }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await analyticsService.getCategoryRankings({
          userId,
          period: request.query.period,
          onTimezoneFallback: timezoneFallback(request),
        }),
      );
    },
    habits: async (
      request: FastifyRequest<{ Querystring: AnalyticsRankingQuery }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await analyticsService.getHabitRankings({
          userId,
          period: request.query.period,
          onTimezoneFallback: timezoneFallback(request),
        }),
      );
    },
    heatmap: async (
      request: FastifyRequest<{ Querystring: AnalyticsHeatmapQuery }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await analyticsService.getHeatmap({
          userId,
          period: request.query.period,
          onTimezoneFallback: timezoneFallback(request),
        }),
      );
    },
    summary: async (
      request: FastifyRequest<{ Querystring: AnalyticsSummaryQuery }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await analyticsService.getSummary({
          userId,
          period: request.query.period,
          ...(request.query.date ? { date: request.query.date } : {}),
          onTimezoneFallback: timezoneFallback(request),
        }),
      );
    },
    history: async (
      request: FastifyRequest<{ Querystring: AnalyticsHistoryQuery }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await analyticsService.getHistory({
          userId,
          period: request.query.period,
          granularity: request.query.granularity,
          onTimezoneFallback: timezoneFallback(request),
        }),
      );
    },
    insights: async (
      request: FastifyRequest<{ Querystring: AnalyticsInsightsQuery }>,
    ) => {
      const userId = await requireUserId(request);
      return successResponse(
        await analyticsService.getInsights({
          userId,
          period: request.query.period,
          onTimezoneFallback: timezoneFallback(request),
        }),
      );
    },
  };
}
