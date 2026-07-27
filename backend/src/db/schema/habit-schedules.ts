import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { habits } from './habits.js';
import { primaryId } from './shared.js';

export const habitSchedules = pgTable(
  'habit_schedules',
  {
    id: primaryId(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'habit_schedules_day_of_week_check',
      sql`${table.dayOfWeek} between 1 and 7`,
    ),
    uniqueIndex('habit_schedules_habit_id_day_of_week_uidx').on(
      table.habitId,
      table.dayOfWeek,
    ),
    index('habit_schedules_habit_id_idx').on(table.habitId),
  ],
);

export type HabitSchedule = typeof habitSchedules.$inferSelect;
export type NewHabitSchedule = typeof habitSchedules.$inferInsert;
