import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { categories } from './categories.js';
import { priority, taskStatus } from './enums.js';
import {
  auditTimestamps,
  primaryId,
  softDeleteTimestamp,
  userIdColumn,
} from './shared.js';

export const tasks = pgTable(
  'tasks',
  {
    id: primaryId(),
    userId: userIdColumn(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    status: taskStatus('status').default('todo').notNull(),
    priority: priority('priority').default('medium').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    position: integer('position').default(0).notNull(),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    check('tasks_position_non_negative_check', sql`${table.position} >= 0`),
    index('tasks_user_id_status_idx').on(table.userId, table.status),
    index('tasks_user_id_due_at_idx').on(table.userId, table.dueAt),
    index('tasks_category_id_idx').on(table.categoryId),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
