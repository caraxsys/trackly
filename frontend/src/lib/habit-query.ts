import type { HabitCollectionData, HabitCollectionParams } from '@/types/habit';

export function habitsHref(
  current: HabitCollectionData['query'],
  changes: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  const values = {
    view: current.view,
    date: current.date,
    search: current.search,
    sort: current.sort,
    order: current.order,
    ...changes,
  };

  for (const [key, value] of Object.entries(values)) {
    if (
      value !== undefined &&
      value !== '' &&
      !(key === 'page' && String(value) === '1')
    ) {
      params.set(key, String(value));
    }
  }

  return `/habits?${params.toString()}`;
}

export function normalizeHabitParams(
  params: Record<string, string | string[] | undefined>,
): HabitCollectionParams {
  const one = (value: string | string[] | undefined) =>
    typeof value === 'string' ? value : undefined;
  return {
    view: one(params.view),
    date: one(params.date),
    search: one(params.search),
    sort: one(params.sort),
    order: one(params.order),
    page: one(params.page),
  };
}
