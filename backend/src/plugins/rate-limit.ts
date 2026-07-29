import rateLimit from '@fastify/rate-limit';
import fastifyPlugin from 'fastify-plugin';

import { environment } from '../config/environment.js';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const rateLimitPlugin = fastifyPlugin(
  async (app) => {
    await app.register(rateLimit, {
      global: true,
      timeWindow: environment.API_RATE_LIMIT_WINDOW_MS,
      max: (request) =>
        mutationMethods.has(request.method)
          ? environment.API_MUTATION_RATE_LIMIT_MAX
          : environment.API_RATE_LIMIT_MAX,
      keyGenerator: (request) =>
        `${request.ip}:${request.method}:${request.routeOptions.url}`,
      allowList: (request) =>
        !request.url.startsWith('/api/v1/') ||
        request.url.startsWith('/api/v1/diagnostics/'),
      errorResponseBuilder: () =>
        new AppError({
          statusCode: 429,
          code: ErrorCode.RateLimitExceeded,
          message: 'Too many requests. Please try again later.',
        }),
    });
  },
  { name: 'rate-limit' },
);
