import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import {
  habitSchedules,
  habits,
  reminders,
  userPreferences,
} from '../../db/schema/index.js';

export function createReminderSchedulingRepository(database: Database) {
  return {
    async listStoredTimezones() {
      const rows = await database
        .selectDistinct({ timezone: userPreferences.timezone })
        .from(userPreferences)
        .orderBy(asc(userPreferences.timezone));
      return rows.map(({ timezone }) => timezone);
    },

    async findCandidates(localTimes: string[]) {
      if (localTimes.length === 0) return [];
      return database
        .select({
          reminderId: reminders.id,
          userId: reminders.userId,
          habitId: reminders.habitId,
          timeOfDay: reminders.timeOfDay,
          reminderIsEnabled: reminders.isEnabled,
          reminderDeletedAt: reminders.deletedAt,
          habitIsActive: habits.isActive,
          habitDeletedAt: habits.deletedAt,
          habitFrequencyType: habits.frequencyType,
          habitStartDate: habits.startDate,
          habitEndDate: habits.endDate,
          storedTimezone: userPreferences.timezone,
          weekdays: sql<number[]>`coalesce((
            select array_agg(${habitSchedules.dayOfWeek} order by ${habitSchedules.dayOfWeek})
            from ${habitSchedules}
            where ${habitSchedules.habitId} = ${habits.id}
          ), array[]::integer[])`,
        })
        .from(reminders)
        .innerJoin(
          habits,
          and(
            eq(habits.id, reminders.habitId),
            eq(habits.userId, reminders.userId),
          ),
        )
        .leftJoin(userPreferences, eq(userPreferences.userId, reminders.userId))
        .where(
          and(
            eq(reminders.isEnabled, true),
            isNull(reminders.deletedAt),
            eq(habits.isActive, true),
            isNull(habits.deletedAt),
            inArray(reminders.timeOfDay, localTimes),
          ),
        )
        .orderBy(
          asc(reminders.userId),
          asc(reminders.habitId),
          asc(reminders.timeOfDay),
          asc(reminders.id),
        );
    },
  };
}

export type ReminderSchedulingRepository = ReturnType<
  typeof createReminderSchedulingRepository
>;
