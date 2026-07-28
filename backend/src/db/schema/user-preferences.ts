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
      .default('yyyy-MM-dd')
      .notNull(),
    timeFormat: varchar('time_format', { length: 8 }).default('24h').notNull(),
    theme: varchar('theme', { length: 8 }).default('system').notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    check(
      'user_preferences_week_starts_on_check',
      sql`${table.weekStartsOn} in (1, 7)`,
    ),
    check(
      'user_preferences_date_format_check',
      sql`${table.dateFormat} in ('dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd')`,
    ),
    check(
      'user_preferences_time_format_check',
      sql`${table.timeFormat} in ('12h', '24h')`,
    ),
    check(
      'user_preferences_theme_check',
      sql`${table.theme} in ('system', 'light', 'dark')`,
    ),
    uniqueIndex('user_preferences_user_id_uidx').on(table.userId),
  ],
);

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
