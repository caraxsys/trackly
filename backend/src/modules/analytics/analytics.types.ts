export type AnalyticsPeriod = 'day' | 'week' | 'month';
export type AnalyticsHistoryPeriod = '7d' | '30d' | '90d';
export type AnalyticsHistoryGranularity = 'day';
export type AnalyticsHeatmapPeriod = '90d' | '180d' | '365d';

export interface AnalyticsHabitRecord {
  category?: { categoryId: string; name: string } | null;
  checkIns: Array<{ completedCount: number; date: string }>;
  endDate: string | null;
  frequencyType: 'daily' | 'weekly' | 'custom';
  id: string;
  isActive: boolean;
  name?: string;
  startDate: string;
  targetCount: number;
  weekdays: number[];
}

export interface AnalyticsDashboard {
  categories: AnalyticsCategoryRanking;
  habits: AnalyticsHabitRanking;
  heatmap: AnalyticsHeatmap;
  history: AnalyticsHistory;
  insights: AnalyticsInsights;
  summary: AnalyticsSummary;
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

export interface AnalyticsHeatmap {
  days: Array<{
    completedCount: number;
    completionRate: number;
    date: string;
    level: 0 | 1 | 2 | 3 | 4;
    scheduledCount: number;
  }>;
  endDate: string;
  period: AnalyticsHeatmapPeriod;
  startDate: string;
  summary: {
    activeDays: number;
    averageCompletionRate: number;
    completedDays: number;
    totalCompletedCount: number;
    totalScheduledCount: number;
  };
}

export interface AnalyticsHabitRanking {
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

export interface AnalyticsCategoryRanking {
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
