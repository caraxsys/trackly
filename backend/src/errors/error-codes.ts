export const ErrorCode = {
  ApplicationError: 'APPLICATION_ERROR',
  CorsOriginForbidden: 'CORS_ORIGIN_FORBIDDEN',
  InternalServerError: 'INTERNAL_SERVER_ERROR',
  InvalidJson: 'INVALID_JSON',
  NotFound: 'NOT_FOUND',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  Unauthorized: 'UNAUTHORIZED',
  ValidationError: 'VALIDATION_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
