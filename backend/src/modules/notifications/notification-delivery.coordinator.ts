import type { AppLogger } from '../../config/logger.js';
import type { EligibleReminder } from '../reminders/reminder-scheduling.types.js';
import type { NotificationDeliveryRepository } from './notification-delivery.repository.js';
import type { NotificationDispatcher } from './notification-dispatcher.js';
import type {
  NotificationDeliveryResult,
  NotificationProviderName,
} from './notification-delivery.types.js';
import { mapEligibleReminderToOccurrence } from './notification-occurrence.js';

export function createNotificationDeliveryCoordinator({
  dispatcher,
  logger,
  provider,
  repository,
}: {
  dispatcher: NotificationDispatcher;
  logger: Pick<AppLogger, 'error' | 'info'>;
  provider: NotificationProviderName;
  repository: NotificationDeliveryRepository;
}) {
  return {
    async process(
      eligible: EligibleReminder,
    ): Promise<NotificationDeliveryResult> {
      const occurrence = mapEligibleReminderToOccurrence(eligible);
      const claim = await repository.claimOccurrence(occurrence, provider);
      if (!claim.claimed) {
        logger.info(
          {
            event: 'notification_delivery_duplicate',
            deliveryId: claim.delivery.id,
            provider: claim.delivery.provider,
            status: claim.delivery.status,
          },
          'Notification delivery occurrence already exists',
        );
        return {
          claimed: false,
          deliveryId: claim.delivery.id,
          existingStatus: claim.delivery.status,
          status: 'duplicate',
        };
      }

      logger.info(
        {
          event: 'notification_delivery_claimed',
          deliveryId: claim.delivery.id,
          provider,
          status: claim.delivery.status,
        },
        'Notification delivery occurrence claimed',
      );
      const processing = await repository.markProcessing(claim.delivery.id);
      if (!processing) {
        throw new Error('Notification delivery could not enter processing.');
      }

      try {
        const providerResult = await dispatcher.dispatch(provider, {
          ...occurrence,
          deliveryId: processing.id,
          title: 'Trackly reminder',
          body: 'A scheduled Habit is ready for your attention.',
        });
        if (!providerResult.success) {
          const failed = await repository.markFailed(processing.id);
          if (!failed) {
            throw new Error(
              'Notification delivery could not be marked failed.',
            );
          }
          logger.error(
            {
              event: 'notification_delivery_failed',
              deliveryId: processing.id,
              provider,
              status: 'failed',
              errorCode: providerResult.errorCode,
            },
            'Notification provider reported failure',
          );
          return {
            claimed: true,
            deliveryId: processing.id,
            status: 'failed',
          };
        }
        const delivered = await repository.markDelivered(processing.id);
        if (!delivered) {
          throw new Error(
            'Notification delivery could not be marked delivered.',
          );
        }
        logger.info(
          {
            event: 'notification_delivery_completed',
            deliveryId: delivered.id,
            provider,
            status: delivered.status,
          },
          'Notification delivery provider completed',
        );
        return {
          claimed: true,
          deliveryId: delivered.id,
          status: 'delivered',
        };
      } catch (error) {
        const failed = await repository.markFailed(processing.id);
        if (!failed) throw error;
        logger.error(
          {
            event: 'notification_delivery_failed',
            deliveryId: processing.id,
            provider,
            status: 'failed',
            errorName: error instanceof Error ? error.name : 'UnknownError',
          },
          'Notification delivery failed',
        );
        return {
          claimed: true,
          deliveryId: processing.id,
          status: 'failed',
        };
      }
    },
  };
}

export type NotificationDeliveryCoordinator = ReturnType<
  typeof createNotificationDeliveryCoordinator
>;
