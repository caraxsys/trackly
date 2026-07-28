export type AnalyticsPeriod = 'day' | 'week' | 'month';

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
