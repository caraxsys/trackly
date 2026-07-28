import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/components/layout/app-shell';

const testUser = { name: 'Ada Lovelace', email: 'ada@example.com' };

const navigationMocks = vi.hoisted(() => ({
  pathname: '/today',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/auth-client', () => ({
  signOut: vi.fn(),
}));

describe('application shell', () => {
  beforeEach(() => {
    navigationMocks.pathname = '/today';
  });

  it('renders the shell and all expected navigation entries', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <AppShell user={testUser}>
          <p>Page content</p>
        </AppShell>
      </ThemeProvider>,
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();

    for (const label of [
      'Today',
      'Habits',
      'Tasks',
      'Goals',
      'Analytics',
      'Settings',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(await screen.findByRole('combobox', { name: 'Color theme' })).toBe(
      screen.getByLabelText('Color theme'),
    );
    expect(
      screen.getAllByRole('link', { name: 'Settings' })[0],
    ).toHaveAttribute('href', '/settings/preferences');
  });

  it('marks the current navigation entry as active', () => {
    navigationMocks.pathname = '/tasks';

    render(
      <ThemeProvider attribute="class">
        <AppShell user={testUser}>
          <p>Tasks content</p>
        </AppShell>
      </ThemeProvider>,
    );

    for (const link of screen.getAllByRole('link', { name: 'Tasks' })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
  });
});
