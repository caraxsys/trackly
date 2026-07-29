import 'server-only';

import type { ReminderListData } from '@/types/reminder';
import { requestServerApi, ServerApiError } from './server-api';

export class ReminderServerError extends Error {
  constructor(readonly status: number) {
    super('The reminder request failed.');
    this.name = 'ReminderServerError';
  }
}

export async function getServerReminders(habitId: string) {
  try {
    return await requestServerApi<ReminderListData>(
      `/api/v1/habits/${encodeURIComponent(habitId)}/reminders`,
    );
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new ReminderServerError(error.status);
    }
    throw error;
  }
}
