import { and, asc, eq, isNull, lte } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import {
  habitCheckIns,
  habitSchedules,
  habits,
} from '../../db/schema/index.js';
import type { HabitStreakRecord } from './habit-streak.types.js';

export function createHabitStreakQueryRepository(database: Database) {
  return {
    async findRecord(
      userId: string,
      habitId: string,
      throughDate: string,
    ): Promise<HabitStreakRecord | null> {
      const ownedHabitFilter = and(
        eq(habits.id, habitId),
        eq(habits.userId, userId),
        isNull(habits.deletedAt),
      );
      const [habitRows, scheduleRows, checkInRows] = await Promise.all([
        database
          .select({
            id: habits.id,
            frequencyType: habits.frequencyType,
            targetCount: habits.targetCount,
            startDate: habits.startDate,
            endDate: habits.endDate,
          })
          .from(habits)
          .where(ownedHabitFilter)
          .limit(1),
        database
          .select({ dayOfWeek: habitSchedules.dayOfWeek })
          .from(habitSchedules)
          .innerJoin(habits, eq(habits.id, habitSchedules.habitId))
          .where(ownedHabitFilter)
          .orderBy(asc(habitSchedules.dayOfWeek)),
        database
          .select({
            date: habitCheckIns.checkInDate,
            completedCount: habitCheckIns.completedCount,
          })
          .from(habitCheckIns)
          .innerJoin(habits, eq(habits.id, habitCheckIns.habitId))
          .where(
            and(
              ownedHabitFilter,
              eq(habitCheckIns.userId, userId),
              lte(habitCheckIns.checkInDate, throughDate),
            ),
          )
          .orderBy(asc(habitCheckIns.checkInDate)),
      ]);

      const habit = habitRows[0];
      if (!habit) return null;

      return {
        ...habit,
        weekdays: scheduleRows.map(({ dayOfWeek }) => dayOfWeek),
        checkIns: checkInRows,
      };
    },
  };
}

export type HabitStreakQueryRepository = ReturnType<
  typeof createHabitStreakQueryRepository
>;
