import axios, { AxiosHeaders } from 'axios';

import { publicEnvironment } from '@/lib/env';
import { normalizeApiError } from '@/services/api-error';

export const httpClient = axios.create({
  baseURL: publicEnvironment.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);

  if (!headers.has('x-request-id') && globalThis.crypto?.randomUUID) {
    headers.set('x-request-id', globalThis.crypto.randomUUID());
  }

  config.headers = headers;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
);
