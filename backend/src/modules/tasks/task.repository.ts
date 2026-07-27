import { and, asc, eq, gte, isNotNull, isNull, lt, or } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { categories, tasks } from '../../db/schema/index.js';
import type { TaskPriority, TodayTask, TodayTaskGroups } from './task.types.js';

const priorityRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function categoryFromRow(row: {
  categoryColor: string | null;
  categoryIcon: string | null;
  categoryId: string | null;
  categoryName: string | null;
}) {
  return row.categoryId
    ? {
        id: row.categoryId,
        name: row.categoryName ?? '',
        color: row.categoryColor,
        icon: row.categoryIcon,
      }
    : null;
}

export function createTaskRepository(database: Database) {
  return {
    async listForLocalDay(
      userId: string,
      start: Date,
      end: Date,
    ): Promise<TodayTaskGroups> {
      const rows = await database
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          dueAt: tasks.dueAt,
          completedAt: tasks.completedAt,
          position: tasks.position,
          categoryId: categories.id,
          categoryName: categories.name,
          categoryColor: categories.color,
          categoryIcon: categories.icon,
        })
        .from(tasks)
        .leftJoin(
          categories,
          and(
            eq(categories.id, tasks.categoryId),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .where(
          and(
            eq(tasks.userId, userId),
            isNull(tasks.deletedAt),
            or(
              and(
                isNotNull(tasks.dueAt),
                lt(tasks.dueAt, start),
                or(eq(tasks.status, 'todo'), eq(tasks.status, 'in_progress')),
              ),
              and(
                isNotNull(tasks.dueAt),
                gte(tasks.dueAt, start),
                lt(tasks.dueAt, end),
                or(eq(tasks.status, 'todo'), eq(tasks.status, 'in_progress')),
              ),
              and(
                eq(tasks.status, 'completed'),
                isNotNull(tasks.completedAt),
                gte(tasks.completedAt, start),
                lt(tasks.completedAt, end),
              ),
            ),
          ),
        )
        .orderBy(asc(tasks.id));

      const groups: TodayTaskGroups = {
        overdue: [],
        dueToday: [],
        completedToday: [],
      };

      for (const row of rows) {
        const task: TodayTask = {
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          dueAt: row.dueAt,
          completedAt: row.completedAt,
          position: row.position,
          category: categoryFromRow(row),
        };

        if (
          task.status === 'completed' &&
          task.completedAt &&
          task.completedAt >= start &&
          task.completedAt < end
        ) {
          groups.completedToday.push(task);
        } else if (task.dueAt && task.dueAt < start) {
          groups.overdue.push(task);
        } else {
          groups.dueToday.push(task);
        }
      }

      groups.overdue.sort(
        (left, right) =>
          (left.dueAt?.getTime() ?? 0) - (right.dueAt?.getTime() ?? 0) ||
          priorityRank[right.priority] - priorityRank[left.priority] ||
          left.position - right.position ||
          left.id.localeCompare(right.id),
      );
      groups.dueToday.sort(
        (left, right) =>
          priorityRank[right.priority] - priorityRank[left.priority] ||
          (left.dueAt?.getTime() ?? 0) - (right.dueAt?.getTime() ?? 0) ||
          left.position - right.position ||
          left.id.localeCompare(right.id),
      );
      groups.completedToday.sort(
        (left, right) =>
          (right.completedAt?.getTime() ?? 0) -
            (left.completedAt?.getTime() ?? 0) ||
          left.id.localeCompare(right.id),
      );

      return groups;
    },
  };
}

export type TaskRepository = ReturnType<typeof createTaskRepository>;
