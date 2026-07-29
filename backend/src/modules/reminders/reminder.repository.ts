import { and, asc, eq, isNull, ne } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { habits, reminders } from '../../db/schema/index.js';

export class DuplicateReminderError extends Error {
  constructor() {
    super('An active reminder already exists at this time.');
    this.name = 'DuplicateReminderError';
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === '23505') return true;
  return 'cause' in error && isUniqueViolation(error.cause);
}

const projection = {
  id: reminders.id,
  habitId: reminders.habitId,
  timeOfDay: reminders.timeOfDay,
  isEnabled: reminders.isEnabled,
  createdAt: reminders.createdAt,
  updatedAt: reminders.updatedAt,
};

export function createReminderRepository(database: Database) {
  return {
    async habitExists(userId: string, habitId: string) {
      const [habit] = await database
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
      return Boolean(habit);
    },

    async list(userId: string, habitId: string) {
      return database
        .select(projection)
        .from(reminders)
        .where(
          and(
            eq(reminders.userId, userId),
            eq(reminders.habitId, habitId),
            isNull(reminders.deletedAt),
          ),
        )
        .orderBy(asc(reminders.timeOfDay), asc(reminders.id));
    },

    async find(userId: string, habitId: string, reminderId: string) {
      const [reminder] = await database
        .select(projection)
        .from(reminders)
        .where(
          and(
            eq(reminders.id, reminderId),
            eq(reminders.userId, userId),
            eq(reminders.habitId, habitId),
            isNull(reminders.deletedAt),
          ),
        )
        .limit(1);
      return reminder ?? null;
    },

    async duplicateExists(
      userId: string,
      habitId: string,
      timeOfDay: string,
      exceptId?: string,
    ) {
      const [duplicate] = await database
        .select({ id: reminders.id })
        .from(reminders)
        .where(
          and(
            eq(reminders.userId, userId),
            eq(reminders.habitId, habitId),
            eq(reminders.timeOfDay, timeOfDay),
            isNull(reminders.deletedAt),
            exceptId ? ne(reminders.id, exceptId) : undefined,
          ),
        )
        .limit(1);
      return Boolean(duplicate);
    },

    async create(
      userId: string,
      habitId: string,
      input: { timeOfDay: string; isEnabled: boolean },
    ) {
      try {
        const [created] = await database
          .insert(reminders)
          .values({ userId, habitId, ...input })
          .returning(projection);
        if (!created) throw new Error('Reminder insert did not return a row.');
        return created;
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateReminderError();
        throw error;
      }
    },

    async update(
      userId: string,
      habitId: string,
      reminderId: string,
      changes: { timeOfDay?: string; isEnabled?: boolean },
    ) {
      try {
        const [updated] = await database
          .update(reminders)
          .set({ ...changes, updatedAt: new Date() })
          .where(
            and(
              eq(reminders.id, reminderId),
              eq(reminders.userId, userId),
              eq(reminders.habitId, habitId),
              isNull(reminders.deletedAt),
            ),
          )
          .returning(projection);
        return updated ?? null;
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateReminderError();
        throw error;
      }
    },

    async softDelete(userId: string, habitId: string, reminderId: string) {
      const [deleted] = await database
        .update(reminders)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(reminders.id, reminderId),
            eq(reminders.userId, userId),
            eq(reminders.habitId, habitId),
            isNull(reminders.deletedAt),
          ),
        )
        .returning({ id: reminders.id });
      return deleted ?? null;
    },
  };
}

export type ReminderRepository = ReturnType<typeof createReminderRepository>;
