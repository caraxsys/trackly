import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoalCard } from '@/components/goals/goal-card';
import {
  getGoalDateState,
  groupPriorityGoals,
  sortGoals,
  summarizeGoals,
} from '@/features/goals/goal-dashboard';
import type { Goal, GoalStatus } from '@/types/goal';

function goal(
  id: string,
  progressRate: number,
  options: {
    currentCount?: number;
    endDate?: string;
    startDate?: string;
    status?: GoalStatus;
    updatedAt?: string;
  } = {},
): Goal {
  const targetCount = 100;
  const currentCount = options.currentCount ?? progressRate;
  return {
    id,
    userId: 'user-1',
    habitId: `habit-${id}`,
    habitName: 'Daily walk',
    name: `Goal ${id}`,
    targetCount,
    startDate: options.startDate ?? '2026-07-01',
    endDate: options.endDate ?? '2026-08-31',
    status: options.status ?? 'active',
    createdAt: `2026-07-${id.padStart(2, '0')}T00:00:00.000Z`,
    updatedAt: options.updatedAt ?? '2026-07-01T00:00:00.000Z',
    progress: {
      currentCount,
      targetCount,
      remainingCount: Math.max(targetCount - currentCount, 0),
      progressRate,
      isTargetReached: currentCount >= targetCount,
    },
  };
}

describe('Goal dashboard selectors', () => {
  it('summarizes statuses, reached Goals, and uncapped active averages', () => {
    expect(
      summarizeGoals([
        goal('1', 50),
        goal('2', 150, { currentCount: 150 }),
        goal('3', 100, { status: 'completed' }),
        goal('4', 10, { status: 'cancelled' }),
      ]),
    ).toEqual({
      totalGoals: 4,
      activeGoals: 2,
      completedGoals: 1,
      cancelledGoals: 1,
      reachedGoals: 2,
      averageActiveProgressRate: 100,
    });
    expect(summarizeGoals([]).averageActiveProgressRate).toBe(0);
  });

  it('selects and deterministically orders priority groups', () => {
    const goals = [
      goal('1', 75, { endDate: '2026-08-10' }),
      goal('2', 90, { endDate: '2026-08-05' }),
      goal('3', 60, { endDate: '2026-08-04' }),
      goal('4', 100, {
        currentCount: 100,
        endDate: '2026-08-03',
        updatedAt: '2026-08-02T00:00:00.000Z',
      }),
      goal('5', 140, {
        currentCount: 140,
        updatedAt: '2026-08-03T00:00:00.000Z',
      }),
      goal('6', 99, { endDate: '2026-07-31' }),
      goal('7', 95, { endDate: '2026-08-08', status: 'completed' }),
      goal('8', 65, { endDate: '2026-08-08' }),
    ];

    const groups = groupPriorityGoals(goals, '2026-08-01');

    expect(groups.almostThere.map(({ id }) => id)).toEqual(['6', '2', '1']);
    expect(groups.endingSoon.map(({ id }) => id)).toEqual(['3', '2', '8']);
    expect(groups.reached.map(({ id }) => id)).toEqual(['5', '4']);
    expect(groups.overTarget.map(({ id }) => id)).toEqual(['5']);
  });

  it('supports stable collection sorting', () => {
    const goals = [
      goal('1', 20, { endDate: '2026-08-10' }),
      goal('2', 80, { endDate: '2026-08-05' }),
    ];
    expect(sortGoals(goals, 'highest-progress')[0]?.id).toBe('2');
    expect(sortGoals(goals, 'nearest-deadline')[0]?.id).toBe('2');
    expect(sortGoals(goals, 'default')).toEqual(goals);
  });
});

describe('GoalCard', () => {
  it('renders future and expired states with accessible progress and actions', () => {
    const { rerender } = render(
      <GoalCard
        goal={goal('1', 0, { startDate: '2026-08-02' })}
        localToday="2026-08-01"
      />,
    );
    expect(screen.getByText('Not started')).toBeVisible();
    expect(screen.getByLabelText('Goal 1 progress: 0 of 100')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'View Goal 1 Goal details' }),
    ).toHaveAttribute('href', '/goals/1');

    rerender(
      <GoalCard
        goal={goal('1', 50, { endDate: '2026-07-31' })}
        localToday="2026-08-01"
      />,
    );
    expect(screen.getByText('Expired')).toBeVisible();
    expect(getGoalDateState(goal('1', 50), '2026-08-01')).toBe('active');
  });

  it('renders the inclusive seven-day deadline state and over-target text', () => {
    render(
      <GoalCard
        goal={goal('2', 120, {
          currentCount: 120,
          endDate: '2026-08-08',
        })}
        localToday="2026-08-01"
      />,
    );
    expect(screen.getByText('Over target')).toBeVisible();
    expect(screen.getByText('7 days remaining')).toBeVisible();
  });
});
