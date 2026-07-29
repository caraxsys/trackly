import { describe, expect, it } from 'vitest';

import {
  isReminderEligible,
  resolveReminderLocalContext,
  type ReminderEligibilityState,
  type ReminderHabitState,
} from '../src/modules/reminders/reminder-eligibility.js';

const reminder: ReminderEligibilityState = {
  deletedAt: null,
  isEnabled: true,
  timeOfDay: '08:00',
};
const habit: ReminderHabitState = {
  deletedAt: null,
  endDate: null,
  frequencyType: 'daily',
  isActive: true,
  startDate: '2026-01-01',
  weekdays: [],
};

function eligible(
  reminderChanges: Partial<ReminderEligibilityState> = {},
  habitChanges: Partial<ReminderHabitState> = {},
  localDate = '2026-07-29',
  localTime = '08:00',
) {
  return isReminderEligible({
    reminder: { ...reminder, ...reminderChanges },
    habit: { ...habit, ...habitChanges },
    localDate,
    localTime,
  });
}

describe('Reminder eligibility', () => {
  it('accepts an enabled active scheduled Reminder at an exact local HH:mm', () => {
    expect(eligible()).toBe(true);
    expect(eligible({}, {}, '2026-07-29', '08:01')).toBe(false);
  });

  it('excludes disabled and soft-deleted Reminders', () => {
    expect(eligible({ isEnabled: false })).toBe(false);
    expect(eligible({ deletedAt: new Date() })).toBe(false);
  });

  it('excludes archived and soft-deleted Habits', () => {
    expect(eligible({}, { isActive: false })).toBe(false);
    expect(eligible({}, { deletedAt: new Date() })).toBe(false);
  });

  it('reuses date range and weekday schedule semantics', () => {
    const weekly = {
      frequencyType: 'weekly' as const,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      weekdays: [3],
    };
    expect(eligible({}, weekly, '2026-07-29')).toBe(true);
    expect(eligible({}, weekly, '2026-07-30')).toBe(false);
    expect(eligible({}, weekly, '2026-08-05')).toBe(false);
  });

  it('resolves normal timezone conversion and local date rollover', () => {
    const instant = new Date('2026-07-28T17:30:00.000Z');
    expect(resolveReminderLocalContext(instant, 'Asia/Jakarta')).toEqual({
      timezone: 'Asia/Jakarta',
      localDate: '2026-07-29',
      localTime: '00:30',
    });
    expect(resolveReminderLocalContext(instant, 'America/New_York')).toEqual({
      timezone: 'America/New_York',
      localDate: '2026-07-28',
      localTime: '13:30',
    });
  });

  it('uses UTC for missing and invalid legacy timezones', () => {
    const instant = new Date('2026-07-29T08:00:00.000Z');
    expect(resolveReminderLocalContext(instant, null)).toMatchObject({
      timezone: 'UTC',
      localDate: '2026-07-29',
      localTime: '08:00',
    });
    expect(
      resolveReminderLocalContext(instant, 'Invalid/Timezone'),
    ).toMatchObject({
      timezone: 'UTC',
      localTime: '08:00',
    });
  });

  it('uses runtime IANA DST conversion deterministically', () => {
    expect(
      resolveReminderLocalContext(
        new Date('2026-03-29T00:30:00.000Z'),
        'Europe/London',
      ).localTime,
    ).toBe('00:30');
    expect(
      resolveReminderLocalContext(
        new Date('2026-03-29T01:30:00.000Z'),
        'Europe/London',
      ).localTime,
    ).toBe('02:30');
  });
});
