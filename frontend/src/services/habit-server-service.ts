import 'server-only';

import { getInternalApiUrl } from '@/lib/server-environment';
import type {
  HabitCategory,
  HabitCollectionData,
  HabitCollectionParams,
  HabitDetail,
  HabitStreak,
} from '@/types/habit';
import { requestServerApi, ServerApiError } from './server-api';

export class HabitServerError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super('The habit request failed.');
    this.name = 'HabitServerError';
  }
}

async function requestHabit<T>(path: string) {
  try {
    return await requestServerApi<T>(path);
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new HabitServerError(error.status, error.code);
    }
    throw error;
  }
}

export function getServerHabits(params: HabitCollectionParams) {
  const url = new URL('/api/v1/habits', getInternalApiUrl());

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  return requestHabit<HabitCollectionData>(`${url.pathname}${url.search}`);
}

export function getServerHabit(id: string) {
  return requestHabit<HabitDetail>(`/api/v1/habits/${encodeURIComponent(id)}`);
}

export function getServerHabitStreak(id: string) {
  return requestHabit<HabitStreak>(
    `/api/v1/habits/${encodeURIComponent(id)}/streak`,
  );
}

export function getServerHabitCategories() {
  return requestHabit<HabitCategory[]>('/api/v1/categories');
}
