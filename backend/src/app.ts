import Fastify, { type FastifyBaseLogger, LogController } from 'fastify';

import { environment } from './config/environment.js';
import { loggerOptions } from './config/logger.js';
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
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { securityPlugin } from './plugins/security.js';
import { swaggerPlugin } from './plugins/swagger.js';
import { routes } from './routes/index.js';

interface BuildAppOptions {
  connectionCheck?: DatabaseConnectionCheck;
  logger?: boolean | FastifyBaseLogger;
}

class TracklyLogController extends LogController {
  constructor() {
    super({ disableRequestLogging: true });
  }
}

export async function buildApp(options: BuildAppOptions = {}) {
  const connectionCheck = options.connectionCheck ?? verifyDatabaseConnection;
  const commonOptions = {
    genReqId: resolveRequestId,
    logController: new TracklyLogController(),
    trustProxy: environment.TRUST_PROXY,
  };
  const app =
    options.logger === false
      ? Fastify({ ...commonOptions, logger: false })
      : options.logger && typeof options.logger !== 'boolean'
        ? Fastify({ ...commonOptions, loggerInstance: options.logger })
        : Fastify({ ...commonOptions, logger: loggerOptions() });

  await app.register(requestContextPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(corsPlugin);
  await app.register(securityPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);
  await app.register(databasePlugin, { connectionCheck });
  await app.register(authPlugin);
  await app.register(routes, { connectionCheck });

  return app;
}
