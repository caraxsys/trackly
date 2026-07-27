import cors from '@fastify/cors';
import fastifyPlugin from 'fastify-plugin';

import { environment } from '../config/environment.js';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

export const corsPlugin = fastifyPlugin(
  async (app) => {
    const allowedOrigins = new Set(environment.CORS_ORIGINS);

    await app.register(cors, {
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(
          new AppError({
            statusCode: 403,
            code: ErrorCode.CorsOriginForbidden,
            message: 'The request origin is not allowed.',
          }),
          false,
        );
      },
    });
  },
  { name: 'cors' },
);
