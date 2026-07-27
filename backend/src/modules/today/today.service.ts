import { getIsoWeekday } from '../../lib/date/calendar-date.js';
import {
  getLocalCalendarDate,
  getLocalDayBounds,
  resolveTimezone,
} from '../../lib/date/timezone.js';
import type { GoalRepository } from '../goals/goal.repository.js';
import type { HabitRepository } from '../habits/habit.repository.js';
import type { PreferenceRepository } from '../preferences/preference.repository.js';
import type { TaskRepository } from '../tasks/task.repository.js';
import { createTodaySummary } from './today.summary.js';
import type { TodayData } from './today.types.js';

interface TodayServiceDependencies {
  goalRepository: GoalRepository;
  habitRepository: HabitRepository;
  preferenceRepository: PreferenceRepository;
  taskRepository: TaskRepository;
}

interface GetTodayOptions {
  date?: string;
  now?: Date;
  onTimezoneFallback?: () => void;
  userId: string;
}

export function createTodayService(dependencies: TodayServiceDependencies) {
  return {
    async getToday(options: GetTodayOptions): Promise<TodayData> {
      const storedTimezone =
        await dependencies.preferenceRepository.findTimezone(options.userId);
      const timezone = resolveTimezone(storedTimezone);

      if (storedTimezone !== null && timezone !== storedTimezone) {
        options.onTimezoneFallback?.();
      }

      const date =
        options.date ??
        getLocalCalendarDate(options.now ?? new Date(), timezone);
      const { start, end } = getLocalDayBounds(date, timezone);

      const [habits, tasks, goals] = await Promise.all([
        dependencies.habitRepository.listScheduledForDate(
          options.userId,
          date,
          getIsoWeekday(date),
        ),
        dependencies.taskRepository.listForLocalDay(options.userId, start, end),
        dependencies.goalRepository.listActiveForDate(options.userId, date),
      ]);

      return {
        date,
        timezone,
        habits,
        tasks,
        goals,
        summary: createTodaySummary(habits, tasks, goals),
      };
    },
  };
}

export type TodayService = ReturnType<typeof createTodayService>;
