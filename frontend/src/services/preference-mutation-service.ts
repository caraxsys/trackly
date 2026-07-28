import { httpClient } from '@/services/http-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { PreferenceUpdate, UserPreferences } from '@/types/preference';

export async function updatePreferences(payload: PreferenceUpdate) {
  return (
    await httpClient.patch<ApiSuccessResponse<UserPreferences>>(
      '/api/v1/preferences',
      payload,
    )
  ).data.data;
}
