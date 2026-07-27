import { eq } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { userPreferences } from '../../db/schema/index.js';

export function createPreferenceRepository(database: Database) {
  return {
    async findTimezone(userId: string) {
      const [preference] = await database
        .select({ timezone: userPreferences.timezone })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      return preference?.timezone ?? null;
    },
  };
}

export type PreferenceRepository = ReturnType<
  typeof createPreferenceRepository
>;
