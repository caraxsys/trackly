import { describe, expect, it } from 'vitest';

import {
  formatDateRange,
  formatSchedule,
  formatTarget,
  formatTimestamp,
  formatWeekdays,
} from '@/lib/habit-format';

describe('habit formatting', () => {
  it('formats daily, weekly, and custom schedules with ISO weekdays', () => {
    expect(formatSchedule('daily', [])).toBe('Every day');
    expect(formatSchedule('weekly', [1, 3, 5])).toBe('Mon, Wed, Fri');
    expect(formatSchedule('custom', [2, 4])).toBe('Custom: Tue, Thu');
    expect(formatWeekdays([1, 7])).toBe('Mon, Sun');
  });

  it('formats targets, logical dates, and timezone-aware timestamps', () => {
    expect(formatTarget(1)).toBe('Once per scheduled day');
    expect(formatTarget(3)).toBe('3 times per scheduled day');
    expect(formatDateRange('2026-07-01', null)).toContain('Jul');
    expect(
      formatTimestamp('2026-07-27T00:00:00.000Z', 'Asia/Jakarta'),
    ).toContain('7:00');
  });
});
