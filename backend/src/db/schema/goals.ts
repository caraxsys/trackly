import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { categories } from './categories.js';
import { goalStatus } from './enums.js';
import {
  auditTimestamps,
  primaryId,
  softDeleteTimestamp,
  userIdColumn,
} from './shared.js';

export const goals = pgTable(
  'goals',
  {
    id: primaryId(),
    userId: userIdColumn(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    status: goalStatus('status').default('active').notNull(),
    startDate: date('start_date', { mode: 'string' }),
    targetDate: date('target_date', { mode: 'string' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    coverImageUrl: varchar('cover_image_url', { length: 2048 }),
    position: integer('position').default(0).notNull(),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    check('goals_position_non_negative_check', sql`${table.position} >= 0`),
    check(
      'goals_date_range_check',
      sql`${table.startDate} is null or ${table.targetDate} is null or ${table.targetDate} >= ${table.startDate}`,
    ),
    index('goals_user_id_status_idx').on(table.userId, table.status),
    index('goals_target_date_idx').on(table.targetDate),
    index('goals_category_id_idx').on(table.categoryId),
  ],
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
