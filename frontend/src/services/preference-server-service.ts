import 'server-only';
import { cookies } from 'next/headers';
import { getInternalApiUrl } from '@/lib/server-environment';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';
import type { UserPreferences } from '@/types/preference';

export class PreferenceServerError extends Error {
  constructor(readonly status: number) {
    super('The preference request failed.');
  }
}

export async function getServerPreferences() {
  const response = await fetch(
    new URL('/api/v1/preferences', getInternalApiUrl()),
    {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        cookie: (await cookies()).toString(),
      },
    },
  );
  const payload = (await response.json()) as
    ApiSuccessResponse<UserPreferences> | ApiErrorResponse;
  if (!response.ok || !payload.success)
    throw new PreferenceServerError(response.status);
  return payload.data;
}
