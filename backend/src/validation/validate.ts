import type { FastifyRequest, preValidationHookHandler } from 'fastify';
import type { ZodType } from 'zod';

interface RequestSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

function assignValidatedValue(
  request: FastifyRequest,
  key: keyof RequestSchemas,
  schema: ZodType | undefined,
) {
  if (schema) {
    request[key] = schema.parse(request[key]);
  }
}

export function validateRequest(
  schemas: RequestSchemas,
): preValidationHookHandler {
  return (request, _reply, done) => {
    try {
      assignValidatedValue(request, 'params', schemas.params);
      assignValidatedValue(request, 'query', schemas.query);
      assignValidatedValue(request, 'body', schemas.body);
      done();
    } catch (error) {
      done(error as Error);
    }
  };
}
