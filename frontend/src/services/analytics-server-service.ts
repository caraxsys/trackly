import 'server-only';

import { cookies } from 'next/headers';

import { getInternalApiUrl } from '@/lib/server-environment';
import type {
  AnalyticsHeatmapData,
  AnalyticsHeatmapPeriod,
  AnalyticsHistoryData,
  AnalyticsHistoryPeriod,
  AnalyticsInsightsData,
  AnalyticsPeriod,
  AnalyticsSummaryData,
} from '@/types/analytics';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';

export class AnalyticsServerError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super('The analytics summary request failed.');
    this.name = 'AnalyticsServerError';
  }
}

export async function getServerAnalyticsSummary(
  period: AnalyticsPeriod,
  date?: string,
) {
  const cookieStore = await cookies();
  const url = new URL('/api/v1/analytics/summary', getInternalApiUrl());
  url.searchParams.set('period', period);
  if (date) url.searchParams.set('date', date);

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      cookie: cookieStore.toString(),
    },
  });
  const payload = (await response.json()) as
    ApiSuccessResponse<AnalyticsSummaryData> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    throw new AnalyticsServerError(
      response.status,
      payload.success ? 'UNKNOWN_ERROR' : payload.error.code,
    );
  }

  return payload.data;
}

export async function getServerAnalyticsHeatmap(
  period: AnalyticsHeatmapPeriod,
) {
  const cookieStore = await cookies();
  const url = new URL('/api/v1/analytics/heatmap', getInternalApiUrl());
  url.searchParams.set('period', period);

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      cookie: cookieStore.toString(),
    },
  });
  const payload = (await response.json()) as
    ApiSuccessResponse<AnalyticsHeatmapData> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    throw new AnalyticsServerError(
      response.status,
      payload.success ? 'UNKNOWN_ERROR' : payload.error.code,
    );
  }

  return payload.data;
}

export async function getServerAnalyticsHistory(
  period: AnalyticsHistoryPeriod,
) {
  const cookieStore = await cookies();
  const url = new URL('/api/v1/analytics/history', getInternalApiUrl());
  url.searchParams.set('period', period);
  url.searchParams.set('granularity', 'day');

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      cookie: cookieStore.toString(),
    },
  });
  const payload = (await response.json()) as
    ApiSuccessResponse<AnalyticsHistoryData> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    throw new AnalyticsServerError(
      response.status,
      payload.success ? 'UNKNOWN_ERROR' : payload.error.code,
    );
  }

  return payload.data;
}

export async function getServerAnalyticsInsights(
  period: AnalyticsHistoryPeriod,
) {
  const cookieStore = await cookies();
  const url = new URL('/api/v1/analytics/insights', getInternalApiUrl());
  url.searchParams.set('period', period);

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      cookie: cookieStore.toString(),
    },
  });
  const payload = (await response.json()) as
    ApiSuccessResponse<AnalyticsInsightsData> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    throw new AnalyticsServerError(
      response.status,
      payload.success ? 'UNKNOWN_ERROR' : payload.error.code,
    );
  }

  return payload.data;
}
