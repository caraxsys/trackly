import { describe, expect, it, vi } from 'vitest';

import { addCalendarDays } from '../src/lib/date/calendar-date.js';
import {
  createAnalyticsQueryService,
  deriveAnalyticsHeatmap,
  deriveAnalyticsInsights,
  resolveHeatmapLevel,
  resolveAnalyticsRange,
} from '../src/modules/analytics/analytics.service.js';
import type {
  AnalyticsHabitRecord,
  AnalyticsHistory,
} from '../src/modules/analytics/analytics.types.js';

function record(
  overrides: Partial<AnalyticsHabitRecord> = {},
): AnalyticsHabitRecord {
  return {
    id: 'habit-1',
    frequencyType: 'daily',
    targetCount: 1,
    startDate: '2026-01-01',
    endDate: null,
    weekdays: [],
    checkIns: [],
    ...overrides,
  };
}

function setup(
  records: AnalyticsHabitRecord[],
  timezone: string | null = 'UTC',
) {
  const listHabitRecords = vi.fn().mockResolvedValue(records);
  const findTimezone = vi.fn().mockResolvedValue(timezone);
  const service = createAnalyticsQueryService({
    analyticsRepository: {
      listHabitRecords,
    },
    preferenceRepository: { findTimezone },
  });

  return { service, listHabitRecords };
}

function insightHistory(
  rates: Array<number | null>,
  period: AnalyticsHistory['period'] = '7d',
): AnalyticsHistory {
  const startDate = '2026-07-20';
  return {
    period,
    granularity: 'day',
    startDate,
    endDate: addCalendarDays(startDate, rates.length - 1),
    summary: {
      averageCompletionRate: 0,
      averageProgressRate: 0,
      scheduledCount: 0,
      completedCount: 0,
      totalTargetCount: 0,
      totalCompletedCount: 0,
    },
    history: rates.map((rate, index) => ({
      date: addCalendarDays(startDate, index),
      scheduledCount: rate === null ? 0 : 2,
      completedCount: rate === null ? 0 : rate === 100 ? 2 : rate > 0 ? 1 : 0,
      completionRate: rate ?? 0,
      totalTargetCount: rate === null ? 0 : 2,
      totalCompletedCount: rate === null ? 0 : (rate / 100) * 2,
      progressRate: rate ?? 0,
    })),
  };
}

function repeat<T>(value: T, length: number): T[] {
  return Array.from({ length }, () => value);
}

