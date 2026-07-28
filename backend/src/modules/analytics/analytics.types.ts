export type AnalyticsPeriod = 'day' | 'week' | 'month';

export interface AnalyticsHabitRecord {
  checkIns: Array<{ completedCount: number; date: string }>;
  endDate: string | null;
  frequencyType: 'daily' | 'weekly' | 'custom';
  id: string;
  startDate: string;
  targetCount: number;
  weekdays: number[];
}

export interface AnalyticsSummary {
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
