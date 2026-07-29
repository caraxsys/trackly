import type { FastifyError, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { ZodError } from 'zod';

import { environment } from '../config/environment.js';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { errorResponse } from '../http/responses.js';

function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

function fastifyValidationDetails(error: FastifyError) {
  return error.validation?.map((issue) => ({
    path:
      issue.instancePath ||
      (typeof issue.params.missingProperty === 'string'
        ? issue.params.missingProperty
        : ''),
    message: issue.message ?? 'Invalid value',
  }));
}

function requestPath(url: string) {
  return url.split('?', 1)[0] ?? '/';
}

const sensitiveValues = [
  environment.BETTER_AUTH_SECRET,
  environment.DATABASE_URL,
  environment.WEB_PUSH_VAPID_PRIVATE_KEY,
].filter((value): value is string => Boolean(value));

function redactText(value: string | undefined) {
  if (!value) return value;
  return sensitiveValues.reduce(
    (result, secret) => result.replaceAll(secret, '[REDACTED]'),
    value,
  );
}

function internalError(error: Error) {
  return {
    name: error.name,
    message: redactText(error.message),
    stack: redactText(error.stack),
  };
}

function errorLogContext(request: FastifyRequest) {
  return { requestId: request.id };
}

export const errorHandlerPlugin = fastifyPlugin(
  (app) => {
    app.setNotFoundHandler((request, reply) => {
      return reply
        .code(404)
        .send(
          errorResponse(
            ErrorCode.NotFound,
            `Route ${request.method} ${requestPath(request.url)} was not found.`,
          ),
        );
    });

    app.setErrorHandler((error: FastifyError | Error, request, reply) => {
      if (error instanceof ZodError) {
        return reply
          .code(400)
          .send(
            errorResponse(
              ErrorCode.ValidationError,
              'Request validation failed.',
              zodDetails(error),
            ),
          );
      }

      if ('validation' in error && error.validation) {
        return reply
          .code(400)
          .send(
            errorResponse(
              ErrorCode.ValidationError,
              'Request validation failed.',
              fastifyValidationDetails(error),
            ),
          );
      }

      if (
        'code' in error &&
        (error.code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
          error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY')
      ) {
        return reply
          .code(400)
          .send(
            errorResponse(
              ErrorCode.InvalidJson,
              'The request body is not valid JSON.',
            ),
          );
      }

      if (error instanceof AppError) {
        if (error.statusCode >= 500) {
          request.log.warn(
            {
              event: 'http.request.error',
              ...errorLogContext(request),
              method: request.method,
              path: requestPath(request.url),
              status: error.statusCode,
              errorCode: error.code,
              error: internalError(error),
              ...(request.authenticatedUserId
                ? { userId: request.authenticatedUserId }
                : {}),
            },
            'Application request failed',
          );
        }

        return reply
          .code(error.statusCode)
          .send(errorResponse(error.code, error.message, error.details));
      }

      request.log.error(
        {
          event: 'http.request.error',
          ...errorLogContext(request),
          method: request.method,
          path: requestPath(request.url),
          status: 500,
          errorCode: ErrorCode.InternalServerError,
          error: internalError(error),
          ...(request.authenticatedUserId
            ? { userId: request.authenticatedUserId }
            : {}),
        },
        'Unexpected request error',
      );
      return reply
        .code(500)
        .send(
          errorResponse(
            ErrorCode.InternalServerError,
            'An unexpected error occurred.',
          ),
        );
    });
  },
  { name: 'error-handler' },
);
