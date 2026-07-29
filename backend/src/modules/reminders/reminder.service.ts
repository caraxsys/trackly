import { AppError } from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { resolveTimezone } from '../../lib/date/timezone.js';
import type { PreferenceRepository } from '../preferences/preference.repository.js';
import {
  DuplicateReminderError,
  type ReminderRepository,
} from './reminder.repository.js';
import type {
  ReminderCreateBody,
  ReminderUpdateBody,
} from './reminder.schema.js';
import type { ReminderItem } from './reminder.types.js';

const inaccessible = () =>
  new AppError({
    statusCode: 404,
    code: ErrorCode.NotFound,
    message: 'Habit or reminder was not found.',
  });

const duplicate = () =>
  new AppError({
    statusCode: 409,
    code: ErrorCode.Conflict,
    message: 'A reminder already exists at this time.',
  });

function toItem(
  value: Awaited<ReturnType<ReminderRepository['create']>>,
): ReminderItem {
  return {
    ...value,
    timeOfDay: value.timeOfDay.slice(0, 5),
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

async function mapDuplicate<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DuplicateReminderError) throw duplicate();
    throw error;
  }
}

export function createReminderService(
  repository: ReminderRepository,
  preferenceRepository: PreferenceRepository,
) {
  async function requireHabit(userId: string, habitId: string) {
    if (!(await repository.habitExists(userId, habitId))) throw inaccessible();
  }

  return {
    async list(userId: string, habitId: string) {
      await requireHabit(userId, habitId);
      const [timezone, items] = await Promise.all([
        preferenceRepository.findTimezone(userId),
        repository.list(userId, habitId),
      ]);
      return {
        timezone: resolveTimezone(timezone),
        items: items.map(toItem),
      };
    },

    async create(userId: string, habitId: string, input: ReminderCreateBody) {
      await requireHabit(userId, habitId);
      if (await repository.duplicateExists(userId, habitId, input.timeOfDay)) {
        throw duplicate();
      }
      return toItem(
        await mapDuplicate(() => repository.create(userId, habitId, input)),
      );
    },

    async update(
      userId: string,
      habitId: string,
      reminderId: string,
      input: ReminderUpdateBody,
    ) {
      await requireHabit(userId, habitId);
      const current = await repository.find(userId, habitId, reminderId);
      if (!current) throw inaccessible();
      if (
        input.timeOfDay &&
        (await repository.duplicateExists(
          userId,
          habitId,
          input.timeOfDay,
          reminderId,
        ))
      ) {
        throw duplicate();
      }
      const changes = {
        ...(input.timeOfDay === undefined
          ? {}
          : { timeOfDay: input.timeOfDay }),
        ...(input.isEnabled === undefined
          ? {}
          : { isEnabled: input.isEnabled }),
      };
      const updated = await mapDuplicate(() =>
        repository.update(userId, habitId, reminderId, changes),
      );
      if (!updated) throw inaccessible();
      return toItem(updated);
    },

    async softDelete(userId: string, habitId: string, reminderId: string) {
      await requireHabit(userId, habitId);
      const deleted = await repository.softDelete(userId, habitId, reminderId);
      if (!deleted) throw inaccessible();
      return { id: deleted.id, deleted: true as const };
    },
  };
}

export type ReminderService = ReturnType<typeof createReminderService>;
