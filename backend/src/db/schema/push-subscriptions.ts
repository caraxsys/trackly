import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import {
  auditTimestamps,
  primaryId,
  softDeleteTimestamp,
  userIdColumn,
} from './shared.js';

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: primaryId(),
    userId: userIdColumn(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    lastSuccessAt: timestamp('last_success_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lastFailureAt: timestamp('last_failure_at', {
      withTimezone: true,
      mode: 'date',
    }),
    failureCount: integer('failure_count').default(0).notNull(),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    check(
      'push_subscriptions_failure_count_non_negative_check',
      sql`${table.failureCount} >= 0`,
    ),
    uniqueIndex('push_subscriptions_active_endpoint_uidx')
      .on(table.endpoint)
      .where(sql`${table.deletedAt} is null`),
    index('push_subscriptions_user_id_idx').on(table.userId),
    index('push_subscriptions_enabled_active_idx')
      .on(table.userId, table.isEnabled)
      .where(sql`${table.deletedAt} is null`),
    index('push_subscriptions_endpoint_idx').on(table.endpoint),
  ],
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
