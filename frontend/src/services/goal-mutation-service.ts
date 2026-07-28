import { httpClient } from '@/services/http-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Goal, GoalPayload } from '@/types/goal';

export async function createGoal(payload: GoalPayload) {
  return (
    await httpClient.post<ApiSuccessResponse<Goal>>('/api/v1/goals', payload)
  ).data.data;
}
export async function updateGoal(id: string, payload: Partial<GoalPayload>) {
  return (
    await httpClient.patch<ApiSuccessResponse<Goal>>(
      `/api/v1/goals/${encodeURIComponent(id)}`,
      payload,
    )
  ).data.data;
}
export async function deleteGoal(id: string) {
  return (
    await httpClient.delete<ApiSuccessResponse<{ id: string; deleted: true }>>(
      `/api/v1/goals/${encodeURIComponent(id)}`,
    )
  ).data.data;
}
