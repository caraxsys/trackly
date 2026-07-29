import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { notificationDeliveries } from '../../db/schema/index.js';
import type {
  NotificationDeliveryStatus,
  NotificationOccurrence,
  NotificationProviderName,
} from './notification-delivery.types.js';

function projection() {
  return {
    id: notificationDeliveries.id,
    userId: notificationDeliveries.userId,
    reminderId: notificationDeliveries.reminderId,
    occurrenceKey: notificationDeliveries.occurrenceKey,
    scheduledLocalDate: notificationDeliveries.scheduledLocalDate,
    scheduledLocalTime: notificationDeliveries.scheduledLocalTime,
    timezone: notificationDeliveries.timezone,
    provider: notificationDeliveries.provider,
    status: notificationDeliveries.status,
    attemptCount: notificationDeliveries.attemptCount,
    createdAt: notificationDeliveries.createdAt,
    updatedAt: notificationDeliveries.updatedAt,
  };
}

export function createNotificationDeliveryRepository(database: Database) {
  async function transition(
    id: string,
    from: NotificationDeliveryStatus,
    to: NotificationDeliveryStatus,
    incrementAttempt = false,
  ) {
    const [updated] = await database
      .update(notificationDeliveries)
      .set({
        status: to,
        updatedAt: new Date(),
        ...(incrementAttempt
          ? {
              attemptCount: sql`${notificationDeliveries.attemptCount} + 1`,
            }
          : {}),
      })
      .where(
        and(
          eq(notificationDeliveries.id, id),
          eq(notificationDeliveries.status, from),
        ),
      )
      .returning(projection());
    return updated ?? null;
  }

  return {
    async claimOccurrence(
      occurrence: NotificationOccurrence,
      provider: NotificationProviderName,
    ) {
      const [created] = await database
        .insert(notificationDeliveries)
        .values({ ...occurrence, provider })
        .onConflictDoNothing({
          target: notificationDeliveries.occurrenceKey,
        })
        .returning(projection());
      if (created) {
        return {
          claimed: true as const,
          delivery: created,
        };
      }
      const [existing] = await database
        .select(projection())
        .from(notificationDeliveries)
        .where(
          eq(notificationDeliveries.occurrenceKey, occurrence.occurrenceKey),
        )
        .limit(1);
      if (!existing) {
        throw new Error('Claimed notification occurrence could not be found.');
      }
      return {
        claimed: false as const,
        delivery: existing,
      };
    },

    markProcessing: (id: string) =>
      transition(id, 'pending', 'processing', true),
    markDelivered: (id: string) => transition(id, 'processing', 'delivered'),
    markFailed: (id: string) => transition(id, 'processing', 'failed'),
    markSkipped: (id: string) => transition(id, 'pending', 'skipped'),
  };
}

export type NotificationDeliveryRepository = ReturnType<
  typeof createNotificationDeliveryRepository
>;
