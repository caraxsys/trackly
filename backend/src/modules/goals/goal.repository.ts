import { and, asc, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { categories, goals, goalSteps, habits } from '../../db/schema/index.js';
import { calculateCompletionPercentage } from '../today/today.summary.js';
import type { TodayGoal } from './goal.types.js';

export function createGoalRepository(database: Database) {
  return {
    async findByIdForUser(userId: string, goalId: string) {
      return (
        (
          await database
            .select()
            .from(goals)
            .where(
              and(
                eq(goals.id, goalId),
                eq(goals.userId, userId),
                isNull(goals.deletedAt),
              ),
            )
            .limit(1)
        )[0] ?? null
      );
    },

    async listForUser(
      userId: string,
      filters: {
        status?: 'active' | 'completed' | 'cancelled';
        habitId?: string;
        overlapsStartDate?: string;
        overlapsEndDate?: string;
      } = {},
    ) {
      return database
        .select()
        .from(goals)
        .where(
          and(
            eq(goals.userId, userId),
            isNull(goals.deletedAt),
            filters.status ? eq(goals.status, filters.status) : undefined,
            filters.habitId ? eq(goals.habitId, filters.habitId) : undefined,
            filters.overlapsEndDate
              ? lte(goals.startDate, filters.overlapsEndDate)
              : undefined,
            filters.overlapsStartDate
              ? gte(goals.endDate, filters.overlapsStartDate)
              : undefined,
          ),
        )
        .orderBy(desc(goals.startDate), desc(goals.createdAt), asc(goals.id));
    },

    async verifyHabitOwnership(userId: string, habitId: string) {
      const row = await database
        .select({ id: habits.id })
        .from(habits)
        .where(
          and(
            eq(habits.id, habitId),
            eq(habits.userId, userId),
            isNull(habits.deletedAt),
          ),
        )
        .limit(1);
      return row.length === 1;
    },

    async listActiveForDate(
      userId: string,
      date: string,
    ): Promise<TodayGoal[]> {
      const rows = await database
        .select({
          id: goals.id,
          title: goals.title,
          description: goals.description,
          status: goals.status,
          startDate: goals.startDate,
          targetDate: goals.targetDate,
          coverImageUrl: goals.coverImageUrl,
          position: goals.position,
          categoryId: categories.id,
          categoryName: categories.name,
          categoryColor: categories.color,
          categoryIcon: categories.icon,
          totalSteps: sql<number>`count(${goalSteps.id})::int`,
          completedSteps: sql<number>`count(${goalSteps.id}) filter (where ${goalSteps.isCompleted} = true)::int`,
        })
        .from(goals)
        .leftJoin(
          categories,
          and(
            eq(categories.id, goals.categoryId),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .leftJoin(goalSteps, eq(goalSteps.goalId, goals.id))
        .where(
          and(
            eq(goals.userId, userId),
            isNull(goals.deletedAt),
            eq(goals.status, 'active'),
            or(isNull(goals.startDate), lte(goals.startDate, date)),
          ),
        )
        .groupBy(goals.id, categories.id)
        .orderBy(
          sql`${goals.targetDate} asc nulls last`,
          asc(goals.position),
          asc(goals.createdAt),
          asc(goals.id),
        );

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: 'active',
        startDate: row.startDate,
        targetDate: row.targetDate,
        coverImageUrl: row.coverImageUrl,
        position: row.position,
        totalSteps: row.totalSteps,
        completedSteps: row.completedSteps,
        progressPercentage: calculateCompletionPercentage(
          row.completedSteps,
          row.totalSteps,
        ),
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

export type GoalRepository = ReturnType<typeof createGoalRepository>;
