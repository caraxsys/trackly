import webPush from 'web-push';

import type { AppLogger } from '../../config/logger.js';
import type { PushSubscriptionRepository } from '../push-subscriptions/push-subscription.repository.js';
import type {
  NotificationProvider,
  NotificationProviderInput,
  NotificationProviderResult,
} from './notification-delivery.types.js';
import {
  configureWebPush,
  type WebPushConfiguration,
} from './web-push.config.js';

interface WebPushClient {
  sendNotification(
    subscription: webPush.PushSubscription,
    payload?: string,
  ): Promise<unknown>;
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
}

function responseStatus(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }
  return null;
}

function payload(input: NotificationProviderInput) {
  return JSON.stringify({
    title: 'Trackly',
    body: input.body,
    data: {
      type: 'habit_reminder',
      habitId: input.habitId,
      reminderId: input.reminderId,
      scheduledLocalDate: input.scheduledLocalDate,
      scheduledLocalTime: input.scheduledLocalTime,
    },
  });
}

export class WebPushNotificationProvider implements NotificationProvider {
  readonly name = 'web_push' as const;

  constructor(
    private readonly repository: Pick<
      PushSubscriptionRepository,
      'findActiveForDelivery' | 'invalidate' | 'recordFailure' | 'recordSuccess'
    >,
    configuration: WebPushConfiguration,
    private readonly logger: Pick<AppLogger, 'error' | 'info'>,
    private readonly client: WebPushClient = webPush,
  ) {
    configureWebPush(configuration, client);
  }

  async send(
    input: NotificationProviderInput,
  ): Promise<NotificationProviderResult> {
    const subscriptions = await this.repository.findActiveForDelivery(
      input.userId,
    );
    if (subscriptions.length === 0) {
      return {
        status: 'skipped',
        reasonCode: 'NO_ACTIVE_PUSH_SUBSCRIPTIONS',
      };
    }

    let successful = 0;
    for (const subscription of subscriptions) {
      try {
        await this.client.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload(input),
        );
        await this.repository.recordSuccess(subscription.id);
        successful += 1;
      } catch (error) {
        const statusCode = responseStatus(error);
        if (statusCode === 404 || statusCode === 410) {
          await this.repository.invalidate(subscription.id);
        } else {
          await this.repository.recordFailure(subscription.id);
        }
        this.logger.error(
          {
            event: 'web_push_subscription_delivery_failed',
            deliveryId: input.deliveryId,
            provider: this.name,
            statusCode,
          },
          'Web Push subscription delivery failed',
        );
      }
    }

    if (successful > 0) {
      this.logger.info(
        {
          event: 'web_push_delivery_completed',
          deliveryId: input.deliveryId,
          provider: this.name,
          successfulSubscriptions: successful,
          attemptedSubscriptions: subscriptions.length,
        },
        'Web Push delivery completed',
      );
      return { status: 'delivered' };
    }
    return { status: 'failed', errorCode: 'WEB_PUSH_ALL_ATTEMPTS_FAILED' };
  }
}
