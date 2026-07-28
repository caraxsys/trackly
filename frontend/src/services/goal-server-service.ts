import 'server-only';

import { cookies } from 'next/headers';
import { getInternalApiUrl } from '@/lib/server-environment';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';
import type { Goal, GoalStatus } from '@/types/goal';
import type { HabitCollectionData } from '@/types/habit';

export class GoalServerError extends Error {
  constructor(readonly status: number) {
    super('The Goal request failed.');
  }
}
async function request<T>(path: string) {
  const response = await fetch(new URL(path, getInternalApiUrl()), {
    cache: 'no-store',
    headers: {
      cookie: (await cookies()).toString(),
      accept: 'application/json',
    },
  });
  const payload = (await response.json()) as
    ApiSuccessResponse<T> | ApiErrorResponse;
  if (!response.ok || !payload.success)
    throw new GoalServerError(response.status);
  return payload.data;
}
export function getServerGoals(status?: GoalStatus) {
  return request<Goal[]>(`/api/v1/goals${status ? `?status=${status}` : ''}`);
}
export function getServerGoal(id: string) {
  return request<Goal>(`/api/v1/goals/${encodeURIComponent(id)}`);
}
export function getSelectableGoalHabits() {
  return request<HabitCollectionData>('/api/v1/habits?view=all&limit=100');
}
