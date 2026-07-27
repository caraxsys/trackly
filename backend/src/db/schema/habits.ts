import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { categories } from './categories.js';
import { habitFrequencyType } from './enums.js';
import {
  auditTimestamps,
  primaryId,
  softDeleteTimestamp,
  userIdColumn,
} from './shared.js';

export const habits = pgTable(
  'habits',
  {
    id: primaryId(),
    userId: userIdColumn(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    frequencyType: habitFrequencyType('frequency_type').notNull(),
    targetCount: integer('target_count').default(1).notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    isActive: boolean('is_active').default(true).notNull(),
    position: integer('position').default(0).notNull(),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    check('habits_target_count_positive_check', sql`${table.targetCount} > 0`),
    check('habits_position_non_negative_check', sql`${table.position} >= 0`),
    check(
      'habits_date_range_check',
      sql`${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
    index('habits_user_id_active_idx')
      .on(table.userId, table.isActive)
      .where(sql`${table.deletedAt} is null`),
    index('habits_category_id_idx').on(table.categoryId),
  ],
);

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
