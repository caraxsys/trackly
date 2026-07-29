import { getIsoWeekday } from '../../lib/date/calendar-date.js';
import type { HabitFrequency } from './habit.types.js';

export interface HabitScheduleState {
  endDate: string | null;
  frequencyType: HabitFrequency;
  startDate: string;
  weekdays: readonly number[];
}

export function isHabitScheduledOnDate(
  habit: HabitScheduleState,
  date: string,
) {
  if (
    date < habit.startDate ||
    (habit.endDate !== null && date > habit.endDate)
  ) {
    return false;
  }

  return (
    habit.frequencyType === 'daily' ||
    habit.weekdays.includes(getIsoWeekday(date))
  );
}
