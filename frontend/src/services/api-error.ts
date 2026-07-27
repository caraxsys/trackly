import axios from 'axios';
import { z } from 'zod';

const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

interface ApiErrorOptions {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
  requestId?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

function responseRequestId(headers: unknown) {
  const result = z
    .object({ 'x-request-id': z.string().optional() })
    .safeParse(headers);

  return result.success ? result.data['x-request-id'] : undefined;
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const parsed = apiErrorResponseSchema.safeParse(error.response?.data);
    const requestId = responseRequestId(error.response?.headers);

    if (parsed.success) {
      return new ApiError({
        code: parsed.data.error.code,
        message: parsed.data.error.message,
        status: error.response?.status,
        details: parsed.data.error.details,
        requestId,
        cause: error,
      });
    }

    return new ApiError({
      code: error.response ? 'API_REQUEST_FAILED' : 'NETWORK_ERROR',
      message: error.response
        ? 'The request could not be completed.'
        : 'The API could not be reached.',
      status: error.response?.status,
      requestId,
      cause: error,
    });
  }

  return new ApiError({
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected client error occurred.',
    cause: error,
  });
}
