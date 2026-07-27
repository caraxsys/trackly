import type { TodayGoal } from '../goals/goal.types.js';
import type { TodayHabit } from '../habits/habit.types.js';
import type { TodayTaskGroups } from '../tasks/task.types.js';
import type { TodaySummary } from './today.types.js';

export function calculateCompletionPercentage(
  completed: number,
  total: number,
) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function createTodaySummary(
  habits: TodayHabit[],
  tasks: TodayTaskGroups,
  goals: TodayGoal[],
): TodaySummary {
  const habitsCompleted = habits.filter((habit) => habit.isCompleted).length;
  const tasksCompletedToday = tasks.completedToday.length;
  const totalItems =
    habits.length +
    tasks.overdue.length +
    tasks.dueToday.length +
    tasksCompletedToday;
  const completedItems = habitsCompleted + tasksCompletedToday;

  return {
    habitsTotal: habits.length,
    habitsCompleted,
    tasksDueToday: tasks.dueToday.length,
    tasksCompletedToday,
    overdueTasks: tasks.overdue.length,
    activeGoals: goals.length,
    completedItems,
    totalItems,
    completionPercentage: calculateCompletionPercentage(
      completedItems,
      totalItems,
    ),
  };
}
