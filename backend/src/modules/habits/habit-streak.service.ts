import { AppError } from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import {
  addCalendarDays,
  getIsoWeekday,
} from '../../lib/date/calendar-date.js';
import {
  getLocalCalendarDate,
  resolveTimezone,
} from '../../lib/date/timezone.js';
import type { PreferenceRepository } from '../preferences/preference.repository.js';
import type { HabitStreakQueryRepository } from './habit-streak.repository.js';
import type { HabitStreak, HabitStreakRecord } from './habit-streak.types.js';

interface Dependencies {
  habitStreakRepository: HabitStreakQueryRepository;
  preferenceRepository: PreferenceRepository;
}

interface StreakContext {
  now?: Date;
  onTimezoneFallback?: () => void;
  userId: string;
}

function isScheduled(record: HabitStreakRecord, date: string) {
  return (
    record.frequencyType === 'daily' ||
    record.weekdays.includes(getIsoWeekday(date))
  );
}

export function calculateHabitStreak(
  record: HabitStreakRecord,
  today: string,
): HabitStreak {
  const lastEligibleDate =
    record.endDate !== null && record.endDate < today ? record.endDate : today;
  const completedByDate = new Map(
    record.checkIns.map(({ date, completedCount }) => [date, completedCount]),
  );
  let currentSequence = 0;
  let longestStreak = 0;
  let lastCompletedDate: string | null = null;
  let latestEligibleSequence = 0;

  if (record.startDate <= lastEligibleDate) {
    for (
      let date = record.startDate;
      date <= lastEligibleDate;
      date = addCalendarDays(date, 1)
    ) {
      if (!isScheduled(record, date)) continue;

      if ((completedByDate.get(date) ?? 0) >= record.targetCount) {
        currentSequence += 1;
        longestStreak = Math.max(longestStreak, currentSequence);
        lastCompletedDate = date;
      } else {
        currentSequence = 0;
      }

      latestEligibleSequence = currentSequence;
    }
  }

  return {
    habitId: record.id,
    currentStreak: latestEligibleSequence,
    longestStreak,
    lastCompletedDate,
  };
}

export function createHabitStreakQueryService(dependencies: Dependencies) {
  return {
    async getStreak(
      context: StreakContext,
      habitId: string,
    ): Promise<HabitStreak> {
      const storedTimezone =
        await dependencies.preferenceRepository.findTimezone(context.userId);
      const timezone = resolveTimezone(storedTimezone);

      if (storedTimezone !== null && timezone !== storedTimezone) {
        context.onTimezoneFallback?.();
      }

      const today = getLocalCalendarDate(context.now ?? new Date(), timezone);
      const record = await dependencies.habitStreakRepository.findRecord(
        context.userId,
        habitId,
        today,
      );

      if (!record) {
        throw new AppError({
          statusCode: 404,
          code: ErrorCode.NotFound,
          message: 'Habit was not found.',
        });
      }

      return calculateHabitStreak(record, today);
    },
  };
}

export type HabitStreakQueryService = ReturnType<
  typeof createHabitStreakQueryService
>;
