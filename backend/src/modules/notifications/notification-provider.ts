import type { AppLogger } from '../../config/logger.js';
import type {
  NotificationProvider,
  NotificationProviderInput,
  NotificationProviderResult,
} from './notification-delivery.types.js';

export class NoopNotificationProvider implements NotificationProvider {
  readonly name = 'noop' as const;

  constructor(private readonly logger: Pick<AppLogger, 'debug'>) {}

  send(input: NotificationProviderInput): Promise<NotificationProviderResult> {
    this.logger.debug(
      {
        event: 'notification_noop_provider_completed',
        deliveryId: input.deliveryId,
        provider: this.name,
      },
      'Noop notification provider completed',
    );
    return Promise.resolve({ status: 'delivered' });
  }
}
