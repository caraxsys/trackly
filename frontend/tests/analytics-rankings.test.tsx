import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnalyticsRankings } from '@/components/analytics/analytics-rankings';

describe('AnalyticsRankings', () => {
  it('renders ranked category and habit metrics accessibly', () => {
    render(
      <AnalyticsRankings
        categories={{
          period: '30d',
          startDate: '2026-07-01',
          endDate: '2026-07-30',
          hasActivity: true,
          categories: [
            {
              categoryId: 'c',
              name: 'Health',
              scheduledCount: 10,
              completedCount: 8,
              completionRate: 80,
              totalTargetCount: 20,
              totalCompletedCount: 15,
              progressRate: 75,
              activeHabitCount: 2,
            },
          ],
        }}
        habits={{
          period: '30d',
          startDate: '2026-07-01',
          endDate: '2026-07-30',
          hasActivity: true,
          habits: [
            {
              habitId: 'h',
              name: 'Walk',
              category: { categoryId: 'c', name: 'Health' },
              scheduledCount: 10,
              completedCount: 8,
              completionRate: 80,
              totalTargetCount: 10,
              totalCompletedCount: 8,
              progressRate: 80,
              currentStreak: 3,
              longestStreak: 7,
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Category Performance' }),
    ).toBeVisible();
    expect(
      screen.getByRole('img', { name: 'Health completion 80.00%' }),
    ).toBeVisible();
    expect(screen.getByText('Walk')).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getByText('7')).toBeVisible();
  });

  it('renders the no-activity state', () => {
    const base = {
      period: '30d' as const,
      startDate: '2026-07-01',
      endDate: '2026-07-30',
      hasActivity: false,
    };
    render(
      <AnalyticsRankings
        categories={{ ...base, categories: [] }}
        habits={{ ...base, habits: [] }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'No ranked activity yet' }),
    ).toBeVisible();
  });
});
