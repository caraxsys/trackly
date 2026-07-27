import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { categories, goals, goalSteps } from '../../db/schema/index.js';
import { calculateCompletionPercentage } from '../today/today.summary.js';
import type { TodayGoal } from './goal.types.js';

export function createGoalRepository(database: Database) {
  return {
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
