import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReminderManager } from '@/components/reminders/reminder-manager';
import { ApiError } from '@/services/api-error';
import type { Reminder } from '@/types/reminder';

const mutations = vi.hoisted(() => ({
  createReminder: vi.fn(),
  updateReminder: vi.fn(),
  deleteReminder: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mutations.refresh }),
}));

vi.mock('@/services/reminder-mutation-service', () => ({
  createReminder: mutations.createReminder,
  updateReminder: mutations.updateReminder,
  deleteReminder: mutations.deleteReminder,
}));

const morning: Reminder = {
  id: '00000000-0000-4000-8000-000000000001',
  habitId: '00000000-0000-4000-8000-000000000002',
  timeOfDay: '08:30',
  isEnabled: true,
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:00.000Z',
};
const evening: Reminder = {
  ...morning,
  id: '00000000-0000-4000-8000-000000000003',
  timeOfDay: '18:45',
  isEnabled: false,
};

function renderManager(
  options: {
    items?: Reminder[];
    active?: boolean;
    timeFormat?: '12h' | '24h';
  } = {},
) {
  return render(
    <ReminderManager
      habitId={morning.habitId}
      initialItems={options.items ?? []}
      isHabitActive={options.active ?? true}
      timeFormat={options.timeFormat ?? '24h'}
      timezone="Asia/Jakarta"
    />,
  );
}

describe('ReminderManager', () => {
  beforeEach(() => {
    mutations.createReminder.mockReset();
    mutations.updateReminder.mockReset();
    mutations.deleteReminder.mockReset();
    mutations.refresh.mockReset();
  });

  it('renders the section, timezone, delivery notice, and empty state', () => {
    renderManager();
    expect(
      screen.getByRole('heading', { name: 'Reminders' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Timezone:/)).toHaveTextContent(
      'Timezone: Asia/Jakarta',
    );
    expect(
      screen.getByText('Notification delivery is not available yet.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No reminders yet.')).toBeInTheDocument();
    expect(screen.getByText('Add your first reminder.')).toBeInTheDocument();
  });

  it('orders reminders, renders text states, and formats 24h and 12h times', () => {
    const { rerender } = renderManager({ items: [evening, morning] });
    const times = screen.getAllByText(/\d{2}:\d{2}/);
    expect(times.map(({ textContent }) => textContent)).toEqual([
      '08:30',
      '18:45',
    ]);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();

    rerender(
      <ReminderManager
        habitId={morning.habitId}
        initialItems={[morning]}
        isHabitActive
        timeFormat="12h"
        timezone="Asia/Jakarta"
      />,
    );
    expect(screen.getByText('8:30 AM')).toBeInTheDocument();
  });

  it('validates add, submits canonical HH:mm, prevents duplicates, and announces success', async () => {
    const user = userEvent.setup();
    mutations.createReminder.mockResolvedValue(morning);
    renderManager();

    await user.click(screen.getByRole('button', { name: 'Add reminder' }));
    const addForm = screen.getByRole('form', { name: 'Add reminder' });
    await user.click(
      within(addForm).getByRole('button', { name: 'Add reminder' }),
    );
    expect(
      await screen.findByText('Enter a valid time in HH:mm format.'),
    ).toBeInTheDocument();
    await user.type(within(addForm).getByLabelText(/^Time/), '08:30');
    await user.click(
      within(addForm).getByRole('button', { name: 'Add reminder' }),
    );
    await waitFor(() =>
      expect(mutations.createReminder).toHaveBeenCalledWith(morning.habitId, {
        timeOfDay: '08:30',
        isEnabled: true,
      }),
    );
    expect(
      await screen.findByText('Reminder added successfully.'),
    ).toHaveAttribute('role', 'status');
    expect(mutations.createReminder).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Add reminder' }));
    const duplicateForm = screen.getByRole('form', { name: 'Add reminder' });
    await user.type(within(duplicateForm).getByLabelText(/^Time/), '08:30');
    mutations.createReminder.mockRejectedValue(
      new ApiError({
        code: 'CONFLICT',
        message: 'Conflict',
        status: 409,
      }),
    );
    await user.click(
      within(duplicateForm).getByRole('button', { name: 'Add reminder' }),
    );
    expect(
      await screen.findByText('A reminder already exists at that time.'),
    ).toBeInTheDocument();
  });

  it('edits enabled state and deletes with an accessible confirmation', async () => {
    const user = userEvent.setup();
    mutations.updateReminder.mockResolvedValue({
      ...morning,
      isEnabled: false,
    });
    mutations.deleteReminder.mockResolvedValue({
      id: morning.id,
      deleted: true,
    });
    renderManager({ items: [morning] });

    await user.click(
      screen.getByRole('button', { name: 'Edit 08:30 reminder' }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Enabled' }));
    await user.click(screen.getByRole('button', { name: 'Save reminder' }));
    await waitFor(() =>
      expect(mutations.updateReminder).toHaveBeenCalledWith(
        morning.habitId,
        morning.id,
        { timeOfDay: '08:30', isEnabled: false },
      ),
    );
    expect(screen.getByText('Disabled')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Delete 08:30 reminder' }),
    );
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'The Habit and historical tracking remain unchanged.',
    );
    await user.click(screen.getByRole('button', { name: 'Delete reminder' }));
    await waitFor(() =>
      expect(mutations.deleteReminder).toHaveBeenCalledWith(
        morning.habitId,
        morning.id,
      ),
    );
    expect(screen.getByText('No reminders yet.')).toBeInTheDocument();
  });

  it('disables submission and announces the pending state', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: Reminder) => void = () => undefined;
    mutations.createReminder.mockImplementation(
      () =>
        new Promise<Reminder>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderManager();
    await user.click(screen.getByRole('button', { name: 'Add reminder' }));
    const form = screen.getByRole('form', { name: 'Add reminder' });
    await user.type(within(form).getByLabelText('Time'), '08:30');
    await user.click(
      within(form).getByRole('button', { name: 'Add reminder' }),
    );
    expect(
      within(form).getByRole('button', { name: 'Saving…' }),
    ).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Saving reminder');
    resolveCreate(morning);
    expect(
      await screen.findByText('Reminder added successfully.'),
    ).toBeInTheDocument();
    expect(mutations.createReminder).toHaveBeenCalledTimes(1);
  });

  it('keeps archived Habit reminders editable with an explicit inactive notice', () => {
    renderManager({ items: [morning], active: false });
    expect(
      screen.getByText(
        /This Habit is archived. Its reminders are preserved but are currently inactive./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit 08:30 reminder' }),
    ).toBeEnabled();
  });
});
