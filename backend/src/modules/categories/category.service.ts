import type { CategoryRepository } from './category.repository.js';

export function createCategoryService(repository: CategoryRepository) {
  return {
    listActive(userId: string) {
      return repository.listActiveByUser(userId);
    },
  };
}

export type CategoryService = ReturnType<typeof createCategoryService>;
