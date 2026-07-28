import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalForm } from '@/components/goals/goal-form';

const mocks = vi.hoisted(() => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/services/goal-mutation-service', () => ({
  createGoal: mocks.createGoal,
  updateGoal: mocks.updateGoal,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

const habits = [{ id: '00000000-0000-4000-8000-000000000001', name: 'Walk' }];

describe('GoalForm', () => {
  it('validates and submits canonical Goal fields', async () => {
    mocks.createGoal.mockResolvedValue({ id: 'goal-1' });
    render(
      <GoalForm
        mode="create"
        habits={habits}
        initialValues={{
          name: '',
          habitId: '',
          targetCount: 1,
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          status: 'active',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create Goal' }));
    expect(await screen.findByText('Name is required.')).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: /Name/ }), {
      target: { value: 'July walks' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /Habit/ }), {
      target: { value: habits[0]!.id },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Goal' }));
    await waitFor(() =>
      expect(mocks.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'July walks',
          habitId: habits[0]!.id,
          targetCount: 1,
        }),
      ),
    );
    expect(mocks.push).toHaveBeenCalledWith('/goals/goal-1');
  });

  it('initializes edit values and submits an update once', async () => {
    mocks.updateGoal.mockResolvedValue({ id: 'goal-1' });
    render(
      <GoalForm
        mode="edit"
        goalId="goal-1"
        habits={habits}
        initialValues={{
          name: 'Existing Goal',
          habitId: habits[0]!.id,
          targetCount: 5,
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          status: 'completed',
        }}
      />,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Existing Goal');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(mocks.updateGoal).toHaveBeenCalledTimes(1));
  });
});
