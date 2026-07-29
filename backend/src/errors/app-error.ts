import type { ErrorCode } from './error-codes.js';
import { toJsonValue, type JsonValue } from '../http/json-value.js';

interface AppErrorOptions {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: JsonValue;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: JsonValue | undefined;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = toJsonValue(options.details);
  }
}
