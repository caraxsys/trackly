import { describe, expect, it, vi } from 'vitest';
import { createGoalService } from '../src/modules/goals/goal.service.js';

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
