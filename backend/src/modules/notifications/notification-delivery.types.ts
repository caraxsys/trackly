import type { EligibleReminder } from '../reminders/reminder-scheduling.types.js';

export type NotificationDeliveryStatus =
  'pending' | 'processing' | 'delivered' | 'failed' | 'skipped';
export type NotificationProviderName = 'noop' | 'web_push';

export interface NotificationOccurrence {
  occurrenceKey: string;
  reminderId: string;
  scheduledLocalDate: string;
  scheduledLocalTime: string;
  timezone: string;
  userId: string;
}

export interface NotificationDeliveryRecord extends NotificationOccurrence {
  attemptCount: number;
  createdAt: Date;
  id: string;
  provider: NotificationProviderName;
  status: NotificationDeliveryStatus;
  updatedAt: Date;
}

export interface NotificationProviderInput extends NotificationOccurrence {
  body: string;
  deliveryId: string;
  habitId: string;
  title: string;
}

export type NotificationProviderResult =
  | { status: 'delivered' }
  | { status: 'failed'; errorCode: string }
  | { status: 'skipped'; reasonCode: string };

export interface NotificationProvider {
  readonly name: NotificationProviderName;
  send(input: NotificationProviderInput): Promise<NotificationProviderResult>;
}

export type NotificationDeliveryResult =
  | {
      claimed: true;
      deliveryId: string;
      status: 'delivered' | 'failed' | 'skipped';
    }
  | {
      claimed: false;
      deliveryId: string;
      existingStatus: NotificationDeliveryStatus;
      status: 'duplicate';
    };

export type EligibleNotificationReminder = EligibleReminder;
