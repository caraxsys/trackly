import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import {
  categories,
  habitCheckIns,
  habitSchedules,
  habits,
} from '../../db/schema/index.js';
import type {
  HabitCollectionQuery,
  HabitListItem,
  TodayHabit,
} from './habit.types.js';

interface ListOptions extends HabitCollectionQuery {
  isoWeekday: number;
  userId: string;
}

function scheduledCondition(date: string, isoWeekday: number): SQL {
  return and(
    eq(habits.isActive, true),
    lte(habits.startDate, date),
    or(isNull(habits.endDate), gte(habits.endDate, date)),
    or(
      eq(habits.frequencyType, 'daily'),
      sql`exists (
        select 1 from ${habitSchedules}
        where ${habitSchedules.habitId} = ${habits.id}
          and ${habitSchedules.dayOfWeek} = ${isoWeekday}
      )`,
    ),
  )!;
}

function collectionFilter(options: ListOptions): SQL {
  const filters: SQL[] = [
    eq(habits.userId, options.userId),
    isNull(habits.deletedAt),
  ];

  if (options.view === 'today') {
    filters.push(scheduledCondition(options.date, options.isoWeekday));
  } else if (options.view === 'inactive') {
    filters.push(eq(habits.isActive, false));
  }

  if (options.search) {
    const pattern = `%${options.search}%`;
    filters.push(
      or(ilike(habits.name, pattern), ilike(habits.description, pattern))!,
    );
  }

  return and(...filters)!;
}

function ordering(options: ListOptions) {
  const direction = options.order === 'asc' ? asc : desc;

  if (options.sort === 'name') {
    return [
      direction(sql`lower(${habits.name})`),
      direction(habits.createdAt),
      direction(habits.id),
    ];
  }

  if (options.sort === 'createdAt') {
    return [direction(habits.createdAt), direction(habits.id)];
  }

  if (options.sort === 'updatedAt') {
    return [direction(habits.updatedAt), direction(habits.id)];
  }

  return [
    direction(habits.position),
    direction(habits.createdAt),
    direction(habits.id),
  ];
}

function projection(date: string, isoWeekday: number) {
  return {
    id: habits.id,
    name: habits.name,
    description: habits.description,
    frequencyType: habits.frequencyType,
    targetCount: habits.targetCount,
    isActive: habits.isActive,
    startDate: habits.startDate,
    endDate: habits.endDate,
    position: habits.position,
    createdAt: habits.createdAt,
    updatedAt: habits.updatedAt,
    completedCount: sql<number>`coalesce(${habitCheckIns.completedCount}, 0)`,
    isScheduled: sql<boolean>`${scheduledCondition(date, isoWeekday)}`,
    weekdays: sql<number[]>`coalesce((
      select array_agg(${habitSchedules.dayOfWeek} order by ${habitSchedules.dayOfWeek})
      from ${habitSchedules}
      where ${habitSchedules.habitId} = ${habits.id}
    ), array[]::integer[])`,
    categoryId: categories.id,
    categoryName: categories.name,
    categoryColor: categories.color,
    categoryIcon: categories.icon,
  };
}

type ProjectedRow = Awaited<
  ReturnType<ReturnType<typeof createHabitRepository>['findById']>
>;

function mapRow(row: NonNullable<ProjectedRow>, date: string): HabitListItem {
  const completedCount = Number(row.completedCount);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    frequencyType: row.frequencyType,
    targetCount: row.targetCount,
    isActive: row.isActive,
    startDate: row.startDate,
    endDate: row.endDate,
    position: row.position,
    category: row.categoryId
      ? {
          id: row.categoryId,
          name: row.categoryName ?? '',
          color: row.categoryColor,
          icon: row.categoryIcon,
        }
      : null,
    schedule: { weekdays: row.weekdays.map(Number) },
    selectedDate: {
      date,
      isScheduled: Boolean(row.isScheduled),
      completedCount,
      isCompleted: completedCount >= row.targetCount,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createHabitRepository(database: Database) {
  return {
    async list(options: ListOptions) {
      const filter = collectionFilter(options);
      const [rows, countRows] = await Promise.all([
        database
          .select(projection(options.date, options.isoWeekday))
          .from(habits)
          .leftJoin(
            habitCheckIns,
            and(
              eq(habitCheckIns.habitId, habits.id),
              eq(habitCheckIns.userId, options.userId),
              eq(habitCheckIns.checkInDate, options.date),
            ),
          )
          .leftJoin(
            categories,
            and(
              eq(categories.id, habits.categoryId),
              eq(categories.userId, options.userId),
              isNull(categories.deletedAt),
            ),
          )
          .where(filter)
          .orderBy(...ordering(options))
          .limit(options.limit)
          .offset((options.page - 1) * options.limit),
        database
          .select({ count: sql<number>`count(*)::integer` })
          .from(habits)
          .where(filter),
      ]);

      return {
        items: rows.map((row) => mapRow(row, options.date)),
        totalItems: Number(countRows[0]?.count ?? 0),
      };
    },

    async findById(
      userId: string,
      id: string,
      date: string,
      isoWeekday: number,
    ) {
      const [row] = await database
        .select(projection(date, isoWeekday))
        .from(habits)
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
            eq(habits.id, id),
            eq(habits.userId, userId),
            isNull(habits.deletedAt),
          ),
        )
        .limit(1);

      return row ?? null;
    },

    async listScheduledForDate(
      userId: string,
      date: string,
      isoWeekday: number,
    ): Promise<TodayHabit[]> {
      const result = await this.list({
        userId,
        date,
        isoWeekday,
        view: 'today',
        search: '',
        sort: 'position',
        order: 'asc',
        page: 1,
        limit: 100,
      });

      return result.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        frequencyType: item.frequencyType,
        targetCount: item.targetCount,
        completedCount: item.selectedDate.completedCount,
        isCompleted: item.selectedDate.isCompleted,
        position: item.position,
        category: item.category,
      }));
    },
  };
}

export type HabitRepository = ReturnType<typeof createHabitRepository>;
