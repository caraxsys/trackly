import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HabitForm } from '@/components/habits/habit-form';
import { HabitLifecycleActions } from '@/components/habits/habit-lifecycle-actions';
import { ApiError } from '@/services/api-error';
import type { HabitFormValues } from '@/types/habit';

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
const createHabit = vi.fn();
const updateHabit = vi.fn();
const activateHabit = vi.fn();
const deactivateHabit = vi.fn();
const deleteHabit = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, refresh }),
}));

vi.mock('@/services/habit-mutation-service', () => ({
  createHabit: (...args: unknown[]) => createHabit(...args),
  updateHabit: (...args: unknown[]) => updateHabit(...args),
  activateHabit: (...args: unknown[]) => activateHabit(...args),
  deactivateHabit: (...args: unknown[]) => deactivateHabit(...args),
  deleteHabit: (...args: unknown[]) => deleteHabit(...args),
}));

const initialValues: HabitFormValues = {
  name: '',
  description: '',
  categoryId: '',
  frequencyType: 'daily',
  targetCount: 1,
  startDate: '2026-07-27',
  endDate: '',
  weekdays: [],
  isActive: true,
};
const categories = [
  { id: 'category-id', name: 'Health', color: null, icon: null },
];

function form(mode: 'create' | 'edit' = 'create', values = initialValues) {
  return render(
    <HabitForm
      categories={categories}
      habitId={mode === 'edit' ? 'habit-id' : undefined}
      initialValues={values}
      mode={mode}
    />,
  );
}

describe('HabitForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createHabit.mockResolvedValue({ id: 'created-id' });
    updateHabit.mockResolvedValue({ id: 'habit-id' });
  });

  it('renders create fields, categories, and daily schedule behavior', async () => {
    const user = userEvent.setup();
    form();

    expect(
      screen.getByRole('group', { name: 'Habit details' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Health' })).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Mon' }),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Frequency/), 'weekly');
    expect(screen.getByRole('checkbox', { name: 'Mon' })).toBeInTheDocument();
  });

  it('prepopulates edit values and selected weekdays', () => {
    form('edit', {
      ...initialValues,
      name: 'Read',
      categoryId: 'category-id',
      frequencyType: 'weekly',
      weekdays: [1, 3],
    });

    expect(screen.getByLabelText(/Name/)).toHaveValue('Read');
    expect(screen.getByLabelText(/Category/)).toHaveValue('category-id');
    expect(screen.getByRole('checkbox', { name: 'Mon' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wed' })).toBeChecked();
  });

  it('validates weekday, dates, and positive targets', async () => {
    const user = userEvent.setup();
    form();
    await user.selectOptions(screen.getByLabelText(/Frequency/), 'custom');
    await user.clear(screen.getByLabelText(/Daily target/));
    await user.type(screen.getByLabelText(/Daily target/), '0');
    await user.type(screen.getByLabelText(/End date/), '2026-07-01');
    await user.click(screen.getByRole('button', { name: 'Create habit' }));

    expect(
      await screen.findByText('Select at least one weekday.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Target must be at least 1.')).toBeInTheDocument();
    expect(
      screen.getByText('End date must be on or after start date.'),
    ).toBeInTheDocument();
    expect(createHabit).not.toHaveBeenCalled();
  });

  it('trims names, sorts weekdays, selects a category, and redirects after create', async () => {
    const user = userEvent.setup();
    form();
    await user.type(screen.getByLabelText(/Name/), '  Read  ');
    await user.selectOptions(screen.getByLabelText(/Category/), 'category-id');
    await user.selectOptions(screen.getByLabelText(/Frequency/), 'weekly');
    await user.click(screen.getByRole('checkbox', { name: 'Wed' }));
    await user.click(screen.getByRole('checkbox', { name: 'Mon' }));
    await user.click(screen.getByRole('button', { name: 'Create habit' }));

    await waitFor(() =>
      expect(createHabit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Read',
          categoryId: 'category-id',
          weekdays: [1, 3],
        }),
      ),
    );
    expect(push).toHaveBeenCalledWith('/habits/created-id?success=created');
  });

  it('submits edit values once while pending', async () => {
    let resolve!: (value: { id: string }) => void;
    updateHabit.mockReturnValue(new Promise((done) => (resolve = done)));
    const user = userEvent.setup();
    form('edit', { ...initialValues, name: 'Read' });
    const save = screen.getByRole('button', { name: 'Save changes' });
    await user.click(save);
    await user.click(save);
    expect(updateHabit).toHaveBeenCalledTimes(1);
    resolve({ id: 'habit-id' });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/habits/habit-id?success=updated'),
    );
  });

  it('shows backend validation errors', async () => {
    createHabit.mockRejectedValue(
      new ApiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        status: 400,
        details: [{ path: 'name', message: 'Name is unavailable.' }],
      }),
    );
    const user = userEvent.setup();
    form();
    await user.type(screen.getByLabelText(/Name/), 'Read');
    await user.click(screen.getByRole('button', { name: 'Create habit' }));
    expect(await screen.findByText('Name is unavailable.')).toBeInTheDocument();
    expect(
      screen.getByText('Review the highlighted fields and try again.'),
    ).toBeInTheDocument();
  });

  it('cancels cleanly and confirms dirty cancellation', async () => {
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const user = userEvent.setup();
    form('edit', { ...initialValues, name: 'Read' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).toHaveBeenCalledWith('/habits/habit-id');

    push.mockClear();
    await user.type(screen.getByLabelText(/Name/), ' more');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith('/habits/habit-id');
  });
});

describe('Habit lifecycle actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activateHabit.mockResolvedValue({ id: 'habit-id', isActive: true });
    deactivateHabit.mockResolvedValue({ id: 'habit-id', isActive: false });
    deleteHabit.mockResolvedValue({ id: 'habit-id', deleted: true });
  });

  it('activates and deactivates through dedicated endpoints', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <HabitLifecycleActions habitId="habit-id" isActive={false} />,
    );
    await user.click(screen.getByRole('button', { name: 'Activate' }));
    await user.click(screen.getByRole('button', { name: 'Activate habit' }));
    await waitFor(() => expect(activateHabit).toHaveBeenCalledWith('habit-id'));

    rerender(<HabitLifecycleActions habitId="habit-id" isActive />);
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    await user.click(screen.getByRole('button', { name: 'Deactivate habit' }));
    await waitFor(() =>
      expect(deactivateHabit).toHaveBeenCalledWith('habit-id'),
    );
  });

  it('handles lifecycle conflicts gracefully', async () => {
    activateHabit.mockRejectedValue(
      new ApiError({ code: 'CONFLICT', message: 'Conflict', status: 409 }),
    );
    const user = userEvent.setup();
    render(<HabitLifecycleActions habitId="habit-id" isActive={false} />);
    await user.click(screen.getByRole('button', { name: 'Activate' }));
    await user.click(screen.getByRole('button', { name: 'Activate habit' }));
    expect(
      await screen.findByText(/changed state elsewhere/i),
    ).toBeInTheDocument();
  });

  it('confirms deletion and redirects after success', async () => {
    const user = userEvent.setup();
    render(<HabitLifecycleActions habitId="habit-id" isActive />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete habit' }));
    await waitFor(() => expect(deleteHabit).toHaveBeenCalledWith('habit-id'));
    expect(push).toHaveBeenCalledWith('/habits?success=deleted');
  });
});
