import 'server-only';

import { getInternalApiUrl } from '@/lib/server-environment';
import type {
  AnalyticsCategoryRankings,
  AnalyticsDashboardData,
  AnalyticsHabitRankings,
  AnalyticsHeatmapData,
  AnalyticsHeatmapPeriod,
  AnalyticsHistoryData,
  AnalyticsHistoryPeriod,
  AnalyticsInsightsData,
  AnalyticsPeriod,
  AnalyticsSummaryData,
} from '@/types/analytics';
import { requestServerApi, ServerApiError } from './server-api';

export class AnalyticsServerError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super('The analytics summary request failed.');
    this.name = 'AnalyticsServerError';
  }
}

async function requestAnalytics<T>(path: string | URL) {
  try {
    return await requestServerApi<T>(path);
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new AnalyticsServerError(error.status, error.code);
    }
    throw error;
  }
}

export async function getServerAnalyticsSummary(
  period: AnalyticsPeriod,
  date?: string,
) {
  const url = new URL('/api/v1/analytics/summary', getInternalApiUrl());
  url.searchParams.set('period', period);
  if (date) url.searchParams.set('date', date);

  return requestAnalytics<AnalyticsSummaryData>(url);
}

export async function getServerAnalyticsDashboard(options: {
  date?: string;
  heatmapPeriod: AnalyticsHeatmapPeriod;
  historyPeriod: AnalyticsHistoryPeriod;
  period: AnalyticsPeriod;
}) {
  const url = new URL('/api/v1/analytics/dashboard', getInternalApiUrl());
  url.searchParams.set('period', options.period);
  url.searchParams.set('historyPeriod', options.historyPeriod);
  url.searchParams.set('heatmapPeriod', options.heatmapPeriod);
  if (options.date) url.searchParams.set('date', options.date);
  return requestAnalytics<AnalyticsDashboardData>(url);
}

export async function getServerAnalyticsHeatmap(
  period: AnalyticsHeatmapPeriod,
) {
  const url = new URL('/api/v1/analytics/heatmap', getInternalApiUrl());
  url.searchParams.set('period', period);
  return requestAnalytics<AnalyticsHeatmapData>(url);
}

async function getServerAnalyticsRanking<T>(
  resource: 'categories' | 'habits',
  period: AnalyticsHistoryPeriod,
) {
  const url = new URL(`/api/v1/analytics/${resource}`, getInternalApiUrl());
  url.searchParams.set('period', period);
  return requestAnalytics<T>(url);
}

export const getServerAnalyticsCategories = (period: AnalyticsHistoryPeriod) =>
  getServerAnalyticsRanking<AnalyticsCategoryRankings>('categories', period);
export const getServerAnalyticsHabits = (period: AnalyticsHistoryPeriod) =>
  getServerAnalyticsRanking<AnalyticsHabitRankings>('habits', period);

export async function getServerAnalyticsHistory(
  period: AnalyticsHistoryPeriod,
) {
  const url = new URL('/api/v1/analytics/history', getInternalApiUrl());
  url.searchParams.set('period', period);
  url.searchParams.set('granularity', 'day');

  return requestAnalytics<AnalyticsHistoryData>(url);
}

export async function getServerAnalyticsInsights(
  period: AnalyticsHistoryPeriod,
) {
  const url = new URL('/api/v1/analytics/insights', getInternalApiUrl());
  url.searchParams.set('period', period);
  return requestAnalytics<AnalyticsInsightsData>(url);
}
