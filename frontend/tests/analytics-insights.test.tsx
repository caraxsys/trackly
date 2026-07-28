import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnalyticsInsights } from '@/components/analytics/analytics-insights';
import type { AnalyticsInsightsData } from '@/types/analytics';

const insights: AnalyticsInsightsData = {
  period: '30d',
  startDate: '2026-06-29',
  endDate: '2026-07-28',
  hasActivity: true,
  insights: {
    bestDay: { date: '2026-07-27', completionRate: 100 },
    lowestDay: { date: '2026-07-20', completionRate: 25 },
    mostProductiveWeekday: {
      weekday: 'monday',
      averageCompletionRate: 85.5,
    },
    consistency: {
      fullyCompletedDays: 8,
      activeDays: 12,
      consistencyRate: 66.67,
    },
    trend: {
      direction: 'up',
      currentAverageCompletionRate: 75,
      previousAverageCompletionRate: 50,
      changePercentagePoints: 25,
    },
  },
};

describe('AnalyticsInsights', () => {
  it('renders primary insights and supporting lowest-day information', () => {
    render(<AnalyticsInsights data={insights} />);

    expect(screen.getByRole('heading', { name: 'Insights' })).toBeVisible();
    expect(screen.getByText('Best Day')).toBeVisible();
    expect(screen.getByText('Strongest Weekday')).toBeVisible();
    expect(screen.getByText('Consistency')).toBeVisible();
    expect(screen.getByText('Recent Trend')).toBeVisible();
    expect(screen.getByText('Trending up')).toBeVisible();
    expect(screen.getByText('66.67%')).toBeVisible();
    expect(screen.getByText(/Lowest day:/)).toHaveTextContent(
      'Lowest day: Jul 20, 2026 at 25.00% completion.',
    );
  });

  it('renders a clear insufficient-data trend state', () => {
    render(
      <AnalyticsInsights
        data={{
          ...insights,
          insights: {
            ...insights.insights,
            trend: {
              direction: 'insufficient-data',
              currentAverageCompletionRate: 50,
              previousAverageCompletionRate: null,
              changePercentagePoints: null,
            },
          },
        }}
      />,
    );

    expect(screen.getByText('More activity needed')).toBeVisible();
    expect(
      screen.getByText(/Both comparison windows need at least one active day/),
    ).toBeVisible();
  });

  it('renders a no-activity state without placeholder insight values', () => {
    render(
      <AnalyticsInsights
        data={{
          ...insights,
          hasActivity: false,
          insights: {
            bestDay: null,
            lowestDay: null,
            mostProductiveWeekday: null,
            consistency: null,
            trend: null,
          },
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'No activity to analyze' }),
    ).toBeVisible();
    expect(screen.queryByText('Best Day')).not.toBeInTheDocument();
  });
});
