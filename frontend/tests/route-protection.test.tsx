import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ApplicationLayout from '@/app/(app)/layout';
import AuthenticationLayout from '@/app/(auth)/layout';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
}));

vi.mock('@/lib/auth-session', () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

describe('server-side route protection', () => {
  it('redirects guests away from protected application routes', async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);

    await expect(
      ApplicationLayout({ children: <p>Protected content</p> }),
    ).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects authenticated users away from guest-only routes', async () => {
    mocks.getServerSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
      session: { expiresAt: new Date() },
    });

    await expect(
      AuthenticationLayout({ children: <p>Login form</p> }),
    ).rejects.toThrow('REDIRECT:/today');
  });

  it('keeps authentication pages outside the application navigation shell', async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);
    render(
      await AuthenticationLayout({ children: <p>Authentication content</p> }),
    );

    expect(screen.getByText('Authentication content')).toBeVisible();
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument();
  });
});
