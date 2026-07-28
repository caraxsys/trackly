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
    getServerAnalyticsHistory: vi.fn(),
    getServerAnalyticsInsights: vi.fn(),
    getServerAnalyticsSummary: vi.fn(),
    redirect: vi.fn(),
    AnalyticsServerError: MockAnalyticsServerError,
  };
});

vi.mock('@/lib/auth-session', () => ({
  getServerSession: mocks.getServerSession,
}));
vi.mock('@/services/analytics-server-service', () => ({
  getServerAnalyticsHistory: mocks.getServerAnalyticsHistory,
  getServerAnalyticsInsights: mocks.getServerAnalyticsInsights,
  getServerAnalyticsSummary: mocks.getServerAnalyticsSummary,
  AnalyticsServerError: mocks.AnalyticsServerError,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

describe('Analytics route states', () => {
  it('shows a safe invalid-query response', async () => {
    mocks.getServerSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
      session: { expiresAt: new Date() },
    });
    mocks.getServerAnalyticsSummary.mockRejectedValueOnce(
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
    mocks.getServerAnalyticsSummary.mockResolvedValue({
      period: 'week',
      startDate: '2026-07-27',
      endDate: '2026-08-02',
      scheduledCount: 0,
      completedCount: 0,
      completionRate: 0,
      totalTargetCount: 0,
      totalCompletedCount: 0,
      progressRate: 0,
    });
    mocks.getServerAnalyticsHistory.mockResolvedValue({
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
    });
    mocks.getServerAnalyticsInsights.mockResolvedValue({
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
    });

    render(
      await AnalyticsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(mocks.getServerAnalyticsHistory).toHaveBeenCalledWith('30d');
    expect(mocks.getServerAnalyticsInsights).toHaveBeenCalledWith('30d');
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
