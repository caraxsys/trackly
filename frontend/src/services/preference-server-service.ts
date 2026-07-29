import 'server-only';
import type { UserPreferences } from '@/types/preference';
import { requestServerApi, ServerApiError } from './server-api';

export class PreferenceServerError extends Error {
  constructor(readonly status: number) {
    super('The preference request failed.');
  }
}

export async function getServerPreferences() {
  try {
    return await requestServerApi<UserPreferences>('/api/v1/preferences');
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new PreferenceServerError(error.status);
    }
    throw error;
  }
}
