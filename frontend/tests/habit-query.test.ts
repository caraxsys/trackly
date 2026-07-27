import { describe, expect, it } from 'vitest';

import { habitsHref, normalizeHabitParams } from '@/lib/habit-query';

const query = {
  view: 'all' as const,
  date: '2026-07-27',
  timezone: 'UTC',
  search: 'reading',
  sort: 'name' as const,
  order: 'asc' as const,
};

describe('habit URL state', () => {
  it('preserves shareable state and resets pages through changes', () => {
    expect(habitsHref(query, { page: 2 })).toBe(
      '/habits?view=all&date=2026-07-27&search=reading&sort=name&order=asc&page=2',
    );
    expect(habitsHref(query, { view: 'inactive', page: 1 })).not.toContain(
      'page=',
    );
    expect(habitsHref(query, { search: undefined })).not.toContain('search=');
  });

  it('ignores duplicate-array values from malformed URLs', () => {
    expect(
      normalizeHabitParams({ view: ['all', 'today'], search: 'read' }),
    ).toEqual({
      view: undefined,
      date: undefined,
      search: 'read',
      sort: undefined,
      order: undefined,
      page: undefined,
    });
  });
});
