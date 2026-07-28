import type { FastifyRequest } from 'fastify';
import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type { PreferenceUpdate } from './preference.schema.js';
import type { PreferenceService } from './preference.service.js';

export function createPreferenceController(service: PreferenceService) {
  return {
    get: async (request: FastifyRequest) =>
      successResponse(await service.get(await requireUserId(request))),
    update: async (request: FastifyRequest<{ Body: PreferenceUpdate }>) =>
      successResponse(
        await service.update(await requireUserId(request), request.body),
      ),
  };
}
