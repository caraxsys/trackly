import 'server-only';

import { cookies } from 'next/headers';

import { getInternalApiUrl } from '@/lib/server-environment';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';
import type {
  HabitCategory,
  HabitCollectionData,
  HabitCollectionParams,
  HabitDetail,
} from '@/types/habit';

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
  const cookieStore = await cookies();
  const response = await fetch(new URL(path, getInternalApiUrl()), {
    cache: 'no-store',
    headers: { accept: 'application/json', cookie: cookieStore.toString() },
  });
  const payload = (await response.json()) as
    ApiSuccessResponse<T> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    throw new HabitServerError(
      response.status,
      payload.success ? 'UNKNOWN_ERROR' : payload.error.code,
    );
  }

  return payload.data;
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

export function getServerHabitCategories() {
  return requestHabit<HabitCategory[]>('/api/v1/categories');
}
