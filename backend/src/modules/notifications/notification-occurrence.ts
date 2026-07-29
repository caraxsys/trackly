import type { EligibleReminder } from '../reminders/reminder-scheduling.types.js';
import type { NotificationOccurrence } from './notification-delivery.types.js';

export function canonicalScheduledLocalTime(value: string) {
  return value.slice(0, 5);
}

export function createOccurrenceKey(
  occurrence: Omit<NotificationOccurrence, 'occurrenceKey' | 'userId'>,
) {
  return JSON.stringify([
    1,
    occurrence.reminderId,
    occurrence.timezone,
    occurrence.scheduledLocalDate,
    canonicalScheduledLocalTime(occurrence.scheduledLocalTime),
  ]);
}

export function mapEligibleReminderToOccurrence(
  eligible: EligibleReminder,
): NotificationOccurrence {
  const values = {
    reminderId: eligible.reminderId,
    scheduledLocalDate: eligible.localDate,
    scheduledLocalTime: canonicalScheduledLocalTime(eligible.localTime),
    timezone: eligible.timezone,
  };
  return {
    ...values,
    userId: eligible.userId,
    occurrenceKey: createOccurrenceKey(values),
  };
}
