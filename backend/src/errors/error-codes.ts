export const ErrorCode = {
  ApplicationError: 'APPLICATION_ERROR',
  Conflict: 'CONFLICT',
  CorsOriginForbidden: 'CORS_ORIGIN_FORBIDDEN',
  InternalServerError: 'INTERNAL_SERVER_ERROR',
  InvalidJson: 'INVALID_JSON',
  NotFound: 'NOT_FOUND',
  RateLimitExceeded: 'RATE_LIMIT_EXCEEDED',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  Unauthorized: 'UNAUTHORIZED',
  ValidationError: 'VALIDATION_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
