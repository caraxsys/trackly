import type { FastifyReply, FastifyRequest } from 'fastify';

import { successResponse } from '../http/responses.js';

interface DiagnosticBody {
  value: string;
}

export async function validateDiagnosticRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body as DiagnosticBody;

  return reply.code(200).send(
    successResponse({
      value: body.value,
    }),
  );
}
