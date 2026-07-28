export type AnalyticsPeriod = 'day' | 'week' | 'month';
export type AnalyticsHistoryPeriod = '7d' | '30d' | '90d';

export interface AnalyticsSummaryData {
  completedCount: number;
  completionRate: number;
  endDate: string;
  period: AnalyticsPeriod;
  progressRate: number;
  scheduledCount: number;
  startDate: string;
  totalCompletedCount: number;
  totalTargetCount: number;
}

export interface AnalyticsHistoryPoint {
  date: string;
  scheduledCount: number;
  completedCount: number;
  completionRate: number;
  totalTargetCount: number;
  totalCompletedCount: number;
  progressRate: number;
}

export interface AnalyticsHistoryData {
  period: AnalyticsHistoryPeriod;
  granularity: 'day';
  startDate: string;
  endDate: string;
  summary: {
    averageCompletionRate: number;
    averageProgressRate: number;
    scheduledCount: number;
    completedCount: number;
    totalTargetCount: number;
    totalCompletedCount: number;
  };
  history: AnalyticsHistoryPoint[];
}

export type AnalyticsTrendDirection =
  'up' | 'down' | 'flat' | 'insufficient-data';

export interface AnalyticsInsightsData {
  period: AnalyticsHistoryPeriod;
  startDate: string;
  endDate: string;
  hasActivity: boolean;
  insights: {
    bestDay: {
      date: string;
      completionRate: number;
    } | null;
    lowestDay: {
      date: string;
      completionRate: number;
    } | null;
    mostProductiveWeekday: {
      weekday:
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
        | 'sunday';
      averageCompletionRate: number;
    } | null;
    consistency: {
      fullyCompletedDays: number;
      activeDays: number;
      consistencyRate: number;
    } | null;
    trend: {
      direction: AnalyticsTrendDirection;
      currentAverageCompletionRate: number | null;
      previousAverageCompletionRate: number | null;
      changePercentagePoints: number | null;
    } | null;
  };
}