describe('analytics query service', () => {
  it('ranks habits and rolls category totals deterministically', async () => {
    const { service } = setup([
      record({
        id: 'b',
        name: 'Walk',
        category: { categoryId: 'cat-1', name: 'Health' },
        checkIns: [{ date: '2026-07-28', completedCount: 1 }],
      }),
      record({
        id: 'a',
        name: 'Drink',
        category: { categoryId: 'cat-1', name: 'Health' },
        targetCount: 2,
        checkIns: [{ date: '2026-07-28', completedCount: 1 }],
      }),
    ]);
    const options = {
      userId: 'user-1',
      period: '7d' as const,
      now: new Date('2026-07-28T12:00:00Z'),
    };
    const habits = await service.getHabitRankings(options);
    const categories = await service.getCategoryRankings(options);
    expect(habits.habits.map(({ name }) => name)).toEqual(['Walk', 'Drink']);
    expect(categories.categories[0]).toMatchObject({
      name: 'Health',
      activeHabitCount: 2,
      scheduledCount: 14,
      completedCount: 1,
      totalTargetCount: 21,
      totalCompletedCount: 2,
    });
  });
  it('assigns deterministic heatmap levels at exact percentage boundaries', () => {
    expect(resolveHeatmapLevel(0, 0)).toBe(0);
    expect(resolveHeatmapLevel(10000, 2499)).toBe(1);
    expect(resolveHeatmapLevel(4, 1)).toBe(2);
    expect(resolveHeatmapLevel(2, 1)).toBe(3);
    expect(resolveHeatmapLevel(1, 1)).toBe(4);
  });

  it('derives heatmap summary from active days only', () => {
    const history = insightHistory([null, 0, 50, 100]);
    const result = deriveAnalyticsHeatmap(
      '90d',
      history.startDate,
      history.endDate,
      history.history,
    );

    expect(result.summary).toEqual({
      activeDays: 3,
      completedDays: 1,
      totalScheduledCount: 6,
      totalCompletedCount: 3,
      averageCompletionRate: 50,
    });
    expect(result.days.map(({ level }) => level)).toEqual([0, 0, 3, 4]);
  });

  it.each([
    ['90d' as const, 90, '2023-12-03'],
    ['180d' as const, 180, '2023-09-04'],
    ['365d' as const, 365, '2023-03-03'],
  ])(
    'returns an inclusive %s user-local heatmap through leap year dates',
    async (period, length, expectedStart) => {
      const { service, listHabitRecords } = setup([], 'Pacific/Kiritimati');
      const result = await service.getHeatmap({
        period,
        userId: 'user-1',
        now: new Date('2024-03-01T00:30:00.000Z'),
      });

      expect(result.days).toHaveLength(length);
      expect(result.startDate).toBe(expectedStart);
      expect(result.endDate).toBe('2024-03-01');
      expect(listHabitRecords).toHaveBeenCalledWith(
        'user-1',
        expectedStart,
        '2024-03-01',
      );
    },
  );
  it('resolves day, Monday-Sunday week, month, and leap-year ranges', () => {
    expect(resolveAnalyticsRange('day', '2026-07-29')).toEqual({
      startDate: '2026-07-29',
      endDate: '2026-07-29',
    });
    expect(resolveAnalyticsRange('week', '2026-07-29')).toEqual({
      startDate: '2026-07-27',
      endDate: '2026-08-02',
    });
    expect(resolveAnalyticsRange('month', '2026-07-29')).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });
    expect(resolveAnalyticsRange('month', '2028-02-12')).toEqual({
      startDate: '2028-02-01',
      endDate: '2028-02-29',
    });
  });

  it('uses user-local today when the date is omitted', async () => {
    const { service, listHabitRecords } = setup([], 'Asia/Jakarta');

    const summary = await service.getSummary({
      userId: 'user-1',
      period: 'day',
      now: new Date('2026-07-26T18:00:00.000Z'),
    });

    expect(summary.startDate).toBe('2026-07-27');
    expect(listHabitRecords).toHaveBeenCalledWith(
      'user-1',
      '2026-07-27',
      '2026-07-27',
    );
  });

  it('evaluates daily, weekly, and custom schedules with inclusive ranges', async () => {
    const { service } = setup([
      record({
        id: 'daily',
        startDate: '2026-07-27',
        endDate: '2026-07-28',
      }),
      record({
        id: 'weekly',
        frequencyType: 'weekly',
        weekdays: [1, 3],
      }),
      record({
        id: 'custom',
        frequencyType: 'custom',
        weekdays: [7],
      }),
    ]);

    const summary = await service.getSummary({
      userId: 'user-1',
      period: 'week',
      date: '2026-07-29',
    });

    expect(summary).toMatchObject({
      startDate: '2026-07-27',
      endDate: '2026-08-02',
      scheduledCount: 5,
      totalTargetCount: 5,
    });
  });

  it('derives completion, capped progress, and rounded rates', async () => {
    const { service } = setup([
      record({
        id: 'complete',
        targetCount: 3,
        checkIns: [{ date: '2026-07-27', completedCount: 5 }],
      }),
      record({
        id: 'incomplete',
        targetCount: 4,
        checkIns: [{ date: '2026-07-27', completedCount: 2 }],
      }),
      record({ id: 'zero', targetCount: 2 }),
    ]);

    const summary = await service.getSummary({
      userId: 'user-1',
      period: 'day',
      date: '2026-07-27',
    });

    expect(summary).toEqual({
      period: 'day',
      startDate: '2026-07-27',
      endDate: '2026-07-27',
      scheduledCount: 3,
      completedCount: 1,
      completionRate: 33.33,
      totalTargetCount: 9,
      totalCompletedCount: 5,
      progressRate: 55.56,
    });
  });

  it('returns zero rates for empty denominators', async () => {
    const { service } = setup([]);

    await expect(
      service.getSummary({
        userId: 'user-1',
        period: 'month',
        date: '2026-02-10',
      }),
    ).resolves.toMatchObject({
      scheduledCount: 0,
      completedCount: 0,
      completionRate: 0,
      totalTargetCount: 0,
      totalCompletedCount: 0,
      progressRate: 0,
    });
  });

  it.each([
    ['7d', 7],
    ['30d', 30],
    ['90d', 90],
  ] as const)(
    'returns a gap-free %s daily history',
    async (period, expectedDays) => {
      const { service, listHabitRecords } = setup([]);

      const result = await service.getHistory({
        userId: 'user-1',
        period,
        granularity: 'day',
        now: new Date('2026-07-27T12:00:00.000Z'),
      });

      expect(result.history).toHaveLength(expectedDays);
      expect(result.startDate).toBe(
        period === '7d'
          ? '2026-07-21'
          : period === '30d'
            ? '2026-06-28'
            : '2026-04-29',
      );
      expect(result.endDate).toBe('2026-07-27');
      expect(result.history[0]).toMatchObject({
        date: result.startDate,
        scheduledCount: 0,
        completionRate: 0,
      });
      expect(result.history.at(-1)?.date).toBe(result.endDate);
      expect(listHabitRecords).toHaveBeenCalledWith(
        'user-1',
        result.startDate,
        result.endDate,
      );
    },
  );

  it('derives daily history, capped progress, and arithmetic average rates', async () => {
    const { service } = setup([
      record({
        id: 'multi-target',
        targetCount: 2,
        startDate: '2026-07-21',
        checkIns: [
          { date: '2026-07-21', completedCount: 4 },
          { date: '2026-07-22', completedCount: 1 },
        ],
      }),
    ]);

    const result = await service.getHistory({
      userId: 'user-1',
      period: '7d',
      granularity: 'day',
      now: new Date('2026-07-27T12:00:00.000Z'),
    });

    expect(result.history.slice(0, 3)).toEqual([
      {
        date: '2026-07-21',
        scheduledCount: 1,
        completedCount: 1,
        completionRate: 100,
        totalTargetCount: 2,
        totalCompletedCount: 2,
        progressRate: 100,
      },
      {
        date: '2026-07-22',
        scheduledCount: 1,
        completedCount: 0,
        completionRate: 0,
        totalTargetCount: 2,
        totalCompletedCount: 1,
        progressRate: 50,
      },
      {
        date: '2026-07-23',
        scheduledCount: 1,
        completedCount: 0,
        completionRate: 0,
        totalTargetCount: 2,
        totalCompletedCount: 0,
        progressRate: 0,
      },
    ]);
    expect(result.summary).toEqual({
      averageCompletionRate: 14.29,
      averageProgressRate: 21.43,
      scheduledCount: 7,
      completedCount: 1,
      totalTargetCount: 14,
      totalCompletedCount: 3,
    });
  });

  it('resolves history through the authenticated user local date', async () => {
    const { service, listHabitRecords } = setup([], 'Asia/Jakarta');

    const result = await service.getHistory({
      userId: 'user-1',
      period: '7d',
      granularity: 'day',
      now: new Date('2026-07-26T18:00:00.000Z'),
    });

    expect(result.endDate).toBe('2026-07-27');
    expect(listHabitRecords).toHaveBeenCalledWith(
      'user-1',
      '2026-07-21',
      '2026-07-27',
    );
  });
});

