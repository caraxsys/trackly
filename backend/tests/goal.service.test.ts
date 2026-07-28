import { describe, expect, it, vi } from 'vitest';
import {
  createGoalService,
  deriveGoalProgress,
} from '../src/modules/goals/goal.service.js';

function setup() {
  const goal = {
    id: 'goal-1',
    userId: 'user-1',
    habitId: 'habit-1',
    habitName: 'Walk',
    name: 'Monthly walks',
    targetCount: 20,
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repository = {
    findByIdForUser: vi.fn().mockResolvedValue(goal),
    listForUser: vi.fn().mockResolvedValue([goal]),
    progressForGoals: vi.fn().mockResolvedValue(new Map()),
    verifyHabitOwnership: vi.fn().mockResolvedValue(true),
    verifySelectableHabit: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue(goal),
    update: vi.fn().mockResolvedValue(goal),
    softDelete: vi.fn().mockResolvedValue({ id: goal.id }),
    listActiveForDate: vi.fn(),
  };
  return { service: createGoalService(repository), repository, goal };
}

describe('Goal service', () => {
  it('derives zero, partial, reached, and over-target percentages', () => {
    expect(deriveGoalProgress(0, 10)).toMatchObject({
      remainingCount: 10,
      progressRate: 0,
      isTargetReached: false,
    });
    expect(deriveGoalProgress(5, 10).progressRate).toBe(50);
    expect(deriveGoalProgress(10, 10)).toMatchObject({
      remainingCount: 0,
      progressRate: 100,
      isTargetReached: true,
    });
    expect(deriveGoalProgress(15, 10)).toMatchObject({
      currentCount: 15,
      remainingCount: 0,
      progressRate: 150,
      isTargetReached: true,
    });
  });
  it('creates against a selectable owned Habit', async () => {
    const { service, repository } = setup();
    await service.create('user-1', {
      habitId: '00000000-0000-4000-8000-000000000001',
      name: ' Monthly walks ',
      targetCount: 20,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'active',
    });
    expect(repository.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ name: 'Monthly walks' }),
    );
  });

  it('batches list progress and resolves today in the user timezone', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T18:00:00.000Z'));
    const { repository, goal } = setup();
    const secondGoal = { ...goal, id: 'goal-2', status: 'cancelled' as const };
    repository.listForUser.mockResolvedValueOnce([goal, secondGoal]);
    repository.progressForGoals.mockResolvedValueOnce(
      new Map([
        [goal.id, 7],
        [secondGoal.id, 25],
      ]),
    );
    const preferenceRepository = {
      findTimezone: vi.fn().mockResolvedValue('Asia/Jakarta'),
    };
    const service = createGoalService(repository, preferenceRepository);

    const result = await service.list('user-1', {});

    expect(repository.progressForGoals).toHaveBeenCalledTimes(1);
    expect(repository.progressForGoals).toHaveBeenCalledWith(
      'user-1',
      ['goal-1', 'goal-2'],
      '2026-07-28',
    );
    expect(result[0]?.status).toBe('active');
    expect(result[0]?.progress.currentCount).toBe(7);
    expect(result[1]?.status).toBe('cancelled');
    expect(result[1]?.progress).toMatchObject({
      currentCount: 25,
      isTargetReached: true,
    });
    vi.useRealTimers();
  });

  it('rejects inaccessible Habits and invalid merged update ranges', async () => {
    const { service, repository } = setup();
    repository.verifySelectableHabit.mockResolvedValueOnce(false);
    await expect(
      service.create('user-1', {
        habitId: '00000000-0000-4000-8000-000000000002',
        name: 'Foreign',
        targetCount: 1,
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        status: 'active',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      service.update('user-1', 'goal-1', { startDate: '2026-08-01' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('updates status and soft deletes with safe not-found behavior', async () => {
    const { service, repository } = setup();
    await service.update('user-1', 'goal-1', { status: 'completed' });
    expect(repository.update).toHaveBeenCalledWith('user-1', 'goal-1', {
      status: 'completed',
    });
    await expect(service.remove('user-1', 'goal-1')).resolves.toEqual({
      id: 'goal-1',
      deleted: true,
    });
    repository.findByIdForUser.mockResolvedValueOnce(null);
    await expect(service.detail('other', 'goal-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
