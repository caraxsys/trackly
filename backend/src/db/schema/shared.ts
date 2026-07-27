import { text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { user } from './auth.js';

export type UserId = string;

export function primaryId() {
  return uuid('id').defaultRandom().primaryKey();
}

export function userIdColumn() {
  return text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' });
}

export function auditTimestamps() {
  return {
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

export function softDeleteTimestamp() {
  return timestamp('deleted_at', {
    withTimezone: true,
    mode: 'date',
  });
}
