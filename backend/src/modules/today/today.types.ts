import type { TodayGoal } from '../goals/goal.types.js';
import type { TodayHabit } from '../habits/habit.types.js';
import type { TodayTaskGroups } from '../tasks/task.types.js';

export interface TodaySummary {
  activeGoals: number;
  completedItems: number;
  completionPercentage: number;
  habitsCompleted: number;
  habitsTotal: number;
  overdueTasks: number;
  tasksCompletedToday: number;
  tasksDueToday: number;
  totalItems: number;
}

export interface TodayData {
  date: string;
  goals: TodayGoal[];
  habits: TodayHabit[];
  summary: TodaySummary;
  tasks: TodayTaskGroups;
  timezone: string;
}
