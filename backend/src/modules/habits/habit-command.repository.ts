import { and, asc, eq, isNull } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import {
  categories,
  habitCheckIns,
  habitSchedules,
  habits,
} from '../../db/schema/index.js';
import type { CreateHabitInput, UpdateHabitInput } from './habit.types.js';

function commandProjection() {
  return {
    id: habits.id,
    name: habits.name,
    description: habits.description,
    categoryId: habits.categoryId,
    frequencyType: habits.frequencyType,
    targetCount: habits.targetCount,
    startDate: habits.startDate,
    endDate: habits.endDate,
    isActive: habits.isActive,
  };
}

export function createHabitCommandRepository(database: Database) {
  return {
    async categoryExists(userId: string, categoryId: string) {
      const [row] = await database
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, categoryId),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .limit(1);
      return Boolean(row);
    },

    async findOwned(userId: string, id: string) {
      const [row] = await database
        .select(commandProjection())
        .from(habits)
        .where(
          and(
            eq(habits.id, id),
            eq(habits.userId, userId),
            isNull(habits.deletedAt),
          ),
        )
        .limit(1);
      if (!row) return null;
      const schedule = await database
        .select({ dayOfWeek: habitSchedules.dayOfWeek })
        .from(habitSchedules)
        .where(eq(habitSchedules.habitId, id))
        .orderBy(asc(habitSchedules.dayOfWeek));
      return { ...row, weekdays: schedule.map(({ dayOfWeek }) => dayOfWeek) };
    },

    async createAtomic(
      userId: string,
      input: Required<
        Pick<
          CreateHabitInput,
          | 'name'
          | 'frequencyType'
          | 'targetCount'
          | 'startDate'
          | 'isActive'
          | 'weekdays'
        >
      > &
        Pick<CreateHabitInput, 'description' | 'categoryId' | 'endDate'>,
    ) {
      return database.transaction(async (transaction) => {
        const inputWeekdays = input.weekdays ?? [];
        const [created] = await transaction
          .insert(habits)
          .values({
            userId,
            name: input.name,
            description: input.description ?? null,
            categoryId: input.categoryId ?? null,
            frequencyType: input.frequencyType,
            targetCount: input.targetCount,
            startDate: input.startDate,
            endDate: input.endDate ?? null,
            isActive: input.isActive,
          })
          .returning(commandProjection());

        if (!created) throw new Error('Habit insert did not return a row.');
        if (inputWeekdays.length > 0) {
          await transaction.insert(habitSchedules).values(
            inputWeekdays.map((dayOfWeek) => ({
              habitId: created.id,
              dayOfWeek,
            })),
          );
        }

        return { ...created, weekdays: inputWeekdays };
      });
    },

    async updateAtomic(
      userId: string,
      id: string,
      changes: UpdateHabitInput,
      schedule: number[] | undefined,
    ) {
      return database.transaction(async (transaction) => {
        const habitChanges = { ...changes };
        delete habitChanges.weekdays;
        const [updated] = await transaction
          .update(habits)
          .set(habitChanges)
          .where(
            and(
              eq(habits.id, id),
              eq(habits.userId, userId),
              isNull(habits.deletedAt),
            ),
          )
          .returning({ id: habits.id });

        if (!updated) return null;
        if (schedule) {
          await transaction
            .delete(habitSchedules)
            .where(eq(habitSchedules.habitId, id));
          if (schedule.length > 0) {
            await transaction
              .insert(habitSchedules)
              .values(
                schedule.map((dayOfWeek) => ({ habitId: id, dayOfWeek })),
              );
          }
        }

        const [result] = await transaction
          .select(commandProjection())
          .from(habits)
          .where(
            and(
              eq(habits.id, updated.id),
              eq(habits.userId, userId),
              isNull(habits.deletedAt),
            ),
          )
          .limit(1);

        if (!result) throw new Error('Updated habit could not be reloaded.');
        const persistedSchedule = await transaction
          .select({ dayOfWeek: habitSchedules.dayOfWeek })
          .from(habitSchedules)
          .where(eq(habitSchedules.habitId, id))
          .orderBy(asc(habitSchedules.dayOfWeek));
        return {
          ...result,
          weekdays: persistedSchedule.map(({ dayOfWeek }) => dayOfWeek),
        };
      });
    },

    async softDelete(userId: string, id: string) {
      const [deleted] = await database
        .update(habits)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(habits.id, id),
            eq(habits.userId, userId),
            isNull(habits.deletedAt),
          ),
        )
        .returning({ id: habits.id });
      return deleted ?? null;
    },

    async setActive(
      userId: string,
      id: string,
      currentState: boolean,
      nextState: boolean,
    ) {
      const [updated] = await database
        .update(habits)
        .set({ isActive: nextState })
        .where(
          and(
            eq(habits.id, id),
            eq(habits.userId, userId),
            isNull(habits.deletedAt),
            eq(habits.isActive, currentState),
          ),
        )
        .returning({ id: habits.id, isActive: habits.isActive });
      return updated ?? null;
    },

    async setCheckIn(
      userId: string,
      habitId: string,
      date: string,
      completedCount: number,
    ) {
      if (completedCount === 0) {
        await database
          .delete(habitCheckIns)
          .where(
            and(
              eq(habitCheckIns.habitId, habitId),
              eq(habitCheckIns.userId, userId),
              eq(habitCheckIns.checkInDate, date),
            ),
          );
        return;
      }

      await database
        .insert(habitCheckIns)
        .values({
          userId,
          habitId,
          checkInDate: date,
          completedCount,
        })
        .onConflictDoUpdate({
          target: [habitCheckIns.habitId, habitCheckIns.checkInDate],
          set: { completedCount, updatedAt: new Date() },
        });
    },
  };
}

export type HabitCommandRepository = ReturnType<
  typeof createHabitCommandRepository
>;
