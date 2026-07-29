import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  time,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { reminders } from './reminders.js';
import {
  notificationDeliveryStatus,
  notificationProviderName,
} from './enums.js';
import { auditTimestamps, primaryId, userIdColumn } from './shared.js';

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: primaryId(),
    userId: userIdColumn(),
    reminderId: uuid('reminder_id')
      .notNull()
      .references(() => reminders.id, { onDelete: 'restrict' }),
    occurrenceKey: text('occurrence_key').notNull(),
    scheduledLocalDate: date('scheduled_local_date', {
      mode: 'string',
    }).notNull(),
    scheduledLocalTime: time('scheduled_local_time', {
      precision: 0,
    }).notNull(),
    timezone: text('timezone').notNull(),
    provider: notificationProviderName('provider').default('noop').notNull(),
    status: notificationDeliveryStatus('status').default('pending').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    ...auditTimestamps(),
  },
  (table) => [
    check(
      'notification_deliveries_attempt_count_non_negative_check',
      sql`${table.attemptCount} >= 0`,
    ),
    uniqueIndex('notification_deliveries_occurrence_key_uidx').on(
      table.occurrenceKey,
    ),
    index('notification_deliveries_reminder_id_idx').on(table.reminderId),
    index('notification_deliveries_user_id_idx').on(table.userId),
    index('notification_deliveries_status_idx').on(table.status),
  ],
);

export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery =
  typeof notificationDeliveries.$inferInsert;
