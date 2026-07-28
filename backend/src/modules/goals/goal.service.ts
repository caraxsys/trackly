import { AppError } from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import type { GoalRepository } from './goal.repository.js';
import type {
  GoalCreateBody,
  GoalListQuery,
  GoalUpdateBody,
} from './goal.schema.js';

const notFound = (message = 'Goal was not found.') =>
  new AppError({ statusCode: 404, code: ErrorCode.NotFound, message });
const invalid = (message: string) =>
  new AppError({
    statusCode: 400,
    code: ErrorCode.ValidationError,
    message,
  });

export function createGoalService(repository: GoalRepository) {
  const validateRange = (startDate: string, endDate: string) => {
    if (endDate < startDate)
      throw invalid('endDate must be on or after startDate.');
  };

  return {
    async list(userId: string, query: GoalListQuery) {
      return repository.listForUser(userId, {
        ...(query.status ? { status: query.status } : {}),
        ...(query.habitId ? { habitId: query.habitId } : {}),
        ...(query.startDate ? { overlapsStartDate: query.startDate } : {}),
        ...(query.endDate ? { overlapsEndDate: query.endDate } : {}),
      });
    },
    async detail(userId: string, id: string) {
      const goal = await repository.findByIdForUser(userId, id);
      if (!goal) throw notFound();
      return goal;
    },
    async create(userId: string, input: GoalCreateBody) {
      validateRange(input.startDate, input.endDate);
      if (!(await repository.verifySelectableHabit(userId, input.habitId)))
        throw notFound('Habit was not found.');
      const created = await repository.create(userId, {
        ...input,
        name: input.name.trim(),
      });
      if (!created) throw new Error('Goal insert did not return a row.');
      return created;
    },
    async update(userId: string, id: string, input: GoalUpdateBody) {
      const current = await repository.findByIdForUser(userId, id);
      if (!current) throw notFound();
      if (
        input.habitId &&
        !(await repository.verifySelectableHabit(userId, input.habitId))
      )
        throw notFound('Habit was not found.');
      validateRange(
        input.startDate ?? current.startDate,
        input.endDate ?? current.endDate,
      );
      const updated = await repository.update(userId, id, {
        ...(input.habitId ? { habitId: input.habitId } : {}),
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.targetCount === undefined
          ? {}
          : { targetCount: input.targetCount }),
        ...(input.startDate ? { startDate: input.startDate } : {}),
        ...(input.endDate ? { endDate: input.endDate } : {}),
        ...(input.status ? { status: input.status } : {}),
      });
      if (!updated) throw notFound();
      return updated;
    },
    async remove(userId: string, id: string) {
      const deleted = await repository.softDelete(userId, id);
      if (!deleted) throw notFound();
      return { id: deleted.id, deleted: true as const };
    },
  };
}

export type GoalService = ReturnType<typeof createGoalService>;
