import { describe, expect, it } from 'vitest';

import {
  getIsoWeekday,
  parseCalendarDate,
} from '../src/lib/date/calendar-date.js';
import {
  getLocalCalendarDate,
  getLocalDayBounds,
  isValidTimezone,
  resolveTimezone,
} from '../src/lib/date/timezone.js';
import { calculateCompletionPercentage } from '../src/modules/today/today.summary.js';

describe('calendar and timezone utilities', () => {
  it('strictly validates real ISO calendar dates', () => {
    expect(parseCalendarDate('2026-02-28')?.value).toBe('2026-02-28');
    expect(parseCalendarDate('2026-02-30')).toBeNull();
    expect(parseCalendarDate('2026-2-3')).toBeNull();
    expect(parseCalendarDate('2026-02-03T00:00:00Z')).toBeNull();
  });

  it('calculates ISO weekdays without local timezone shifts', () => {
    expect(getIsoWeekday('2026-07-27')).toBe(1);
    expect(getIsoWeekday('2026-08-02')).toBe(7);
  });

  it('uses the requested timezone for the current local date', () => {
    const instant = new Date('2026-07-26T18:00:00.000Z');
    expect(getLocalCalendarDate(instant, 'Asia/Jakarta')).toBe('2026-07-27');
    expect(getLocalCalendarDate(instant, 'UTC')).toBe('2026-07-26');
  });

  it('calculates DST-aware local day boundaries', () => {
    const bounds = getLocalDayBounds('2026-03-08', 'America/New_York');
    expect(bounds.start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });

  it('validates timezones and falls back safely', () => {
    expect(isValidTimezone('Asia/Jakarta')).toBe(true);
    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
    expect(resolveTimezone('Invalid/Timezone')).toBe('UTC');
    expect(resolveTimezone(null)).toBe('UTC');
  });

  it('rounds completion percentages and handles empty totals', () => {
    expect(calculateCompletionPercentage(1, 3)).toBe(33);
    expect(calculateCompletionPercentage(0, 0)).toBe(0);
  });
});
