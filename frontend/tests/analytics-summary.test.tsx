import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnalyticsSummary } from '@/components/analytics/analytics-summary';
import type { AnalyticsSummaryData } from '@/types/analytics';

const summary: AnalyticsSummaryData = {
  period: 'week',
  startDate: '2026-07-27',
  endDate: '2026-08-02',
  scheduledCount: 18,
  completedCount: 12,
  completionRate: 66.67,
  totalTargetCount: 43,
  totalCompletedCount: 35,
  progressRate: 81.4,
};

describe('AnalyticsSummary', () => {
  it('renders semantic summary cards, percentages, range, and controls', () => {
    render(<AnalyticsSummary data={summary} selectedDate="2026-07-29" />);

    expect(
      screen.getByRole('navigation', { name: 'Analytics period' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'week' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByLabelText('Selected date')).toHaveValue('2026-07-29');
    expect(
      screen.getByRole('heading', { name: 'Jul 27, 2026 – Aug 2, 2026' }),
    ).toBeVisible();
    expect(screen.getAllByText('66.67%')).toHaveLength(2);
    expect(screen.getByText('81.40%')).toBeVisible();
    expect(
      screen.getByRole('progressbar', { name: 'Completion Rate: 66.67%' }),
    ).toHaveAttribute('aria-valuenow', '66.67');
    expect(
      screen.getByRole('progressbar', { name: 'Progress Rate: 81.40%' }),
    ).toHaveAttribute('aria-valuenow', '81.4');
    expect(
      screen.getByRole('heading', { name: 'Detail metrics' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Momentum is building' }),
    ).toBeVisible();
    expect(screen.getByText('Remaining progress')).toBeVisible();

    for (const label of [
      'Scheduled',
      'Completed',
      'Completion Rate',
      'Progress Rate',
    ]) {
      expect(screen.getAllByText(label)[0]).toBeVisible();
    }
  });

  it('renders a clear empty state while retaining zero summary values', () => {
    render(
      <AnalyticsSummary
        data={{
          ...summary,
          scheduledCount: 0,
          completedCount: 0,
          completionRate: 0,
          totalTargetCount: 0,
          totalCompletedCount: 0,
          progressRate: 0,
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'No scheduled occurrences' }),
    ).toBeVisible();
    expect(screen.getAllByText('0.00%')).toHaveLength(3);
    expect(
      screen.getByRole('heading', { name: 'Start with one occurrence' }),
    ).toBeVisible();
  });
});
