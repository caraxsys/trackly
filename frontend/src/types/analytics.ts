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
