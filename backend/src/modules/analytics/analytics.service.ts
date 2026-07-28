import {
  addCalendarDays,
  getIsoWeekday,
  parseCalendarDate,
} from '../../lib/date/calendar-date.js';
import {
  getLocalCalendarDate,
  resolveTimezone,
} from '../../lib/date/timezone.js';
import type { PreferenceRepository } from '../preferences/preference.repository.js';
import type { AnalyticsQueryRepository } from './analytics.repository.js';
import type {
  AnalyticsHabitRecord,
  AnalyticsHeatmap,
  AnalyticsHeatmapPeriod,
  AnalyticsHistory,
  AnalyticsHistoryGranularity,
  AnalyticsHistoryPeriod,
  AnalyticsInsights,
  AnalyticsPeriod,
  AnalyticsSummary,
} from './analytics.types.js';

interface AnalyticsServiceDependencies {
  analyticsRepository: AnalyticsQueryRepository;
  preferenceRepository: PreferenceRepository;
}

interface GetSummaryOptions {
  date?: string;
  now?: Date;
  onTimezoneFallback?: () => void;
  period: AnalyticsPeriod;
  userId: string;
}

interface GetHistoryOptions {
  granularity: AnalyticsHistoryGranularity;
  now?: Date;
  onTimezoneFallback?: () => void;
  period: AnalyticsHistoryPeriod;
  userId: string;
}

interface GetInsightsOptions {
  now?: Date;
  onTimezoneFallback?: () => void;
  period: AnalyticsHistoryPeriod;
  userId: string;
}

interface GetHeatmapOptions {
  now?: Date;
  onTimezoneFallback?: () => void;
  period: AnalyticsHeatmapPeriod;
  userId: string;
}

const historyDays: Record<AnalyticsHistoryPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const trendWindowDays: Record<AnalyticsHistoryPeriod, number> = {
  '7d': 3,
  '30d': 7,
  '90d': 30,
};

const heatmapDays: Record<AnalyticsHeatmapPeriod, number> = {
  '90d': 90,
  '180d': 180,
  '365d': 365,
};

const weekdayNames = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function formatDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function resolveAnalyticsRange(
  period: AnalyticsPeriod,
  selectedDate: string,
) {
  const parsed = parseCalendarDate(selectedDate);

  if (!parsed) {
    throw new Error('A valid selected date is required.');
  }

  if (period === 'day') {
    return { startDate: selectedDate, endDate: selectedDate };
  }

  if (period === 'week') {
    const startDate = addCalendarDays(
      selectedDate,
      -(getIsoWeekday(selectedDate) - 1),
    );
    return { startDate, endDate: addCalendarDays(startDate, 6) };
  }

  const startDate = formatDate(parsed.year, parsed.month, 1);
  const lastDay = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate();
  return {
    startDate,
    endDate: formatDate(parsed.year, parsed.month, lastDay),
  };
}

function isScheduled(record: AnalyticsHabitRecord, date: string) {
  if (
    date < record.startDate ||
    (record.endDate !== null && date > record.endDate)
  ) {
    return false;
  }

  return (
    record.frequencyType === 'daily' ||
    record.weekdays.includes(getIsoWeekday(date))
  );
}

function roundRate(numerator: number, denominator: number) {
  return denominator === 0
    ? 0
    : Math.round((numerator / denominator) * 10_000) / 100;
}

function roundAverage(total: number, count: number) {
  return count === 0 ? 0 : Math.round((total / count) * 100) / 100;
}

function summarize(
  period: AnalyticsPeriod,
  startDate: string,
  endDate: string,
  records: AnalyticsHabitRecord[],
): AnalyticsSummary {
  let scheduledCount = 0;
  let completedCount = 0;
  let totalTargetCount = 0;
  let totalCompletedCount = 0;
  const progressByHabitAndDate = new Map(
    records.map((record) => [
      record.id,
      new Map(
        record.checkIns.map(({ date, completedCount }) => [
          date,
          completedCount,
        ]),
      ),
    ]),
  );

  for (let date = startDate; date <= endDate; date = addCalendarDays(date, 1)) {
    for (const record of records) {
      if (!isScheduled(record, date)) continue;

      const completed = progressByHabitAndDate.get(record.id)?.get(date) ?? 0;
      const cappedCompleted = Math.min(completed, record.targetCount);

      scheduledCount += 1;
      totalTargetCount += record.targetCount;
      totalCompletedCount += cappedCompleted;
      if (completed >= record.targetCount) completedCount += 1;
    }
  }

  return {
    period,
    startDate,
    endDate,
    scheduledCount,
    completedCount,
    completionRate: roundRate(completedCount, scheduledCount),
    totalTargetCount,
    totalCompletedCount,
    progressRate: roundRate(totalCompletedCount, totalTargetCount),
  };
}

