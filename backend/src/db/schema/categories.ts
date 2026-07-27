import { sql } from 'drizzle-orm';
import { index, pgTable, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import {
  auditTimestamps,
  primaryId,
  softDeleteTimestamp,
  userIdColumn,
} from './shared.js';

export const categories = pgTable(
  'categories',
  {
    id: primaryId(),
    userId: userIdColumn(),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 32 }),
    icon: varchar('icon', { length: 64 }),
    ...auditTimestamps(),
    deletedAt: softDeleteTimestamp(),
  },
  (table) => [
    index('categories_user_id_idx').on(table.userId),
    uniqueIndex('categories_user_id_name_active_uidx')
      .on(table.userId, table.name)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
