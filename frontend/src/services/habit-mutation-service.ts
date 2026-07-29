import { httpClient } from '@/services/http-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { HabitMutationPayload, HabitMutationResult } from '@/types/habit';

export async function createHabit(payload: HabitMutationPayload) {
  const response = await httpClient.post<
    ApiSuccessResponse<HabitMutationResult>
  >('/api/v1/habits', payload);
  return response.data.data;
}

export async function updateHabit(id: string, payload: HabitMutationPayload) {
  const response = await httpClient.patch<
    ApiSuccessResponse<HabitMutationResult>
  >(`/api/v1/habits/${encodeURIComponent(id)}`, payload);
  return response.data.data;
}

export async function activateHabit(id: string) {
  const response = await httpClient.post<
    ApiSuccessResponse<{ id: string; isActive: boolean }>
  >(`/api/v1/habits/${encodeURIComponent(id)}/activate`);
  return response.data.data;
}

export async function deactivateHabit(id: string) {
  const response = await httpClient.post<
    ApiSuccessResponse<{ id: string; isActive: boolean }>
  >(`/api/v1/habits/${encodeURIComponent(id)}/deactivate`);
  return response.data.data;
}

export async function archiveHabit(id: string) {
  const response = await httpClient.post<
    ApiSuccessResponse<{ id: string; isActive: boolean }>
  >(`/api/v1/habits/${encodeURIComponent(id)}/archive`);
  return response.data.data;
}

export async function restoreHabit(id: string) {
  const response = await httpClient.post<
    ApiSuccessResponse<{ id: string; isActive: boolean }>
  >(`/api/v1/habits/${encodeURIComponent(id)}/restore`);
  return response.data.data;
}

export async function deleteHabit(id: string) {
  const response = await httpClient.delete<
    ApiSuccessResponse<{ id: string; deleted: true }>
  >(`/api/v1/habits/${encodeURIComponent(id)}`);
  return response.data.data;
}
