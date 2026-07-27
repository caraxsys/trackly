import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { createCategoryController } from './category.controller.js';
import { createCategoryRepository } from './category.repository.js';
import { createCategoryService } from './category.service.js';

const categoryService = createCategoryService(
  createCategoryRepository(database),
);

export function categoryRoutes(app: FastifyInstance) {
  app.get(
    '/categories',
    {
      schema: {
        tags: ['categories'],
        summary: "List the authenticated user's active categories",
        response: {
          200: successResponseJsonSchema({
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'name', 'color', 'icon'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                color: { type: ['string', 'null'] },
                icon: { type: ['string', 'null'] },
              },
            },
          }),
          401: errorResponseJsonSchema,
        },
      },
    },
    createCategoryController(categoryService),
  );
}
