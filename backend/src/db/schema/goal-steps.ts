import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
} from 'drizzle-orm/pg-core';

import { goals } from './goals.js';
import { auditTimestamps, primaryId } from './shared.js';

export const goalSteps = pgTable(
  'goal_steps',
  {
    id: primaryId(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    isCompleted: boolean('is_completed').default(false).notNull(),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    position: integer('position').default(0).notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    check(
      'goal_steps_position_non_negative_check',
      sql`${table.position} >= 0`,
    ),
    index('goal_steps_goal_id_position_idx').on(table.goalId, table.position),
  ],
);

export type GoalStep = typeof goalSteps.$inferSelect;
export type NewGoalStep = typeof goalSteps.$inferInsert;
