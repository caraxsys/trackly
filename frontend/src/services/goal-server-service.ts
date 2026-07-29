import 'server-only';

import type { Goal, GoalStatus } from '@/types/goal';
import type { HabitCollectionData } from '@/types/habit';
import { requestServerApi, ServerApiError } from './server-api';

export class GoalServerError extends Error {
  constructor(readonly status: number) {
    super('The Goal request failed.');
  }
}
async function request<T>(path: string) {
  try {
    return await requestServerApi<T>(path);
  } catch (error) {
    if (error instanceof ServerApiError)
      throw new GoalServerError(error.status);
    throw error;
  }
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
