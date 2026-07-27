import { httpClient } from '@/services/http-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { HabitCheckInResult } from '@/types/habit';

export async function setHabitCheckIn(
  habitId: string,
  payload: { date: string; completedCount: number },
) {
  const response = await httpClient.post<
    ApiSuccessResponse<HabitCheckInResult>
  >(`/api/v1/habits/${encodeURIComponent(habitId)}/check-in`, payload);

  return response.data.data;
}