function summarizeDailyRange(
  startDate: string,
  endDate: string,
  records: AnalyticsHabitRecord[],
): AnalyticsHistory['history'] {
  const history: AnalyticsHistory['history'] = [];

  for (let date = startDate; date <= endDate; date = addCalendarDays(date, 1)) {
    const point = summarize('day', date, date, records);
    history.push({
      date,
      scheduledCount: point.scheduledCount,
      completedCount: point.completedCount,
      completionRate: point.completionRate,
      totalTargetCount: point.totalTargetCount,
      totalCompletedCount: point.totalCompletedCount,
      progressRate: point.progressRate,
    });
  }

  return history;
}

function summarizeHistory(
  period: AnalyticsHistoryPeriod,
  startDate: string,
  endDate: string,
  records: AnalyticsHabitRecord[],
): AnalyticsHistory {
  const history = summarizeDailyRange(startDate, endDate, records);

  const totals = history.reduce(
    (result, point) => ({
      scheduledCount: result.scheduledCount + point.scheduledCount,
      completedCount: result.completedCount + point.completedCount,
      totalTargetCount: result.totalTargetCount + point.totalTargetCount,
      totalCompletedCount:
        result.totalCompletedCount + point.totalCompletedCount,
      completionRate: result.completionRate + point.completionRate,
      progressRate: result.progressRate + point.progressRate,
    }),
    {
      scheduledCount: 0,
      completedCount: 0,
      totalTargetCount: 0,
      totalCompletedCount: 0,
      completionRate: 0,
      progressRate: 0,
    },
  );

  return {
    period,
    granularity: 'day',
    startDate,
    endDate,
    summary: {
      averageCompletionRate: roundAverage(
        totals.completionRate,
        history.length,
      ),
      averageProgressRate: roundAverage(totals.progressRate, history.length),
      scheduledCount: totals.scheduledCount,
      completedCount: totals.completedCount,
      totalTargetCount: totals.totalTargetCount,
      totalCompletedCount: totals.totalCompletedCount,
    },
    history,
  };
}

function averageActiveCompletionRate(
  points: AnalyticsHistory['history'],
): number | null {
  const activePoints = points.filter((point) => point.scheduledCount > 0);
  return activePoints.length === 0
    ? null
    : roundAverage(
        activePoints.reduce((total, point) => total + point.completionRate, 0),
        activePoints.length,
      );
}

export function deriveAnalyticsInsights(
  history: AnalyticsHistory,
): AnalyticsInsights {
  const activeDays = history.history.filter(
    (point) => point.scheduledCount > 0,
  );
  const emptyInsights: AnalyticsInsights = {
    period: history.period,
    startDate: history.startDate,
    endDate: history.endDate,
    hasActivity: false,
    insights: {
      bestDay: null,
      lowestDay: null,
      mostProductiveWeekday: null,
      consistency: null,
      trend: null,
    },
  };

  if (activeDays.length === 0) return emptyInsights;

  const newestFirst = [...activeDays].sort((left, right) =>
    right.date.localeCompare(left.date),
  );
  const bestDay = newestFirst.reduce((best, point) =>
    point.completionRate > best.completionRate ? point : best,
  );
  const lowestDay = newestFirst.reduce((lowest, point) =>
    point.completionRate < lowest.completionRate ? point : lowest,
  );
  const weekdayRates = new Map<number, number[]>();

  for (const point of activeDays) {
    const weekday = getIsoWeekday(point.date);
    const rates = weekdayRates.get(weekday) ?? [];
    rates.push(point.completionRate);
    weekdayRates.set(weekday, rates);
  }

  const weekdayAverages = [...weekdayRates.entries()]
    .map(([weekday, rates]) => ({
      weekday,
      averageCompletionRate: roundAverage(
        rates.reduce((total, rate) => total + rate, 0),
        rates.length,
      ),
    }))
    .sort(
      (left, right) =>
        right.averageCompletionRate - left.averageCompletionRate ||
        left.weekday - right.weekday,
    );
  const mostProductiveWeekday = weekdayAverages[0]!;
  const fullyCompletedDays = activeDays.filter(
    (point) => point.completedCount === point.scheduledCount,
  ).length;
  const windowDays = trendWindowDays[history.period];
  const currentWindow = history.history.slice(-windowDays);
  const previousWindow = history.history.slice(-windowDays * 2, -windowDays);
  const currentAverage = averageActiveCompletionRate(currentWindow);
  const previousAverage = averageActiveCompletionRate(previousWindow);
  const hasTrendData = currentAverage !== null && previousAverage !== null;
  const change = hasTrendData
    ? roundAverage(currentAverage - previousAverage, 1)
    : null;

  return {
    ...emptyInsights,
    hasActivity: true,
    insights: {
      bestDay: {
        date: bestDay.date,
        completionRate: bestDay.completionRate,
      },
      lowestDay: {
        date: lowestDay.date,
        completionRate: lowestDay.completionRate,
      },
      mostProductiveWeekday: {
        weekday: weekdayNames[mostProductiveWeekday.weekday - 1]!,
        averageCompletionRate: mostProductiveWeekday.averageCompletionRate,
      },
      consistency: {
        fullyCompletedDays,
        activeDays: activeDays.length,
        consistencyRate: roundRate(fullyCompletedDays, activeDays.length),
      },
      trend: hasTrendData
        ? {
            direction: change === 0 ? 'flat' : change! > 0 ? 'up' : 'down',
            currentAverageCompletionRate: currentAverage,
            previousAverageCompletionRate: previousAverage,
            changePercentagePoints: change,
          }
        : {
            direction: 'insufficient-data',
            currentAverageCompletionRate: currentAverage,
            previousAverageCompletionRate: previousAverage,
            changePercentagePoints: null,
          },
    },
  };
}

