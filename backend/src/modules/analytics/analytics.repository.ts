import { and, eq, gte, isNull, lte, or } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import {
  habitCheckIns,
  habitSchedules,
  habits,
  categories,
} from '../../db/schema/index.js';
import type { AnalyticsHabitRecord } from './analytics.types.js';

export function createAnalyticsQueryRepository(database: Database) {
  return {
    async listHabitRecords(
      userId: string,
      startDate: string,
      endDate: string,
      options: {
        includeHistoricalCheckIns?: boolean;
        includeInactive?: boolean;
      } = {},
    ): Promise<AnalyticsHabitRecord[]> {
      const ownedRangeFilter = and(
        eq(habits.userId, userId),
        options.includeInactive ? undefined : eq(habits.isActive, true),
        isNull(habits.deletedAt),
        lte(habits.startDate, endDate),
        or(isNull(habits.endDate), gte(habits.endDate, startDate)),
      );
      const [habitRows, scheduleRows, checkInRows] = await Promise.all([
        database
          .select({
            categoryId: habits.categoryId,
            categoryName: categories.name,
            id: habits.id,
            name: habits.name,
            frequencyType: habits.frequencyType,
            isActive: habits.isActive,
            targetCount: habits.targetCount,
            startDate: habits.startDate,
            endDate: habits.endDate,
          })
          .from(habits)
          .leftJoin(categories, eq(categories.id, habits.categoryId))
          .where(ownedRangeFilter),
        database
          .select({
            habitId: habitSchedules.habitId,
            dayOfWeek: habitSchedules.dayOfWeek,
          })
          .from(habitSchedules)
          .innerJoin(habits, eq(habits.id, habitSchedules.habitId))
          .where(ownedRangeFilter),
        database
          .select({
            habitId: habitCheckIns.habitId,
            date: habitCheckIns.checkInDate,
            completedCount: habitCheckIns.completedCount,
          })
          .from(habitCheckIns)
          .innerJoin(habits, eq(habits.id, habitCheckIns.habitId))
          .where(
            and(
              ownedRangeFilter,
              eq(habitCheckIns.userId, userId),
              options.includeHistoricalCheckIns
                ? undefined
                : gte(habitCheckIns.checkInDate, startDate),
              lte(habitCheckIns.checkInDate, endDate),
            ),
          ),
      ]);

      const weekdaysByHabit = new Map<string, number[]>();
      for (const { habitId, dayOfWeek } of scheduleRows) {
        const weekdays = weekdaysByHabit.get(habitId) ?? [];
        weekdays.push(dayOfWeek);
        weekdaysByHabit.set(habitId, weekdays);
      }

      const checkInsByHabit = new Map<
        string,
        Array<{ completedCount: number; date: string }>
      >();
      for (const { habitId, date, completedCount } of checkInRows) {
        const checkIns = checkInsByHabit.get(habitId) ?? [];
        checkIns.push({ date, completedCount });
        checkInsByHabit.set(habitId, checkIns);
      }

      return habitRows.map((row) => ({
        id: row.id,
        name: row.name,
        category:
          row.categoryId && row.categoryName
            ? { categoryId: row.categoryId, name: row.categoryName }
            : null,
        frequencyType: row.frequencyType,
        isActive: row.isActive,
        targetCount: row.targetCount,
        startDate: row.startDate,
        endDate: row.endDate,
        weekdays: (weekdaysByHabit.get(row.id) ?? []).sort(
          (left, right) => left - right,
        ),
        checkIns: checkInsByHabit.get(row.id) ?? [],
      }));
    },
  };
}

export type AnalyticsQueryRepository = ReturnType<
  typeof createAnalyticsQueryRepository
>;
