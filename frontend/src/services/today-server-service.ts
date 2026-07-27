import 'server-only';

import { cookies } from 'next/headers';

import { getInternalApiUrl } from '@/lib/server-environment';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';
import type { TodayResponseData } from '@/types/today';

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
  const cookieStore = await cookies();
  const url = new URL('/api/v1/today', getInternalApiUrl());

  if (date) {
    url.searchParams.set('date', date);
  }

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      cookie: cookieStore.toString(),
    },
  });
  const payload = (await response.json()) as
    ApiSuccessResponse<TodayResponseData> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    throw new TodayServerError(
      response.status,
      payload.success ? 'UNKNOWN_ERROR' : payload.error.code,
    );
  }

  return payload.data;
}
