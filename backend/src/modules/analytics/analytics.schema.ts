import { z } from 'zod';

import { parseCalendarDate } from '../../lib/date/calendar-date.js';

export const analyticsSummaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  date: z
    .string()
    .refine((value) => parseCalendarDate(value) !== null, {
      message: 'date must be a valid calendar date in YYYY-MM-DD format.',
    })
    .optional(),
});

export type AnalyticsSummaryQuery = z.infer<typeof analyticsSummaryQuerySchema>;

export const analyticsHistoryPeriodSchema = z
  .enum(['7d', '30d', '90d'])
  .default('30d');

export const analyticsHistoryQuerySchema = z.object({
  period: analyticsHistoryPeriodSchema,
  granularity: z.literal('day').default('day'),
});

export type AnalyticsHistoryQuery = z.infer<typeof analyticsHistoryQuerySchema>;

export const analyticsInsightsQuerySchema = z.object({
  period: analyticsHistoryPeriodSchema,
});

export type AnalyticsInsightsQuery = z.infer<
  typeof analyticsInsightsQuerySchema
>;

export const analyticsHeatmapQuerySchema = z.object({
  period: z.enum(['90d', '180d', '365d']).default('365d'),
});

export type AnalyticsHeatmapQuery = z.infer<typeof analyticsHeatmapQuerySchema>;

export const analyticsRankingQuerySchema = z.object({
  period: analyticsHistoryPeriodSchema,
});
export type AnalyticsRankingQuery = z.infer<typeof analyticsRankingQuerySchema>;
