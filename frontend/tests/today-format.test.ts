import { describe, expect, it } from 'vitest';

import {
  addDisplayDateDays,
  formatDisplayDate,
  formatTimeInTimezone,
  getDisplayName,
  getGreeting,
} from '@/lib/today-format';

describe('Today formatting utilities', () => {
  it('formats and navigates date-only values without timezone shifts', () => {
    expect(formatDisplayDate('2026-07-27')).toBe('Monday, July 27, 2026');
    expect(addDisplayDateDays('2026-07-27', -1)).toBe('2026-07-26');
    expect(addDisplayDateDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('formats timestamps in the user timezone near midnight', () => {
    expect(
      formatTimeInTimezone('2026-07-26T17:30:00.000Z', 'Asia/Jakarta'),
    ).toBe('12:30 AM');
    expect(formatTimeInTimezone('2026-07-26T17:30:00.000Z', 'UTC')).toBe(
      '5:30 PM',
    );
  });

  it('selects deterministic greetings in the user timezone', () => {
    const instant = new Date('2026-07-27T05:00:00.000Z');
    expect(getGreeting(instant, 'Asia/Jakarta')).toBe('Good afternoon');
    expect(getGreeting(instant, 'America/New_York')).toBe('Good morning');
    expect(getGreeting(instant, 'Invalid/Timezone')).toBe('Hello');
  });

  it('extracts a safe first display name', () => {
    expect(getDisplayName('  Ada Lovelace ')).toBe('Ada');
    expect(getDisplayName('')).toBe('there');
  });
});
