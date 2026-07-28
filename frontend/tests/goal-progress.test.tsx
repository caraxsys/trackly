import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoalProgress } from '@/components/goals/goal-progress';
import type { Goal } from '@/types/goal';

const goal = {
  id: 'goal-1',
  userId: 'user-1',
  habitId: 'habit-1',
  habitName: 'Walk',
  name: 'Walk target',
  targetCount: 10,
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  status: 'completed',
  createdAt: '',
  updatedAt: '',
} satisfies Omit<Goal, 'progress'>;

describe('GoalProgress', () => {
  it.each([
    [0, 10, false, '0.00%'],
    [5, 5, false, '50.00%'],
    [10, 0, true, 'Target reached'],
    [15, 0, true, 'Target reached'],
  ])(
    'renders current count %s accessibly',
    (currentCount, remainingCount, reached, label) => {
      render(
        <GoalProgress
          detailed
          goal={{
            ...goal,
            progress: {
              currentCount,
              targetCount: 10,
              remainingCount,
              progressRate: currentCount * 10,
              isTargetReached: reached,
            },
          }}
        />,
      );
      expect(
        screen.getByLabelText(`Walk target progress: ${currentCount} of 10`),
      ).toBeVisible();
      expect(screen.getAllByText(label)[0]).toBeVisible();
      expect(
        screen.getByText('Remaining').nextElementSibling,
      ).toHaveTextContent(String(remainingCount));
    },
  );
});
