import { describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '../src/errors/error-codes.js';
import {
  calculateHabitStreak,
  createHabitStreakQueryService,
} from '../src/modules/habits/habit-streak.service.js';
import type { HabitStreakRecord } from '../src/modules/habits/habit-streak.types.js';

function record(overrides: Partial<HabitStreakRecord> = {}): HabitStreakRecord {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    frequencyType: 'daily',
    targetCount: 1,
    startDate: '2026-07-20',
    endDate: null,
    weekdays: [],
    checkIns: [],
    ...overrides,
  };
}

describe('habit streak calculation', () => {
  it('calculates current and longest daily streaks across a broken sequence', () => {
    expect(
      calculateHabitStreak(
        record({
          checkIns: [
            { date: '2026-07-20', completedCount: 1 },
            { date: '2026-07-21', completedCount: 1 },
            { date: '2026-07-23', completedCount: 1 },
            { date: '2026-07-24', completedCount: 1 },
            { date: '2026-07-25', completedCount: 1 },
          ],
        }),
        '2026-07-25',
      ),
    ).toEqual({
      habitId: '00000000-0000-4000-8000-000000000001',
      currentStreak: 3,
      longestStreak: 3,
      lastCompletedDate: '2026-07-25',
    });
  });

  it.each(['weekly', 'custom'] as const)(
    'ignores non-scheduled days for %s schedules',
    (frequencyType) => {
      const result = calculateHabitStreak(
        record({
          frequencyType,
          weekdays: [1, 3, 5],
          checkIns: [
            { date: '2026-07-20', completedCount: 1 },
            { date: '2026-07-22', completedCount: 1 },
            { date: '2026-07-24', completedCount: 1 },
            { date: '2026-07-27', completedCount: 1 },
          ],
        }),
        '2026-07-28',
      );

      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(4);
    },
  );

  it('requires the multi-target count and ignores future completions', () => {
    const result = calculateHabitStreak(
      record({
        targetCount: 3,
        checkIns: [
          { date: '2026-07-20', completedCount: 3 },
          { date: '2026-07-21', completedCount: 2 },
          { date: '2026-07-22', completedCount: 4 },
          { date: '2026-07-29', completedCount: 3 },
        ],
      }),
      '2026-07-22',
    );

    expect(result).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: '2026-07-22',
    });
  });

  it('returns zero current streak when the latest eligible occurrence is incomplete', () => {
    const result = calculateHabitStreak(
      record({
        checkIns: [
          { date: '2026-07-20', completedCount: 1 },
          { date: '2026-07-21', completedCount: 1 },
        ],
      }),
      '2026-07-22',
    );

    expect(result).toMatchObject({
      currentStreak: 0,
      longestStreak: 2,
      lastCompletedDate: '2026-07-21',
    });
  });
});

describe('habit streak query service', () => {
  it('uses the authenticated user timezone and supports inactive records', async () => {
    const findRecord = vi.fn().mockResolvedValue(
      record({
        startDate: '2026-07-27',
        checkIns: [{ date: '2026-07-27', completedCount: 1 }],
      }),
    );
    const service = createHabitStreakQueryService({
      habitStreakRepository: { findRecord },
      preferenceRepository: {
        findTimezone: vi.fn().mockResolvedValue('Asia/Jakarta'),
      },
    });

    await expect(
      service.getStreak(
        {
          userId: 'user-1',
          now: new Date('2026-07-26T18:00:00.000Z'),
        },
        '00000000-0000-4000-8000-000000000001',
      ),
    ).resolves.toMatchObject({ currentStreak: 1 });
    expect(findRecord).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-4000-8000-000000000001',
      '2026-07-27',
    );
  });

  it('returns the same not-found error for inaccessible habits', async () => {
    const service = createHabitStreakQueryService({
      habitStreakRepository: {
        findRecord: vi.fn().mockResolvedValue(null),
      },
      preferenceRepository: {
        findTimezone: vi.fn().mockResolvedValue('UTC'),
      },
    });

    await expect(
      service.getStreak(
        { userId: 'user-1' },
        '00000000-0000-4000-8000-000000000099',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: ErrorCode.NotFound,
    });
  });
});
