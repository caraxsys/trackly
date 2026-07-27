import { httpClient } from '@/services/http-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { TodayResponseData } from '@/types/today';

export const todayService = {
  async getToday(date?: string) {
    const response = await httpClient.get<
      ApiSuccessResponse<TodayResponseData>
    >('/api/v1/today', {
      params: date ? { date } : undefined,
    });
    return response.data;
  },
};
