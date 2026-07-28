import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AnalyticsError from '@/app/(app)/analytics/error';
import AnalyticsLoading from '@/app/(app)/analytics/loading';
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
    getServerAnalyticsSummary: vi.fn(),
    redirect: vi.fn(),
    AnalyticsServerError: MockAnalyticsServerError,
  };
});

vi.mock('@/lib/auth-session', () => ({
  getServerSession: mocks.getServerSession,
}));
vi.mock('@/services/analytics-server-service', () => ({
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

  it('announces the dashboard loading state', () => {
    render(<AnalyticsLoading />);

    expect(
      screen.getByLabelText('Loading analytics dashboard'),
    ).toBeInTheDocument();
  });
});
