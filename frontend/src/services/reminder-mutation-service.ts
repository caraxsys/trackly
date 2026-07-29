import { httpClient } from '@/services/http-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Reminder, ReminderPayload } from '@/types/reminder';

function collectionPath(habitId: string) {
  return `/api/v1/habits/${encodeURIComponent(habitId)}/reminders`;
}

export async function createReminder(
  habitId: string,
  payload: ReminderPayload,
) {
  const response = await httpClient.post<ApiSuccessResponse<Reminder>>(
    collectionPath(habitId),
    payload,
  );
  return response.data.data;
}

export async function updateReminder(
  habitId: string,
  reminderId: string,
  payload: ReminderPayload,
) {
  const response = await httpClient.patch<ApiSuccessResponse<Reminder>>(
    `${collectionPath(habitId)}/${encodeURIComponent(reminderId)}`,
    payload,
  );
  return response.data.data;
}

export async function deleteReminder(habitId: string, reminderId: string) {
  const response = await httpClient.delete<
    ApiSuccessResponse<{ id: string; deleted: true }>
  >(`${collectionPath(habitId)}/${encodeURIComponent(reminderId)}`);
  return response.data.data;
}
