import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HabitControls } from '@/components/habits/habit-controls';
import { HabitDetail } from '@/components/habits/habit-detail';
import { HabitEmptyState } from '@/components/habits/habit-empty-state';
import { HabitList } from '@/components/habits/habit-list';
import type {
  HabitCollectionData,
  HabitDetail as HabitDetailData,
  HabitListItem,
} from '@/types/habit';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const daily: HabitListItem = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Morning water',
  description: 'Drink before coffee',
  frequencyType: 'daily',
  targetCount: 2,
  isActive: true,
  startDate: '2026-07-01',
  endDate: null,
  position: 0,
  category: { id: 'cat', name: 'Health', color: null, icon: null },
  schedule: { weekdays: [] },
  selectedDate: {
    date: '2026-07-27',
    isScheduled: true,
    completedCount: 2,
    isCompleted: true,
  },
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
};

const query: HabitCollectionData['query'] = {
  view: 'today',
  date: '2026-07-27',
  timezone: 'Asia/Jakarta',
  search: '',
  sort: 'position',
  order: 'asc',
};

describe('habit collection UI', () => {
  it('renders list metadata, completion, inactive status, and detail links', () => {
    const inactive = {
      ...daily,
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Weekly reading',
      description: null,
      frequencyType: 'weekly' as const,
      isActive: false,
      category: null,
      schedule: { weekdays: [1, 3, 5] },
      selectedDate: { ...daily.selectedDate, isScheduled: false },
    };
    render(<HabitList items={[daily, inactive]} />);

    expect(screen.getByText('Morning water')).toBeInTheDocument();
    expect(screen.getByText('Drink before coffee')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Every day')).toBeInTheDocument();
    expect(screen.getByText('Mon, Wed, Fri')).toBeInTheDocument();
    expect(screen.getByText('2/2 completed')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View Morning water details' }),
    ).toHaveAttribute('href', `/habits/${daily.id}`);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders accessible URL controls and empty-state variants', () => {
    const { rerender } = render(
      <HabitControls hasExplicitDate query={query} />,
    );
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('searchbox', {
        name: 'Search habits by name or description',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next day' })).toHaveAttribute(
      'href',
      expect.stringContaining('date=2026-07-28'),
    );

    rerender(<HabitEmptyState query={{ ...query, search: 'missing' }} />);
    expect(screen.getByText('No habits match “missing”')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Clear search' }),
    ).toBeInTheDocument();
  });
});

describe('habit detail UI', () => {
  it('renders complete read-only details and safe optional values', () => {
    const { selectedDate, ...baseDetail } = daily;
    const detail: HabitDetailData = {
      ...baseDetail,
      description: null,
      category: null,
      today: selectedDate,
      timezone: 'Asia/Jakarta',
    };
    render(
      <HabitDetail
        habit={detail}
        streak={{
          habitId: detail.id,
          currentStreak: 3,
          longestStreak: 8,
          lastCompletedDate: '2026-07-26',
        }}
        timezone="Asia/Jakarta"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Morning water' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('Longest Streak')).toBeInTheDocument();
    expect(screen.getByText('Sunday, July 26, 2026')).toBeInTheDocument();
    expect(
      screen.getByText('2 / 2 completed — target complete'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/habits/${detail.id}/edit`,
    );
    expect(
      screen.getByRole('button', { name: 'Deactivate' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Decrease Morning water progress',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Increase Morning water progress',
      }),
    ).toBeDisabled();
  });
});
