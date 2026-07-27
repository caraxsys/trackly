import { AppError } from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { getIsoWeekday } from '../../lib/date/calendar-date.js';
import {
  getLocalCalendarDate,
  resolveTimezone,
} from '../../lib/date/timezone.js';
import type { PreferenceRepository } from '../preferences/preference.repository.js';
import type { HabitRepository } from './habit.repository.js';
import type {
  HabitCollectionData,
  HabitCollectionQuery,
  HabitDetail,
} from './habit.types.js';

interface Dependencies {
  habitRepository: HabitRepository;
  preferenceRepository: PreferenceRepository;
}

interface RequestContext {
  now?: Date;
  onTimezoneFallback?: () => void;
  userId: string;
}

async function resolveDateContext(
  dependencies: Dependencies,
  context: RequestContext,
  explicitDate?: string,
) {
  const storedTimezone = await dependencies.preferenceRepository.findTimezone(
    context.userId,
  );
  const timezone = resolveTimezone(storedTimezone);

  if (storedTimezone !== null && timezone !== storedTimezone) {
    context.onTimezoneFallback?.();
  }

  return {
    timezone,
    date:
      explicitDate ?? getLocalCalendarDate(context.now ?? new Date(), timezone),
  };
}

export function createHabitService(dependencies: Dependencies) {
  return {
    async list(
      context: RequestContext,
      query: Omit<HabitCollectionQuery, 'date'> & {
        date?: string | undefined;
      },
    ): Promise<HabitCollectionData> {
      const { date, timezone } = await resolveDateContext(
        dependencies,
        context,
        query.date,
      );
      const resolvedQuery: HabitCollectionQuery = {
        ...query,
        date,
        search: query.search.trim(),
      };
      const result = await dependencies.habitRepository.list({
        ...resolvedQuery,
        userId: context.userId,
        isoWeekday: getIsoWeekday(date),
      });
      const totalPages = Math.ceil(result.totalItems / query.limit);

      return {
        items: result.items,
        pagination: {
          page: query.page,
          limit: query.limit,
          totalItems: result.totalItems,
          totalPages,
          hasPreviousPage: query.page > 1,
          hasNextPage: query.page < totalPages,
        },
        query: {
          view: query.view,
          date,
          timezone,
          search: resolvedQuery.search,
          sort: query.sort,
          order: query.order,
        },
      };
    },

    async detail(context: RequestContext, id: string): Promise<HabitDetail> {
      const { date, timezone } = await resolveDateContext(
        dependencies,
        context,
      );
      const row = await dependencies.habitRepository.findById(
        context.userId,
        id,
        date,
        getIsoWeekday(date),
      );

      if (!row) {
        throw new AppError({
          statusCode: 404,
          code: ErrorCode.NotFound,
          message: 'Habit was not found.',
        });
      }

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
        today: {
          date,
          isScheduled: Boolean(row.isScheduled),
          completedCount,
          isCompleted: completedCount >= row.targetCount,
        },
        timezone,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    },
  };
}

export type HabitService = ReturnType<typeof createHabitService>;
