import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { describe, expect, it, vi } from 'vitest';
import { PreferenceForm } from '@/components/preferences/preference-form';
import { preferencePreview } from '@/lib/preference-format';
import type { UserPreferences } from '@/types/preference';

const mutation = vi.hoisted(() => ({ updatePreferences: vi.fn() }));
vi.mock('@/services/preference-mutation-service', () => mutation);

const preferences: UserPreferences = {
  timezone: 'Asia/Jakarta',
  weekStartsOn: 'monday',
  dateFormat: 'yyyy-MM-dd',
  timeFormat: '24h',
  theme: 'system',
  createdAt: null,
  updatedAt: null,
};

function renderForm() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      <PreferenceForm initialPreferences={preferences} />
    </ThemeProvider>,
  );
}

describe('PreferenceForm', () => {
  it('initializes resolved preferences and renders an accessible preview', () => {
    renderForm();
    expect(screen.getByLabelText('Timezone')).toHaveValue('Asia/Jakarta');
    expect(screen.getByLabelText('Week starts on')).toHaveValue('monday');
    expect(screen.getByLabelText('Date format')).toHaveValue('yyyy-MM-dd');
    expect(screen.getByLabelText('Time format')).toHaveValue('24h');
    expect(screen.getByLabelText('Theme')).toHaveValue('system');
    expect(screen.getByText('2026-07-14')).toBeVisible();
    expect(screen.getByText('13:45')).toBeVisible();
  });

  it('saves canonical values once and announces success', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((value: UserPreferences) => void) | undefined;
    mutation.updatePreferences.mockReturnValueOnce(
      new Promise<UserPreferences>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderForm();
    await user.selectOptions(screen.getByLabelText('Theme'), 'dark');
    await user.selectOptions(screen.getByLabelText('Time format'), '12h');
    const save = screen.getByRole('button', { name: 'Save preferences' });
    await user.click(save);
    expect(save).toBeDisabled();
    expect(mutation.updatePreferences).toHaveBeenCalledTimes(1);
    expect(mutation.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'Asia/Jakarta',
        theme: 'dark',
        timeFormat: '12h',
      }),
    );
    resolveRequest?.({
      ...preferences,
      theme: 'dark',
      timeFormat: '12h',
    });
    expect(await screen.findByText('Preferences saved.')).toHaveAttribute(
      'role',
      'status',
    );
  });

  it('shows a safe retryable mutation error', async () => {
    mutation.updatePreferences.mockRejectedValueOnce(new Error('raw error'));
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    expect(
      await screen.findByText(
        'Trackly could not save your preferences. Please try again.',
      ),
    ).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('raw error')).not.toBeInTheDocument();
  });

  it('formats deterministic previews without local timezone dependence', () => {
    expect(
      preferencePreview({
        ...preferences,
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '12h',
        weekStartsOn: 'sunday',
        theme: 'light',
      }),
    ).toEqual({
      date: '14/07/2026',
      time: '1:45 PM',
      week: 'Sunday',
      theme: 'Light',
    });
  });
});
