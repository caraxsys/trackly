import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TodayError from '@/app/(app)/today/error';
import TodayLoading from '@/app/(app)/today/loading';
import TodayPage from '@/app/(app)/today/page';

const mocks = vi.hoisted(() => {
  class MockTodayServerError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
    ) {
      super('Today request failed');
    }
  }

  return {
    getServerSession: vi.fn(),
    getServerToday: vi.fn(),
    redirect: vi.fn(),
    TodayServerError: MockTodayServerError,
  };
});

vi.mock('@/lib/auth-session', () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock('@/services/today-server-service', () => ({
  getServerToday: mocks.getServerToday,
  TodayServerError: mocks.TodayServerError,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

describe('Today route states', () => {
  it('renders the dashboard-specific loading skeleton', () => {
    render(<TodayLoading />);
    expect(
      screen.getByRole('status', { name: 'Loading Today dashboard' }),
    ).toBeVisible();
  });

  it('renders a friendly invalid-date state', async () => {
    mocks.getServerSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
      session: { expiresAt: new Date() },
    });
    mocks.getServerToday.mockRejectedValueOnce(
      new mocks.TodayServerError(400, 'VALIDATION_ERROR'),
    );

    render(
      await TodayPage({
        searchParams: Promise.resolve({ date: '2026-02-30' }),
      }),
    );

    expect(
      screen.getByRole('heading', { name: 'That date is not available' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Return to today' }),
    ).toHaveAttribute('href', '/today');
  });

  it('renders a retryable route error without internal details', () => {
    render(
      <TodayError
        error={new Error('database connection string')}
        reset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Today is temporarily unavailable' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
    expect(
      screen.queryByText('database connection string'),
    ).not.toBeInTheDocument();
  });
});
