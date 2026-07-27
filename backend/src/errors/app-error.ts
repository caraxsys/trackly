import type { ErrorCode } from './error-codes.js';

interface AppErrorOptions {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}
