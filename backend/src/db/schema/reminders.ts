import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  time,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { habits } from './habits.js';
import {
  auditTimestamps,
  primaryId,
  softDeleteTimestamp,
  userIdColumn,
} from './shared.js';

export const reminders = pgTable(
  'reminders',
  {
    id: primaryId(),
    userId: userIdColumn(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    timeOfDay: time('time_of_day', { precision: 0 }).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    uniqueIndex('reminders_user_habit_time_active_uidx')
      .on(table.userId, table.habitId, table.timeOfDay)
      .where(sql`${table.deletedAt} is null`),
    index('reminders_user_id_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
    index('reminders_habit_id_enabled_idx')
      .on(table.habitId, table.isEnabled)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
