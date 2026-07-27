import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { habits } from './habits.js';
import { auditTimestamps, primaryId, userIdColumn } from './shared.js';

export const habitCheckIns = pgTable(
  'habit_check_ins',
  {
    id: primaryId(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: userIdColumn(),
    checkInDate: date('check_in_date', { mode: 'string' }).notNull(),
    completedCount: integer('completed_count').default(0).notNull(),
    note: text('note'),
    ...auditTimestamps(),
  },
  (table) => [
    check(
      'habit_check_ins_completed_count_non_negative_check',
      sql`${table.completedCount} >= 0`,
    ),
    uniqueIndex('habit_check_ins_habit_id_check_in_date_uidx').on(
      table.habitId,
      table.checkInDate,
    ),
    index('habit_check_ins_user_id_check_in_date_idx').on(
      table.userId,
      table.checkInDate,
    ),
    index('habit_check_ins_habit_id_check_in_date_idx').on(
      table.habitId,
      table.checkInDate,
    ),
  ],
);

export type HabitCheckIn = typeof habitCheckIns.$inferSelect;
export type NewHabitCheckIn = typeof habitCheckIns.$inferInsert;
