import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TodayDashboard } from '@/components/today/today-dashboard';
import type { TodayResponseData } from '@/types/today';

const emptyData: TodayResponseData = {
  date: '2026-07-27',
  timezone: 'Asia/Jakarta',
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
};

const populatedData: TodayResponseData = {
  date: '2026-07-27',
  timezone: 'Asia/Jakarta',
  habits: [
    {
      id: 'habit-1',
      name: 'Read twenty pages',
      description: 'Continue the current book',
      category: { id: 'category-1', name: 'Learning', color: null, icon: null },
      frequencyType: 'daily',
      targetCount: 2,
      completedCount: 2,
      isCompleted: true,
      position: 0,
    },
    {
      id: 'habit-2',
      name: 'Walk',
      description: null,
      category: null,
      frequencyType: 'daily',
      targetCount: 1,
      completedCount: 0,
      isCompleted: false,
      position: 1,
    },
  ],
  tasks: {
    overdue: [
      {
        id: 'task-overdue',
        title: 'Submit report',
        description: null,
        status: 'todo',
        priority: 'high',
        dueAt: '2026-07-26T12:00:00.000Z',
        completedAt: null,
        category: null,
        position: 0,
      },
    ],
    dueToday: [
      {
        id: 'task-due',
        title: 'Review notes',
        description: null,
        status: 'in_progress',
        priority: 'medium',
        dueAt: '2026-07-26T17:30:00.000Z',
        completedAt: null,
        category: null,
        position: 0,
      },
    ],
    completedToday: [
      {
        id: 'task-complete',
        title: 'Morning planning',
        description: null,
        status: 'completed',
        priority: 'low',
        dueAt: null,
        completedAt: '2026-07-27T01:00:00.000Z',
        category: null,
        position: 0,
      },
    ],
  },
  goals: [
    {
      id: 'goal-progress',
      title: 'Ship project',
      description: null,
      status: 'active',
      startDate: null,
      targetDate: '2026-08-31',
      coverImageUrl: null,
      position: 0,
      category: null,
      totalSteps: 4,
      completedSteps: 2,
      progressPercentage: 50,
    },
    {
      id: 'goal-zero',
      title: 'Learn piano',
      description: null,
      status: 'active',
      startDate: null,
      targetDate: null,
      coverImageUrl: null,
      position: 1,
      category: null,
      totalSteps: 0,
      completedSteps: 0,
      progressPercentage: 0,
    },
  ],
  summary: {
    habitsTotal: 2,
    habitsCompleted: 1,
    tasksDueToday: 1,
    tasksCompletedToday: 1,
    overdueTasks: 1,
    activeGoals: 2,
    completedItems: 2,
    totalItems: 5,
    completionPercentage: 40,
  },
};

describe('Today dashboard', () => {
  it('renders a cohesive empty dashboard', () => {
    render(
      <TodayDashboard
        data={emptyData}
        hasExplicitDate={false}
        now={new Date('2026-07-27T01:00:00Z')}
        userName="Ada Lovelace"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Good morning, Ada' }),
    ).toBeVisible();
    expect(screen.getByText('Monday, July 27, 2026')).toBeVisible();
    expect(screen.getByText('Nothing scheduled yet')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Your day is clear' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Habits' })).toHaveAttribute(
      'href',
      '/habits',
    );
  });

  it('renders populated progress, habits, task groups, and goals', () => {
    render(
      <TodayDashboard
        data={populatedData}
        hasExplicitDate
        now={new Date('2026-07-27T05:00:00Z')}
        userName="Ada Lovelace"
      />,
    );

    expect(screen.getByText('40%')).toBeVisible();
    expect(screen.getByText('2 of 5 items completed')).toBeVisible();
    expect(screen.getByText('Read twenty pages')).toBeVisible();
    expect(screen.getByText('2/2')).toBeVisible();
    expect(screen.getByText('Submit report')).toBeVisible();
    expect(screen.getByText('High priority')).toBeVisible();
    expect(screen.getByText('Review notes')).toBeVisible();
    expect(screen.getByText('Due 12:30 AM')).toBeVisible();
    expect(screen.getByText('Morning planning')).toBeVisible();
    expect(screen.getByText('Ship project')).toBeVisible();
    expect(
      screen.getByRole('progressbar', { name: 'Ship project: 50% complete' }),
    ).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('No steps defined yet.')).toBeVisible();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('renders shareable date navigation without mutation controls', () => {
    render(
      <TodayDashboard
        data={populatedData}
        hasExplicitDate
        now={new Date('2026-07-27T05:00:00Z')}
        userName="Ada"
      />,
    );

    expect(screen.getByText('Viewing another date')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Previous day' })).toHaveAttribute(
      'href',
      '/today?date=2026-07-26',
    );
    expect(screen.getByRole('link', { name: 'Next day' })).toHaveAttribute(
      'href',
      '/today?date=2026-07-28',
    );
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute(
      'href',
      '/today',
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add|complete|delete/i }),
    ).not.toBeInTheDocument();
  });
});
