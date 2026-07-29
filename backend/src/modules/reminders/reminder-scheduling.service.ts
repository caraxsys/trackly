import { DEFAULT_TIMEZONE } from '../../lib/date/timezone.js';
import {
  isReminderEligible,
  resolveReminderLocalContext,
} from './reminder-eligibility.js';
import type { ReminderSchedulingRepository } from './reminder-scheduling.repository.js';
import type {
  EligibleReminder,
  ReminderSchedulingCandidate,
} from './reminder-scheduling.types.js';

function resultOrder(left: EligibleReminder, right: EligibleReminder) {
  return (
    left.localDate.localeCompare(right.localDate) ||
    left.localTime.localeCompare(right.localTime) ||
    left.userId.localeCompare(right.userId) ||
    left.habitId.localeCompare(right.habitId) ||
    left.reminderId.localeCompare(right.reminderId)
  );
}

export function createReminderEligibilityService(
  repository: ReminderSchedulingRepository,
) {
  return {
    async listEligible(currentInstant: Date): Promise<EligibleReminder[]> {
      const storedTimezones = await repository.listStoredTimezones();
      const contexts = [DEFAULT_TIMEZONE, ...storedTimezones].map((timezone) =>
        resolveReminderLocalContext(currentInstant, timezone),
      );
      const localTimes = [
        ...new Set(contexts.map(({ localTime }) => localTime)),
      ].sort();
      const candidates = await repository.findCandidates(localTimes);

      return candidates
        .flatMap((candidate: ReminderSchedulingCandidate) => {
          const context = resolveReminderLocalContext(
            currentInstant,
            candidate.storedTimezone,
          );
          const eligible = isReminderEligible({
            reminder: {
              deletedAt: candidate.reminderDeletedAt,
              isEnabled: candidate.reminderIsEnabled,
              timeOfDay: candidate.timeOfDay,
            },
            habit: {
              deletedAt: candidate.habitDeletedAt,
              endDate: candidate.habitEndDate,
              frequencyType: candidate.habitFrequencyType,
              isActive: candidate.habitIsActive,
              startDate: candidate.habitStartDate,
              weekdays: candidate.weekdays.map(Number),
            },
            localDate: context.localDate,
            localTime: context.localTime,
          });
          return eligible
            ? [
                {
                  reminderId: candidate.reminderId,
                  habitId: candidate.habitId,
                  userId: candidate.userId,
                  timezone: context.timezone,
                  localDate: context.localDate,
                  localTime: context.localTime,
                  timeOfDay: candidate.timeOfDay.slice(0, 5),
                },
              ]
            : [];
        })
        .sort(resultOrder);
    },
  };
}

export type ReminderEligibilityService = ReturnType<
  typeof createReminderEligibilityService
>;
