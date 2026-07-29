import 'server-only';

import { getInternalApiUrl } from '@/lib/server-environment';
import type { TodayResponseData } from '@/types/today';
import { requestServerApi, ServerApiError } from './server-api';

export class TodayServerError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super('The Today dashboard request failed.');
    this.name = 'TodayServerError';
  }
}

export async function getServerToday(date?: string) {
  const url = new URL('/api/v1/today', getInternalApiUrl());

  if (date) {
    url.searchParams.set('date', date);
  }

  try {
    return await requestServerApi<TodayResponseData>(url);
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new TodayServerError(error.status, error.code);
    }
    throw error;
  }
}
