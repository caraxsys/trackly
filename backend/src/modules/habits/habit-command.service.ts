import { AppError } from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { getIsoWeekday } from '../../lib/date/calendar-date.js';
import {
  getLocalCalendarDate,
  resolveTimezone,
} from '../../lib/date/timezone.js';
import type { PreferenceRepository } from '../preferences/preference.repository.js';
import type { HabitCommandRepository } from './habit-command.repository.js';
import type {
  HabitCheckInInput,
  HabitCheckInResult,
  CreateHabitInput,
  HabitCommandResult,
  HabitFrequency,
  UpdateHabitInput,
} from './habit.types.js';

interface CheckInContext {
  now?: Date;
  onTimezoneFallback?: () => void;
  userId: string;
}

function notFound(message = 'Habit was not found.') {
  return new AppError({
    statusCode: 404,
    code: ErrorCode.NotFound,
    message,
  });
}

function conflict(message: string) {
  return new AppError({
    statusCode: 409,
    code: ErrorCode.Conflict,
    message,
  });
}

function invalid(message: string, details?: unknown) {
  return new AppError({
    statusCode: 400,
    code: ErrorCode.ValidationError,
    message,
    ...(details === undefined ? {} : { details }),
  });
}

function normalizeWeekdays(frequencyType: HabitFrequency, weekdays: number[]) {
  if (frequencyType === 'daily') return [];
  if (weekdays.length === 0) {
    throw invalid('At least one weekday is required.');
  }
  if (
    weekdays.some(
      (weekday) => !Number.isInteger(weekday) || weekday < 1 || weekday > 7,
    )
  ) {
    throw invalid('Weekdays must be integers from 1 through 7.');
  }
  if (new Set(weekdays).size !== weekdays.length) {
    throw invalid('Weekdays must not contain duplicates.');
  }
  return [...weekdays].sort((left, right) => left - right);
}

function validateDateRange(startDate: string, endDate: string | null) {
  if (endDate && endDate < startDate) {
    throw invalid('endDate must be on or after startDate.');
  }
}

function mapResult(row: {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  frequencyType: HabitFrequency;
  targetCount: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  weekdays: number[];
}): HabitCommandResult {
  return {
    ...row,
    weekdays: row.weekdays.map(Number).sort((left, right) => left - right),
  };
}

async function validateCategory(
  repository: HabitCommandRepository,
  userId: string,
  categoryId: string | null | undefined,
) {
  if (categoryId && !(await repository.categoryExists(userId, categoryId))) {
    throw notFound('Category was not found.');
  }
}

