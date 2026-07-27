import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HabitCheckInControl } from '@/components/habits/habit-check-in-control';
import { ApiError } from '@/services/api-error';

const { refresh, setHabitCheckIn } = vi.hoisted(() => ({
  refresh: vi.fn(),
  setHabitCheckIn: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/services/habit-check-in-service', () => ({
  setHabitCheckIn,
}));

function renderControl(
  overrides: Partial<React.ComponentProps<typeof HabitCheckInControl>> = {},
) {
  return render(
    <HabitCheckInControl
      date="2026-07-27"
      habitId="habit-id"
      habitName="Read"
      initialCompletedCount={0}
      initialIsCompleted={false}
      isActive
      isScheduled
      targetCount={1}
      {...overrides}
    />,
  );
}

function result(completedCount: number, targetCount: number) {
  return {
    habitId: 'habit-id',
    date: '2026-07-27',
    completedCount,
    targetCount,
    isCompleted: completedCount >= targetCount,
  };
}

describe('HabitCheckInControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes and resets a target-one habit with absolute dated payloads', async () => {
    const user = userEvent.setup();
    setHabitCheckIn
      .mockResolvedValueOnce(result(1, 1))
      .mockResolvedValueOnce(result(0, 1));
    renderControl();

    await user.click(
      screen.getByRole('button', { name: 'Mark Read complete' }),
    );
    expect(setHabitCheckIn).toHaveBeenNthCalledWith(1, 'habit-id', {
      date: '2026-07-27',
      completedCount: 1,
    });
    expect(
      await screen.findByText('1 / 1 completed — target complete'),
    ).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Reset Read completion' }),
    );
    expect(setHabitCheckIn).toHaveBeenNthCalledWith(2, 'habit-id', {
      date: '2026-07-27',
      completedCount: 0,
    });
    expect(await screen.findByText('0 / 1 completed')).toBeVisible();
  });

  it('increments and decrements multi-target progress within bounds', async () => {
    const user = userEvent.setup();
    setHabitCheckIn
      .mockResolvedValueOnce(result(2, 3))
      .mockResolvedValueOnce(result(1, 3));
    renderControl({
      targetCount: 3,
      initialCompletedCount: 1,
    });

    await user.click(
      screen.getByRole('button', { name: 'Increase Read progress' }),
    );
    expect(setHabitCheckIn).toHaveBeenLastCalledWith('habit-id', {
      date: '2026-07-27',
      completedCount: 2,
    });
    expect(await screen.findByText('2 / 3 completed')).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Decrease Read progress' }),
    );
    expect(setHabitCheckIn).toHaveBeenLastCalledWith('habit-id', {
      date: '2026-07-27',
      completedCount: 1,
    });
    expect(await screen.findByText('1 / 3 completed')).toBeVisible();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('disables decrement and increment at their respective bounds', () => {
    const { unmount } = renderControl({
      targetCount: 3,
      initialCompletedCount: 0,
    });
    expect(
      screen.getByRole('button', { name: 'Decrease Read progress' }),
    ).toBeDisabled();

    unmount();
    render(
      <HabitCheckInControl
        date="2026-07-27"
        habitId="habit-id"
        habitName="Read"
        initialCompletedCount={3}
        initialIsCompleted
        isActive
        isScheduled
        targetCount={3}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Increase Read progress' }),
    ).toBeDisabled();
  });

  it('prevents duplicate submission while a request is pending', async () => {
    const user = userEvent.setup();
    let resolveRequest!: (value: ReturnType<typeof result>) => void;
    setHabitCheckIn.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderControl();
    const button = screen.getByRole('button', { name: 'Mark Read complete' });

    await user.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Saving progress');
    await user.click(button);
    expect(setHabitCheckIn).toHaveBeenCalledTimes(1);

    resolveRequest(result(1, 1));
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('shows friendly conflict and generic errors without changing progress', async () => {
    const user = userEvent.setup();
    setHabitCheckIn
      .mockRejectedValueOnce(
        new ApiError({ code: 'CONFLICT', message: 'Internal', status: 409 }),
      )
      .mockRejectedValueOnce(new Error('network details'));
    renderControl();
    const button = screen.getByRole('button', { name: 'Mark Read complete' });

    await user.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'inactive or not scheduled',
    );
    expect(screen.getByText('0 / 1 completed')).toBeVisible();

    await user.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Progress could not be updated',
    );
    expect(screen.queryByText('network details')).not.toBeInTheDocument();
  });

  it('renders inactive and unscheduled habits as read-only', () => {
    const { rerender } = renderControl({ isActive: false });
    expect(screen.getByText('This habit is inactive.')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <HabitCheckInControl
        date="2026-07-27"
        habitId="habit-id"
        habitName="Read"
        initialCompletedCount={0}
        initialIsCompleted={false}
        isActive
        isScheduled={false}
        targetCount={1}
      />,
    );
    expect(
      screen.getByText('This habit is not scheduled for this date.'),
    ).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
