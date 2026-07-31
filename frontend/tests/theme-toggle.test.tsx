import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { describe, expect, it, vi } from 'vitest';
import { PersistedTheme } from '@/components/preferences/persisted-theme';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import type { UserPreferences } from '@/types/preference';

const mutation = vi.hoisted(() => ({ updatePreferences: vi.fn() }));
vi.mock('@/services/preference-mutation-service', () => mutation);

const preferences: UserPreferences = {
  timezone: 'Asia/Jakarta',
  weekStartsOn: 'monday',
  dateFormat: 'yyyy-MM-dd',
  timeFormat: '24h',
  theme: 'light',
  createdAt: null,
  updatedAt: null,
};

function renderToggle() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      <PersistedTheme theme={preferences.theme}>
        <ThemeToggle />
      </PersistedTheme>
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('applies the server-confirmed theme immediately', async () => {
    mutation.updatePreferences.mockResolvedValueOnce({
      ...preferences,
      theme: 'dark',
    });
    const user = userEvent.setup();
    renderToggle();

    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    await user.selectOptions(screen.getByLabelText('Color theme'), 'dark');

    expect(mutation.updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(screen.getByLabelText('Color theme')).toHaveValue('dark');
  });

  it('retains the persisted theme when saving fails', async () => {
    mutation.updatePreferences.mockRejectedValueOnce(new Error('raw error'));
    const user = userEvent.setup();
    renderToggle();

    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    await user.selectOptions(screen.getByLabelText('Color theme'), 'dark');

    await waitFor(() =>
      expect(
        screen.getByText('Trackly could not save the theme. Please try again.'),
      ).toBeInTheDocument(),
    );
    expect(document.documentElement).toHaveClass('light');
    expect(screen.getByLabelText('Color theme')).toHaveValue('light');
  });
});
