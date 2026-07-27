import { and, asc, eq, isNull } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { categories } from '../../db/schema/index.js';

export function createCategoryRepository(database: Database) {
  return {
    listActiveByUser(userId: string) {
      return database
        .select({
          id: categories.id,
          name: categories.name,
          color: categories.color,
          icon: categories.icon,
        })
        .from(categories)
        .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
        .orderBy(
          asc(categories.name),
          asc(categories.createdAt),
          asc(categories.id),
        );
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
