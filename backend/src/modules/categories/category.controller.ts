import type { FastifyRequest } from 'fastify';

import { requireUserId } from '../../auth/session.js';
import { successResponse } from '../../http/responses.js';
import type { CategoryService } from './category.service.js';

export function createCategoryController(service: CategoryService) {
  return async function listCategories(request: FastifyRequest) {
    const userId = await requireUserId(request);
    return successResponse(await service.listActive(userId));
  };
}
