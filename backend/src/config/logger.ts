import pino, { type DestinationStream, type LoggerOptions } from 'pino';

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
        '*.privateKey',
        '*.endpoint',
        '*.p256dh',
        '*.auth',
        'req.body.endpoint',
        'req.body.keys.p256dh',
        'req.body.keys.auth',
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

export function createLogger(destination?: DestinationStream) {
  return pino(loggerOptions(), destination);
}

export type AppLogger = ReturnType<typeof createLogger>;
