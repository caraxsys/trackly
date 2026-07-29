import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AnalyticsError from '@/app/(app)/analytics/error';
import AnalyticsPage from '@/app/(app)/analytics/page';

const mocks = vi.hoisted(() => {
  class MockAnalyticsServerError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
    ) {
      super('Analytics request failed');
    }
  }

  return {
    getServerSession: vi.fn(),
    getServerAnalyticsDashboard: vi.fn(),
    redirect: vi.fn(),
    AnalyticsServerError: MockAnalyticsServerError,
  };
});

vi.mock('@/lib/auth-session', () => ({
  getServerSession: mocks.getServerSession,
}));
vi.mock('@/services/analytics-server-service', () => ({
  getServerAnalyticsDashboard: mocks.getServerAnalyticsDashboard,
  AnalyticsServerError: mocks.AnalyticsServerError,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

describe('Analytics route states', () => {
  it('shows a safe invalid-query response', async () => {
    mocks.getServerSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
      session: { expiresAt: new Date() },
    });
    mocks.getServerAnalyticsDashboard.mockRejectedValueOnce(
      new mocks.AnalyticsServerError(400, 'VALIDATION_ERROR'),
    );

    render(
      await AnalyticsPage({
        searchParams: Promise.resolve({ period: 'year' }),
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'That analytics range is not available',
      }),
    ).toBeVisible();
    expect(screen.queryByText('VALIDATION_ERROR')).not.toBeInTheDocument();
  });

  it('loads 30-day history by default and preserves an explicit period', async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
      session: { expiresAt: new Date() },
    });
    mocks.getServerAnalyticsDashboard.mockResolvedValue({
      summary: {
        period: 'week',
        startDate: '2026-07-27',
        endDate: '2026-08-02',
        scheduledCount: 0,
        completedCount: 0,
        completionRate: 0,
        totalTargetCount: 0,
        totalCompletedCount: 0,
        progressRate: 0,
      },
      history: {
        period: '30d',
        granularity: 'day',
        startDate: '2026-06-29',
        endDate: '2026-07-28',
        summary: {
          averageCompletionRate: 0,
          averageProgressRate: 0,
          scheduledCount: 0,
          completedCount: 0,
          totalTargetCount: 0,
          totalCompletedCount: 0,
        },
        history: [],
      },
      insights: {
        period: '30d',
        startDate: '2026-06-29',
        endDate: '2026-07-28',
        hasActivity: false,
        insights: {
          bestDay: null,
          lowestDay: null,
          mostProductiveWeekday: null,
          consistency: null,
          trend: null,
        },
      },
      heatmap: {
        period: '365d',
        startDate: '2025-07-29',
        endDate: '2026-07-28',
        summary: {
          activeDays: 0,
          completedDays: 0,
          totalScheduledCount: 0,
          totalCompletedCount: 0,
          averageCompletionRate: 0,
        },
        days: [],
      },
      categories: {
        period: '30d',
        startDate: '2026-06-29',
        endDate: '2026-07-28',
        hasActivity: false,
        categories: [],
      },
      habits: {
        period: '30d',
        startDate: '2026-06-29',
        endDate: '2026-07-28',
        hasActivity: false,
        habits: [],
      },
    });

    render(
      await AnalyticsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mocks.getServerAnalyticsDashboard).toHaveBeenCalledWith({
      period: 'week',
      historyPeriod: '30d',
      heatmapPeriod: '365d',
    });
    expect(
      screen.getByRole('navigation', { name: 'Analytics history period' }),
    ).toBeVisible();
  });

  it('shows a retryable error without internal details', () => {
    render(
      <AnalyticsError
        error={new Error('database credentials')}
        reset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Analytics is temporarily unavailable',
      }),
    ).toBeVisible();
    expect(screen.queryByText('database credentials')).not.toBeInTheDocument();
  });
});
