import { describe, expect, it, vi } from 'vitest';

import {
  createAnalyticsQueryService,
  resolveAnalyticsRange,
} from '../src/modules/analytics/analytics.service.js';
import type { AnalyticsHabitRecord } from '../src/modules/analytics/analytics.types.js';

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

describe('analytics query service', () => {
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
});
