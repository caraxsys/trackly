import {
  getLocalCalendarDate,
  getLocalTime,
  resolveTimezone,
} from '../../lib/date/timezone.js';
import {
  isHabitScheduledOnDate,
  type HabitScheduleState,
} from '../habits/habit-schedule.js';

export interface ReminderEligibilityState {
  deletedAt: Date | null;
  isEnabled: boolean;
  timeOfDay: string;
}

export interface ReminderHabitState extends HabitScheduleState {
  deletedAt: Date | null;
  isActive: boolean;
}

export function resolveReminderLocalContext(
  currentInstant: Date,
  storedTimezone: string | null | undefined,
) {
  const timezone = resolveTimezone(storedTimezone);
  return {
    timezone,
    localDate: getLocalCalendarDate(currentInstant, timezone),
    localTime: getLocalTime(currentInstant, timezone),
  };
}

export function isReminderEligible({
  habit,
  localDate,
  localTime,
  reminder,
}: {
  habit: ReminderHabitState;
  localDate: string;
  localTime: string;
  reminder: ReminderEligibilityState;
}) {
  return (
    reminder.deletedAt === null &&
    reminder.isEnabled &&
    habit.deletedAt === null &&
    habit.isActive &&
    reminder.timeOfDay.slice(0, 5) === localTime &&
    isHabitScheduledOnDate(habit, localDate)
  );
}
