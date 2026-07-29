import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { pushSubscriptions } from '../../db/schema/index.js';

const publicProjection = {
  id: pushSubscriptions.id,
  endpoint: pushSubscriptions.endpoint,
  userAgent: pushSubscriptions.userAgent,
  isEnabled: pushSubscriptions.isEnabled,
  createdAt: pushSubscriptions.createdAt,
  updatedAt: pushSubscriptions.updatedAt,
};

const deliveryProjection = {
  id: pushSubscriptions.id,
  endpoint: pushSubscriptions.endpoint,
  p256dh: pushSubscriptions.p256dh,
  auth: pushSubscriptions.auth,
};

export function createPushSubscriptionRepository(database: Database) {
  return {
    async createOrReactivate(
      userId: string,
      input: {
        endpoint: string;
        p256dh: string;
        auth: string;
        userAgent?: string;
      },
    ) {
      return database.transaction(async (transaction) => {
        const [active] = await transaction
          .select({
            id: pushSubscriptions.id,
            userId: pushSubscriptions.userId,
          })
          .from(pushSubscriptions)
          .where(
            and(
              eq(pushSubscriptions.endpoint, input.endpoint),
              isNull(pushSubscriptions.deletedAt),
            ),
          )
          .limit(1);
        if (active && active.userId !== userId) {
          return { status: 'owned_by_another_user' as const };
        }

        const now = new Date();
        if (active) {
          const [updated] = await transaction
            .update(pushSubscriptions)
            .set({
              p256dh: input.p256dh,
              auth: input.auth,
              userAgent: input.userAgent ?? null,
              isEnabled: true,
              failureCount: 0,
              lastFailureAt: null,
              updatedAt: now,
            })
            .where(
              and(
                eq(pushSubscriptions.id, active.id),
                eq(pushSubscriptions.userId, userId),
              ),
            )
            .returning(publicProjection);
          if (!updated) throw new Error('Push subscription update failed.');
          return { status: 'updated' as const, subscription: updated };
        }

        const [ownedDeleted] = await transaction
          .select({ id: pushSubscriptions.id })
          .from(pushSubscriptions)
          .where(
            and(
              eq(pushSubscriptions.endpoint, input.endpoint),
              eq(pushSubscriptions.userId, userId),
            ),
          )
          .orderBy(desc(pushSubscriptions.updatedAt))
          .limit(1);
        if (ownedDeleted) {
          const [reactivated] = await transaction
            .update(pushSubscriptions)
            .set({
              p256dh: input.p256dh,
              auth: input.auth,
              userAgent: input.userAgent ?? null,
              isEnabled: true,
              deletedAt: null,
              failureCount: 0,
              lastFailureAt: null,
              updatedAt: now,
            })
            .where(eq(pushSubscriptions.id, ownedDeleted.id))
            .returning(publicProjection);
          if (!reactivated) {
            throw new Error('Push subscription reactivation failed.');
          }
          return { status: 'updated' as const, subscription: reactivated };
        }

        const [created] = await transaction
          .insert(pushSubscriptions)
          .values({
            userId,
            endpoint: input.endpoint,
            p256dh: input.p256dh,
            auth: input.auth,
            userAgent: input.userAgent,
          })
          .returning(publicProjection);
        if (!created) throw new Error('Push subscription insert failed.');
        return { status: 'created' as const, subscription: created };
      });
    },

    listActiveByUser(userId: string) {
      return database
        .select(publicProjection)
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, userId),
            eq(pushSubscriptions.isEnabled, true),
            isNull(pushSubscriptions.deletedAt),
          ),
        )
        .orderBy(asc(pushSubscriptions.createdAt), asc(pushSubscriptions.id));
    },

    findActiveForDelivery(userId: string) {
      return database
        .select(deliveryProjection)
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, userId),
            eq(pushSubscriptions.isEnabled, true),
            isNull(pushSubscriptions.deletedAt),
          ),
        )
        .orderBy(asc(pushSubscriptions.createdAt), asc(pushSubscriptions.id));
    },

    async disableOwned(userId: string, endpoint: string) {
      const now = new Date();
      const [disabled] = await database
        .update(pushSubscriptions)
        .set({ isEnabled: false, deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(pushSubscriptions.userId, userId),
            eq(pushSubscriptions.endpoint, endpoint),
            isNull(pushSubscriptions.deletedAt),
          ),
        )
        .returning({ id: pushSubscriptions.id });
      return disabled ?? null;
    },

    async recordSuccess(id: string) {
      const now = new Date();
      const [updated] = await database
        .update(pushSubscriptions)
        .set({
          lastSuccessAt: now,
          failureCount: 0,
          updatedAt: now,
        })
        .where(
          and(
            eq(pushSubscriptions.id, id),
            eq(pushSubscriptions.isEnabled, true),
            isNull(pushSubscriptions.deletedAt),
          ),
        )
        .returning({ id: pushSubscriptions.id });
      return updated ?? null;
    },

    async recordFailure(id: string) {
      const now = new Date();
      const [updated] = await database
        .update(pushSubscriptions)
        .set({
          lastFailureAt: now,
          failureCount: sql`${pushSubscriptions.failureCount} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(pushSubscriptions.id, id),
            eq(pushSubscriptions.isEnabled, true),
            isNull(pushSubscriptions.deletedAt),
          ),
        )
        .returning({ id: pushSubscriptions.id });
      return updated ?? null;
    },

    async invalidate(id: string) {
      const now = new Date();
      const [invalidated] = await database
        .update(pushSubscriptions)
        .set({
          isEnabled: false,
          deletedAt: now,
          lastFailureAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(pushSubscriptions.id, id),
            isNull(pushSubscriptions.deletedAt),
          ),
        )
        .returning({ id: pushSubscriptions.id });
      return invalidated ?? null;
    },
  };
}

export type PushSubscriptionRepository = ReturnType<
  typeof createPushSubscriptionRepository
>;
