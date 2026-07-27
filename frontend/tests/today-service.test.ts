import { beforeEach, describe, expect, it, vi } from 'vitest';

import { todayService } from '@/services/today-service';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/services/http-client', () => ({
  httpClient: { get: mocks.get },
}));

describe('Today API service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests the authenticated Today endpoint with an optional date', async () => {
    const response = {
      success: true as const,
      data: {
        date: '2026-07-27',
        timezone: 'UTC',
        habits: [],
        tasks: { overdue: [], dueToday: [], completedToday: [] },
        goals: [],
        summary: {
          habitsTotal: 0,
          habitsCompleted: 0,
          tasksDueToday: 0,
          tasksCompletedToday: 0,
          overdueTasks: 0,
          activeGoals: 0,
          completedItems: 0,
          totalItems: 0,
          completionPercentage: 0,
        },
      },
    };
    mocks.get.mockResolvedValue({ data: response });

    await expect(todayService.getToday('2026-07-27')).resolves.toEqual(
      response,
    );
    expect(mocks.get).toHaveBeenCalledWith('/api/v1/today', {
      params: { date: '2026-07-27' },
    });
  });
});
