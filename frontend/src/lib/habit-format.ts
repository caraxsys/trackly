import type { HabitFrequency } from '@/types/habit';

import { formatDisplayDate } from './today-format';

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatWeekdays(weekdays: number[]) {
  return weekdays
    .filter((day) => day >= 1 && day <= 7)
    .map((day) => weekdayNames[day - 1])
    .join(', ');
}

export function formatSchedule(frequency: HabitFrequency, weekdays: number[]) {
  if (frequency === 'daily') return 'Every day';
  const days = formatWeekdays(weekdays);
  if (!days) return frequency === 'custom' ? 'Custom schedule' : 'Weekly';
  return frequency === 'custom' ? `Custom: ${days}` : days;
}

export function formatTarget(targetCount: number) {
  return targetCount === 1
    ? 'Once per scheduled day'
    : `${targetCount} times per scheduled day`;
}

export function formatDateRange(startDate: string, endDate: string | null) {
  return endDate
    ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`
    : `Since ${formatDisplayDate(startDate)}`;
}

export function formatTimestamp(value: string, timezone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(date);
}
