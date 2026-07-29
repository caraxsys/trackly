import type { FastifyRequest } from 'fastify';
import { runAuditedOperation } from '../../audit/audit-logger.js';
import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type { PreferenceUpdate } from './preference.schema.js';
import type { PreferenceService } from './preference.service.js';

export function createPreferenceController(service: PreferenceService) {
  return {
    get: async (request: FastifyRequest) =>
      successResponse(await service.get(await requireUserId(request))),
    update: async (request: FastifyRequest<{ Body: PreferenceUpdate }>) => {
      const userId = await requireUserId(request);
      return successResponse(
        await runAuditedOperation(
          request,
          {
            actorId: userId,
            action: 'preference.update',
            resourceType: 'user_preferences',
            resourceId: userId,
          },
          () => service.update(userId, request.body),
        ),
      );
    },
  };
}