export function createHabitCommandService(
  repository: HabitCommandRepository,
  preferenceRepository: PreferenceRepository,
) {
  async function transition(
    userId: string,
    id: string,
    currentState: boolean,
    nextState: boolean,
    alreadyMessage: string,
    changedMessage: string,
  ) {
    const current = await repository.findOwned(userId, id);
    if (!current) throw notFound();
    if (current.isActive === nextState) throw conflict(alreadyMessage);
    const updated = await repository.setActive(
      userId,
      id,
      currentState,
      nextState,
    );
    if (!updated) throw conflict(changedMessage);
    return updated;
  }

  return {
    async create(
      userId: string,
      input: CreateHabitInput,
    ): Promise<HabitCommandResult> {
      const name = input.name.trim();
      if (!name) throw invalid('Habit name is required.');
      if ((input.targetCount ?? 1) < 1) {
        throw invalid('targetCount must be at least 1.');
      }
      validateDateRange(input.startDate, input.endDate ?? null);
      await validateCategory(repository, userId, input.categoryId);
      const weekdays = normalizeWeekdays(
        input.frequencyType,
        input.weekdays ?? [],
      );

      const created = await repository.createAtomic(userId, {
        name,
        description: input.description?.trim() || null,
        categoryId: input.categoryId ?? null,
        frequencyType: input.frequencyType,
        targetCount: input.targetCount ?? 1,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        isActive: input.isActive ?? true,
        weekdays,
      });
      return mapResult(created);
    },

    async update(
      userId: string,
      id: string,
      input: UpdateHabitInput,
    ): Promise<HabitCommandResult> {
      const current = await repository.findOwned(userId, id);
      if (!current) throw notFound();
      await validateCategory(repository, userId, input.categoryId);

      const name = input.name === undefined ? undefined : input.name.trim();
      if (name === '') throw invalid('Habit name is required.');
      if (input.targetCount !== undefined && input.targetCount < 1) {
        throw invalid('targetCount must be at least 1.');
      }

      const frequencyType = input.frequencyType ?? current.frequencyType;
      const startDate = input.startDate ?? current.startDate;
      const endDate =
        input.endDate === undefined ? current.endDate : input.endDate;
      validateDateRange(startDate, endDate);

      let schedule: number[] | undefined;
      if (input.weekdays !== undefined || input.frequencyType !== undefined) {
        const candidate =
          input.weekdays ??
          (frequencyType === current.frequencyType
            ? current.weekdays.map(Number)
            : []);
        schedule = normalizeWeekdays(frequencyType, candidate);
      }

      const updated = await repository.updateAtomic(
        userId,
        id,
        {
          ...input,
          ...(name === undefined ? {} : { name }),
          ...(input.description === undefined
            ? {}
            : { description: input.description?.trim() || null }),
          ...(schedule === undefined ? {} : { weekdays: schedule }),
        },
        schedule,
      );
      if (!updated) throw notFound();
      return mapResult(updated);
    },

    async softDelete(userId: string, id: string) {
      const deleted = await repository.softDelete(userId, id);
      if (!deleted) throw notFound();
      return { id: deleted.id, deleted: true as const };
    },

    async activate(userId: string, id: string) {
      return transition(
        userId,
        id,
        false,
        true,
        'Habit is already active.',
        'Habit state changed before activation.',
      );
    },

    async deactivate(userId: string, id: string) {
      return transition(
        userId,
        id,
        true,
        false,
        'Habit is already inactive.',
        'Habit state changed before deactivation.',
      );
    },

    async archive(userId: string, id: string) {
      return transition(
        userId,
        id,
        true,
        false,
        'Habit is already archived.',
        'Habit state changed before archival.',
      );
    },

    async restore(userId: string, id: string) {
      return transition(
        userId,
        id,
        false,
        true,
        'Habit is already active.',
        'Habit state changed before restoration.',
      );
    },

    async checkIn(
      context: CheckInContext,
      id: string,
      input: HabitCheckInInput,
    ): Promise<HabitCheckInResult> {
      const current = await repository.findOwned(context.userId, id);
      if (!current) throw notFound();
      if (!current.isActive) {
        throw conflict('Archived habits cannot be checked in.');
      }

      const storedTimezone = await preferenceRepository.findTimezone(
        context.userId,
      );
      const timezone = resolveTimezone(storedTimezone);
      if (storedTimezone !== null && timezone !== storedTimezone) {
        context.onTimezoneFallback?.();
      }
      const date =
        input.date ?? getLocalCalendarDate(context.now ?? new Date(), timezone);
      const isInDateRange =
        date >= current.startDate &&
        (current.endDate === null || date <= current.endDate);
      const isScheduledWeekday =
        current.frequencyType === 'daily' ||
        current.weekdays.map(Number).includes(getIsoWeekday(date));
      if (!isInDateRange || !isScheduledWeekday) {
        throw conflict('Habit is not scheduled for the requested date.');
      }
      if (
        !Number.isInteger(input.completedCount) ||
        input.completedCount < 0 ||
        input.completedCount > current.targetCount
      ) {
        throw invalid(
          `completedCount must be an integer from 0 through ${current.targetCount}.`,
        );
      }

      await repository.setCheckIn(
        context.userId,
        id,
        date,
        input.completedCount,
      );
      return {
        habitId: id,
        date,
        completedCount: input.completedCount,
        targetCount: current.targetCount,
        isCompleted: input.completedCount >= current.targetCount,
      };
    },
  };
}

export type HabitCommandService = ReturnType<typeof createHabitCommandService>;