export function resolveHeatmapLevel(
  scheduledCount: number,
  completedCount: number,
): 0 | 1 | 2 | 3 | 4 {
  if (scheduledCount === 0 || completedCount === 0) return 0;

  const scaledCompleted = completedCount * 100;
  if (scaledCompleted < scheduledCount * 25) return 1;
  if (scaledCompleted < scheduledCount * 50) return 2;
  if (scaledCompleted < scheduledCount * 100) return 3;
  return 4;
}

export function deriveAnalyticsHeatmap(
  period: AnalyticsHeatmapPeriod,
  startDate: string,
  endDate: string,
  days: AnalyticsHistory['history'],
): AnalyticsHeatmap {
  const activeDays = days.filter((point) => point.scheduledCount > 0);

  return {
    period,
    startDate,
    endDate,
    summary: {
      activeDays: activeDays.length,
      completedDays: activeDays.filter(
        (point) => point.completedCount === point.scheduledCount,
      ).length,
      totalScheduledCount: activeDays.reduce(
        (total, point) => total + point.scheduledCount,
        0,
      ),
      totalCompletedCount: activeDays.reduce(
        (total, point) => total + point.completedCount,
        0,
      ),
      averageCompletionRate: roundAverage(
        activeDays.reduce((total, point) => total + point.completionRate, 0),
        activeDays.length,
      ),
    },
    days: days.map((point) => ({
      date: point.date,
      scheduledCount: point.scheduledCount,
      completedCount: point.completedCount,
      completionRate: point.completionRate,
      level: resolveHeatmapLevel(point.scheduledCount, point.completedCount),
    })),
  };
}

export function createAnalyticsQueryService(
  dependencies: AnalyticsServiceDependencies,
) {
  async function loadDailyHistory(
    options: Pick<GetHistoryOptions, 'now' | 'onTimezoneFallback' | 'userId'>,
    days: number,
  ) {
    const storedTimezone = await dependencies.preferenceRepository.findTimezone(
      options.userId,
    );
    const timezone = resolveTimezone(storedTimezone);

    if (storedTimezone !== null && timezone !== storedTimezone) {
      options.onTimezoneFallback?.();
    }

    const endDate = getLocalCalendarDate(options.now ?? new Date(), timezone);
    const startDate = addCalendarDays(endDate, -(days - 1));
    const records = await dependencies.analyticsRepository.listHabitRecords(
      options.userId,
      startDate,
      endDate,
    );

    return { startDate, endDate, records };
  }

  async function getHistory(options: GetHistoryOptions) {
    const { startDate, endDate, records } = await loadDailyHistory(
      options,
      historyDays[options.period],
    );
    return summarizeHistory(options.period, startDate, endDate, records);
  }

  return {
    async getSummary(options: GetSummaryOptions) {
      const storedTimezone =
        await dependencies.preferenceRepository.findTimezone(options.userId);
      const timezone = resolveTimezone(storedTimezone);

      if (storedTimezone !== null && timezone !== storedTimezone) {
        options.onTimezoneFallback?.();
      }

      const selectedDate =
        options.date ??
        getLocalCalendarDate(options.now ?? new Date(), timezone);
      const { startDate, endDate } = resolveAnalyticsRange(
        options.period,
        selectedDate,
      );
      const records = await dependencies.analyticsRepository.listHabitRecords(
        options.userId,
        startDate,
        endDate,
      );

      return summarize(options.period, startDate, endDate, records);
    },

    getHistory,

    async getInsights(options: GetInsightsOptions) {
      return deriveAnalyticsInsights(
        await getHistory({ ...options, granularity: 'day' }),
      );
    },

    async getHeatmap(options: GetHeatmapOptions) {
      const { startDate, endDate, records } = await loadDailyHistory(
        options,
        heatmapDays[options.period],
      );
      const days = summarizeDailyRange(startDate, endDate, records);
      return deriveAnalyticsHeatmap(options.period, startDate, endDate, days);
    },
  };
}

export type AnalyticsQueryService = ReturnType<
  typeof createAnalyticsQueryService
>;
