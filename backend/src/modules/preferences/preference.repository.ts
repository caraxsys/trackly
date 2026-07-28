import { eq } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { userPreferences } from '../../db/schema/index.js';

export function createPreferenceRepository(database: Database) {
  return {
    async findByUserId(userId: string) {
      const [preference] = await database
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
      return preference ?? null;
    },

    async findTimezone(userId: string) {
      const [preference] = await database
        .select({ timezone: userPreferences.timezone })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      return preference?.timezone ?? null;
    },

    async upsert(
      userId: string,
      values: Partial<
        Pick<
          typeof userPreferences.$inferInsert,
          'timezone' | 'weekStartsOn' | 'dateFormat' | 'timeFormat' | 'theme'
        >
      >,
    ) {
      const [preference] = await database
        .insert(userPreferences)
        .values({ userId, ...values })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { ...values, updatedAt: new Date() },
        })
        .returning();
      return preference;
    },
  };
}

export type FullPreferenceRepository = ReturnType<
  typeof createPreferenceRepository
>;
export type PreferenceRepository = Pick<
  FullPreferenceRepository,
  'findTimezone'
>;
