import type { FastifyRequest } from 'fastify';

import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

export type AuditOutcome = 'failure' | 'success';

export interface AuditEvent {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
}

function failureCode(error: unknown) {
  return error instanceof AppError ? error.code : ErrorCode.InternalServerError;
}

export function writeAuditEvent(
  request: FastifyRequest,
  event: AuditEvent,
  outcome: AuditOutcome,
  errorCode?: string,
) {
  request.log.info(
    {
      event: 'audit.event',
      audit: {
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType,
        ...(event.resourceId ? { resourceId: event.resourceId } : {}),
        timestamp: new Date().toISOString(),
        outcome,
        requestId: request.id,
        ...(errorCode ? { errorCode } : {}),
      },
    },
    'Audit event',
  );
}

export async function runAuditedOperation<TResult>(
  request: FastifyRequest,
  event: AuditEvent,
  operation: () => Promise<TResult>,
  resourceIdFromResult?: (result: TResult) => string | undefined,
) {
  try {
    const result = await operation();
    const resourceId = resourceIdFromResult?.(result) ?? event.resourceId;
    writeAuditEvent(
      request,
      resourceId ? { ...event, resourceId } : event,
      'success',
    );
    return result;
  } catch (error) {
    writeAuditEvent(request, event, 'failure', failureCode(error));
    throw error;
  }
}
