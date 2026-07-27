import type { FastifyReply, FastifyRequest } from 'fastify';

import type { DatabaseConnectionCheck } from '../plugins/database.js';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { successResponse } from '../http/responses.js';

export async function getHealth(_request: FastifyRequest, reply: FastifyReply) {
  return reply.code(200).send(
    successResponse({
      status: 'healthy' as const,
      service: 'trackly-api' as const,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function createGetReadiness(connectionCheck: DatabaseConnectionCheck) {
  return async function getReadiness(
    _request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      await connectionCheck();
    } catch (error) {
      throw new AppError({
        statusCode: 503,
        code: ErrorCode.ServiceUnavailable,
        message: 'The service is not ready.',
        cause: error,
      });
    }

    return reply.code(200).send(
      successResponse({
        status: 'ready' as const,
        service: 'trackly-api' as const,
        timestamp: new Date().toISOString(),
      }),
    );
  };
}
