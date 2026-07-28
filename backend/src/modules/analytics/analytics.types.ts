export type AnalyticsPeriod = 'day' | 'week' | 'month';
export type AnalyticsHistoryPeriod = '7d' | '30d' | '90d';
export type AnalyticsHistoryGranularity = 'day';

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

export interface AnalyticsHistoryPoint {
  completedCount: number;
  completionRate: number;
  date: string;
  progressRate: number;
  scheduledCount: number;
  totalCompletedCount: number;
  totalTargetCount: number;
}

export interface AnalyticsHistory {
  endDate: string;
  granularity: AnalyticsHistoryGranularity;
  history: AnalyticsHistoryPoint[];
  period: AnalyticsHistoryPeriod;
  startDate: string;
  summary: {
    averageCompletionRate: number;
    averageProgressRate: number;
    completedCount: number;
    scheduledCount: number;
    totalCompletedCount: number;
    totalTargetCount: number;
  };
}

export type AnalyticsTrendDirection =
  'up' | 'down' | 'flat' | 'insufficient-data';

export interface AnalyticsInsights {
  endDate: string;
  hasActivity: boolean;
  insights: {
    bestDay: {
      completionRate: number;
      date: string;
    } | null;
    consistency: {
      activeDays: number;
      consistencyRate: number;
      fullyCompletedDays: number;
    } | null;
    lowestDay: {
      completionRate: number;
      date: string;
    } | null;
    mostProductiveWeekday: {
      averageCompletionRate: number;
      weekday:
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
        | 'sunday';
    } | null;
    trend: {
      changePercentagePoints: number | null;
      currentAverageCompletionRate: number | null;
      direction: AnalyticsTrendDirection;
      previousAverageCompletionRate: number | null;
    } | null;
  };
  period: AnalyticsHistoryPeriod;
  startDate: string;
}
