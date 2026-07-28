export type AnalyticsPeriod = 'day' | 'week' | 'month';
export type AnalyticsHistoryPeriod = '7d' | '30d' | '90d';
export type AnalyticsHeatmapPeriod = '90d' | '180d' | '365d';

export interface AnalyticsHeatmapData {
  period: AnalyticsHeatmapPeriod;
  startDate: string;
  endDate: string;
  summary: {
    activeDays: number;
    completedDays: number;
    totalScheduledCount: number;
    totalCompletedCount: number;
    averageCompletionRate: number;
  };
  days: Array<{
    date: string;
    scheduledCount: number;
    completedCount: number;
    completionRate: number;
    level: 0 | 1 | 2 | 3 | 4;
  }>;
}

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

export interface AnalyticsCategoryRankings {
  period: AnalyticsHistoryPeriod;
  startDate: string;
  endDate: string;
  hasActivity: boolean;
  categories: Array<{
    categoryId: string;
    name: string;
    scheduledCount: number;
    completedCount: number;
    completionRate: number;
    totalTargetCount: number;
    totalCompletedCount: number;
    progressRate: number;
    activeHabitCount: number;
  }>;
}

export interface AnalyticsHabitRankings {
  period: AnalyticsHistoryPeriod;
  startDate: string;
  endDate: string;
  hasActivity: boolean;
  habits: Array<{
    habitId: string;
    name: string;
    category: { categoryId: string; name: string } | null;
    scheduledCount: number;
    completedCount: number;
    completionRate: number;
    totalTargetCount: number;
    totalCompletedCount: number;
    progressRate: number;
    currentStreak: number;
    longestStreak: number;
  }>;
}