describe('analytics insights', () => {
  it('returns nullable insight values when there are no active days', () => {
    expect(
      deriveAnalyticsInsights(
        insightHistory([null, null, null, null, null, null, null]),
      ),
    ).toEqual({
      period: '7d',
      startDate: '2026-07-20',
      endDate: '2026-07-26',
      hasActivity: false,
      insights: {
        bestDay: null,
        lowestDay: null,
        mostProductiveWeekday: null,
        consistency: null,
        trend: null,
      },
    });
  });

  it('chooses recent tied best and lowest days and Monday-first weekday ties', () => {
    const result = deriveAnalyticsInsights(
      insightHistory([100, null, 50, null, null, null, 100]),
    );

    expect(result.insights.bestDay).toEqual({
      date: '2026-07-26',
      completionRate: 100,
    });
    expect(result.insights.lowestDay).toEqual({
      date: '2026-07-22',
      completionRate: 50,
    });
    expect(result.insights.mostProductiveWeekday).toEqual({
      weekday: 'monday',
      averageCompletionRate: 100,
    });
  });

  it('derives fully completed and partial-day consistency', () => {
    const result = deriveAnalyticsInsights(
      insightHistory([100, 50, null, 100, 0, null, null]),
    );

    expect(result.insights.consistency).toEqual({
      fullyCompletedDays: 2,
      activeDays: 4,
      consistencyRate: 50,
    });
  });

  it.each([
    {
      rates: [null, 20, 20, 20, 60, 60, 60],
      direction: 'up',
      current: 60,
      previous: 20,
      change: 40,
    },
    {
      rates: [null, 80, 80, 80, 30, 30, 30],
      direction: 'down',
      current: 30,
      previous: 80,
      change: -50,
    },
    {
      rates: [null, 50, 50, 50, 50, 50, 50],
      direction: 'flat',
      current: 50,
      previous: 50,
      change: 0,
    },
  ])(
    'returns a $direction equal-window trend',
    ({ rates, direction, current, previous, change }) => {
      expect(
        deriveAnalyticsInsights(insightHistory(rates)).insights.trend,
      ).toEqual({
        direction,
        currentAverageCompletionRate: current,
        previousAverageCompletionRate: previous,
        changePercentagePoints: change,
      });
    },
  );

  it('returns insufficient trend data for one active day', () => {
    const result = deriveAnalyticsInsights(
      insightHistory([null, null, 50, null, null, null, null]),
    );

    expect(result.hasActivity).toBe(true);
    expect(result.insights.trend).toEqual({
      direction: 'insufficient-data',
      currentAverageCompletionRate: null,
      previousAverageCompletionRate: 50,
      changePercentagePoints: null,
    });
  });

  it.each([
    {
      period: '30d' as const,
      rates: [
        ...repeat<number | null>(null, 16),
        ...repeat(20, 7),
        ...repeat(80, 7),
      ],
      current: 80,
      previous: 20,
    },
    {
      period: '90d' as const,
      rates: [
        ...repeat<number | null>(null, 30),
        ...repeat(40, 30),
        ...repeat(60, 30),
      ],
      current: 60,
      previous: 40,
    },
  ])(
    'uses documented equal windows for $period',
    ({ period, rates, current, previous }) => {
      expect(
        deriveAnalyticsInsights(insightHistory(rates, period)).insights.trend,
      ).toMatchObject({
        direction: 'up',
        currentAverageCompletionRate: current,
        previousAverageCompletionRate: previous,
        changePercentagePoints: current - previous,
      });
    },
  );

  it('reuses timezone-aware history when querying insights', async () => {
    const { service, listHabitRecords } = setup([], 'Asia/Jakarta');

    const result = await service.getInsights({
      userId: 'user-1',
      period: '7d',
      now: new Date('2026-07-26T18:00:00.000Z'),
    });

    expect(result.endDate).toBe('2026-07-27');
    expect(listHabitRecords).toHaveBeenCalledWith(
      'user-1',
      '2026-07-21',
      '2026-07-27',
    );
  });
});
