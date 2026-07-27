import Fastify from 'fastify';

import { environment } from './config/environment.js';
import { verifyDatabaseConnection } from './db/index.js';
import { corsPlugin } from './plugins/cors.js';
import { authPlugin } from './plugins/auth.js';
import {
  databasePlugin,
  type DatabaseConnectionCheck,
} from './plugins/database.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import {
  requestContextPlugin,
  resolveRequestId,
} from './plugins/request-context.js';
import { securityPlugin } from './plugins/security.js';
import { swaggerPlugin } from './plugins/swagger.js';
import { routes } from './routes/index.js';

interface BuildAppOptions {
  connectionCheck?: DatabaseConnectionCheck;
  logger?: boolean;
}

function loggerOptions() {
  const baseOptions = {
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

export async function buildApp(options: BuildAppOptions = {}) {
  const connectionCheck = options.connectionCheck ?? verifyDatabaseConnection;
  const app =
    options.logger === false
      ? Fastify({ logger: false, genReqId: resolveRequestId })
      : Fastify({ logger: loggerOptions(), genReqId: resolveRequestId });

  await app.register(requestContextPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(corsPlugin);
  await app.register(securityPlugin);
  await app.register(swaggerPlugin);
  await app.register(databasePlugin, { connectionCheck });
  await app.register(authPlugin);
  await app.register(routes, { connectionCheck });

  return app;
}
