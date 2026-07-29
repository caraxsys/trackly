import 'server-only';

import { cookies } from 'next/headers';

import { getInternalApiUrl } from '@/lib/server-environment';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';
import type { ReminderListData } from '@/types/reminder';

export class ReminderServerError extends Error {
  constructor(readonly status: number) {
    super('The reminder request failed.');
    this.name = 'ReminderServerError';
  }
}

export async function getServerReminders(habitId: string) {
  const response = await fetch(
    new URL(
      `/api/v1/habits/${encodeURIComponent(habitId)}/reminders`,
      getInternalApiUrl(),
    ),
    {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        cookie: (await cookies()).toString(),
      },
    },
  );
  const payload = (await response.json()) as
    ApiSuccessResponse<ReminderListData> | ApiErrorResponse;
  if (!response.ok || !payload.success) {
    throw new ReminderServerError(response.status);
  }
  return payload.data;
}
