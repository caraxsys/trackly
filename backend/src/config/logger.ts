import pino, { type LoggerOptions } from 'pino';

import { environment } from './environment.js';

export function loggerOptions(): LoggerOptions {
  const baseOptions: LoggerOptions = {
    level: environment.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
        '*.password',
        '*.token',
        '*.secret',
      ],
      censor: '[REDACTED]',
    },
  };

  return environment.NODE_ENV === 'development'
    ? {
        ...baseOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
          },
        },
      }
    : baseOptions;
}

export function createLogger() {
  return pino(loggerOptions());
}

export type AppLogger = ReturnType<typeof createLogger>;
