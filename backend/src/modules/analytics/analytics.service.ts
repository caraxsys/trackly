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
  AnalyticsHistory,
  AnalyticsHistoryGranularity,
  AnalyticsHistoryPeriod,
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

const historyDays: Record<AnalyticsHistoryPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

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

function summarizeHistory(
  period: AnalyticsHistoryPeriod,
  startDate: string,
  endDate: string,
  records: AnalyticsHabitRecord[],
): AnalyticsHistory {
  const history = [];

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

export function createAnalyticsQueryService(
  dependencies: AnalyticsServiceDependencies,
) {
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

    async getHistory(options: GetHistoryOptions) {
      const storedTimezone =
        await dependencies.preferenceRepository.findTimezone(options.userId);
      const timezone = resolveTimezone(storedTimezone);

      if (storedTimezone !== null && timezone !== storedTimezone) {
        options.onTimezoneFallback?.();
      }

      const endDate = getLocalCalendarDate(options.now ?? new Date(), timezone);
      const startDate = addCalendarDays(
        endDate,
        -(historyDays[options.period] - 1),
      );
      const records = await dependencies.analyticsRepository.listHabitRecords(
        options.userId,
        startDate,
        endDate,
      );

      return summarizeHistory(options.period, startDate, endDate, records);
    },
  };
}

export type AnalyticsQueryService = ReturnType<
  typeof createAnalyticsQueryService
>;
