import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { auditTimestamps, primaryId, userIdColumn } from './shared.js';

export const userPreferences = pgTable(
  'user_preferences',
  {
    id: primaryId(),
    userId: userIdColumn(),
    timezone: varchar('timezone', { length: 64 }).default('UTC').notNull(),
    weekStartsOn: integer('week_starts_on').default(1).notNull(),
    dateFormat: varchar('date_format', { length: 32 })
      .default('YYYY-MM-DD')
      .notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    check(
      'user_preferences_week_starts_on_check',
      sql`${table.weekStartsOn} between 1 and 7`,
    ),
    uniqueIndex('user_preferences_user_id_uidx').on(table.userId),
  ],
);

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
