import { httpClient } from '@/services/http-client';
import type { ApiSuccessResponse } from '@/types/api';

export interface SystemStatus {
  status: 'healthy' | 'ready';
  service: 'trackly-api';
  timestamp: string;
}

export const systemService = {
  async health() {
    const response =
      await httpClient.get<ApiSuccessResponse<SystemStatus>>('/health');
    return response.data;
  },

  async readiness() {
    const response =
      await httpClient.get<ApiSuccessResponse<SystemStatus>>('/ready');
    return response.data;
  },
};
