import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnalyticsHeatmap } from '@/components/analytics/analytics-heatmap';
import type { AnalyticsHeatmapData } from '@/types/analytics';

const data: AnalyticsHeatmapData = {
  period: '90d',
  startDate: '2026-07-27',
  endDate: '2026-07-28',
  summary: {
    activeDays: 1,
    completedDays: 1,
    totalScheduledCount: 2,
    totalCompletedCount: 2,
    averageCompletionRate: 100,
  },
  days: [
    {
      date: '2026-07-27',
      scheduledCount: 0,
      completedCount: 0,
      completionRate: 0,
      level: 0,
    },
    {
      date: '2026-07-28',
      scheduledCount: 2,
      completedCount: 2,
      completionRate: 100,
      level: 4,
    },
  ],
};

describe('AnalyticsHeatmap', () => {
  it('renders active selection, preserved URL state, and accessible day details', () => {
    render(
      <AnalyticsHeatmap
        data={data}
        historyPeriod="30d"
        selectedDate="2026-07-28"
        summaryPeriod="week"
      />,
    );

    expect(screen.getByRole('link', { name: '90D' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: '1Y' })).toHaveAttribute(
      'href',
      expect.stringContaining('historyPeriod=30d'),
    );
    expect(
      screen.getByLabelText(/Jul 27, 2026: no scheduled habits/),
    ).toHaveAttribute('tabindex', '0');
    expect(screen.getByLabelText(/2 of 2 completed, 100.00%/)).toBeVisible();
  });

  it('shows an explicit no-activity state', () => {
    render(
      <AnalyticsHeatmap
        data={{
          ...data,
          summary: {
            activeDays: 0,
            completedDays: 0,
            totalScheduledCount: 0,
            totalCompletedCount: 0,
            averageCompletionRate: 0,
          },
        }}
        historyPeriod="7d"
        summaryPeriod="day"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'No heatmap activity yet' }),
    ).toBeVisible();
  });
});
