import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsHistory } from '@/components/analytics/analytics-history';
import type { AnalyticsHistoryData } from '@/types/analytics';

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const history: AnalyticsHistoryData = {
  period: '7d',
  granularity: 'day',
  startDate: '2026-07-22',
  endDate: '2026-07-28',
  summary: {
    averageCompletionRate: 42.86,
    averageProgressRate: 57.14,
    scheduledCount: 7,
    completedCount: 3,
    totalTargetCount: 14,
    totalCompletedCount: 8,
  },
  history: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-07-${String(index + 22).padStart(2, '0')}`,
    scheduledCount: 1,
    completedCount: index < 3 ? 1 : 0,
    completionRate: index < 3 ? 100 : 0,
    totalTargetCount: 2,
    totalCompletedCount: index < 4 ? 2 : 0,
    progressRate: index < 4 ? 100 : 0,
  })),
};

describe('AnalyticsHistory', () => {
  it('renders selectors, summary metrics, trend labels, and accessible data', () => {
    render(
      <AnalyticsHistory
        data={history}
        selectedDate="2026-07-28"
        summaryPeriod="week"
      />,
    );

    expect(
      screen.getByRole('navigation', { name: 'Analytics history period' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: '7d' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: '30d' })).toHaveAttribute(
      'href',
      expect.stringContaining('historyPeriod=30d'),
    );
    expect(screen.getByText('42.86%')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Completion Rate' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Progress Rate' }),
    ).toBeVisible();
    expect(
      screen.getByRole('table', { name: 'Daily analytics history' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Jul 22, 2026')).toBeInTheDocument();
  });

  it('shows a no-activity state without hiding historical summary metrics', () => {
    render(
      <AnalyticsHistory
        data={{
          ...history,
          history: history.history.map((point) => ({
            ...point,
            scheduledCount: 0,
            completedCount: 0,
            completionRate: 0,
            totalTargetCount: 0,
            totalCompletedCount: 0,
            progressRate: 0,
          })),
          summary: {
            averageCompletionRate: 0,
            averageProgressRate: 0,
            scheduledCount: 0,
            completedCount: 0,
            totalTargetCount: 0,
            totalCompletedCount: 0,
          },
        }}
        summaryPeriod="week"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'No activity in this period' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Completion Rate' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('0.00%')).toHaveLength(16);
  });
});
