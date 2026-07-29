import type { HabitFrequency } from '../habits/habit.types.js';

export interface ReminderSchedulingCandidate {
  habitDeletedAt: Date | null;
  habitEndDate: string | null;
  habitFrequencyType: HabitFrequency;
  habitId: string;
  habitIsActive: boolean;
  habitStartDate: string;
  reminderDeletedAt: Date | null;
  reminderId: string;
  reminderIsEnabled: boolean;
  storedTimezone: string | null;
  timeOfDay: string;
  userId: string;
  weekdays: number[];
}

export interface EligibleReminder {
  habitId: string;
  localDate: string;
  localTime: string;
  reminderId: string;
  timeOfDay: string;
  timezone: string;
  userId: string;
}
