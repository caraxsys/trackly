import { and, asc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import {
  categories,
  habitCheckIns,
  habitSchedules,
  habits,
} from '../../db/schema/index.js';
import type { TodayHabit } from './habit.types.js';

export function createHabitRepository(database: Database) {
  return {
    async listScheduledForDate(
      userId: string,
      date: string,
      isoWeekday: number,
    ): Promise<TodayHabit[]> {
      const rows = await database
        .select({
          id: habits.id,
          name: habits.name,
          description: habits.description,
          frequencyType: habits.frequencyType,
          targetCount: habits.targetCount,
          completedCount: sql<number>`coalesce(${habitCheckIns.completedCount}, 0)`,
          position: habits.position,
          categoryId: categories.id,
          categoryName: categories.name,
          categoryColor: categories.color,
          categoryIcon: categories.icon,
        })
        .from(habits)
        .leftJoin(
          habitSchedules,
          and(
            eq(habitSchedules.habitId, habits.id),
            eq(habitSchedules.dayOfWeek, isoWeekday),
          ),
        )
        .leftJoin(
          habitCheckIns,
          and(
            eq(habitCheckIns.habitId, habits.id),
            eq(habitCheckIns.userId, userId),
            eq(habitCheckIns.checkInDate, date),
          ),
        )
        .leftJoin(
          categories,
          and(
            eq(categories.id, habits.categoryId),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .where(
          and(
            eq(habits.userId, userId),
            isNull(habits.deletedAt),
            eq(habits.isActive, true),
            lte(habits.startDate, date),
            or(isNull(habits.endDate), gte(habits.endDate, date)),
            or(
              eq(habits.frequencyType, 'daily'),
              and(
                or(
                  eq(habits.frequencyType, 'weekly'),
                  eq(habits.frequencyType, 'custom'),
                ),
                sql`${habitSchedules.id} is not null`,
              ),
            ),
          ),
        )
        .orderBy(asc(habits.position), asc(habits.createdAt), asc(habits.id));

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        frequencyType: row.frequencyType,
        targetCount: row.targetCount,
        completedCount: row.completedCount,
        isCompleted: row.completedCount >= row.targetCount,
        position: row.position,
        category: row.categoryId
          ? {
              id: row.categoryId,
              name: row.categoryName ?? '',
              color: row.categoryColor,
              icon: row.categoryIcon,
            }
          : null,
      }));
    },
  };
}

export type HabitRepository = ReturnType<typeof createHabitRepository>;
