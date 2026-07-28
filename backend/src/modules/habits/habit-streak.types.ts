import type { HabitFrequency } from './habit.types.js';

export interface HabitStreakRecord {
  checkIns: Array<{ completedCount: number; date: string }>;
  endDate: string | null;
  frequencyType: HabitFrequency;
  id: string;
  startDate: string;
  targetCount: number;
  weekdays: number[];
}

export interface HabitStreak {
  currentStreak: number;
  habitId: string;
  lastCompletedDate: string | null;
  longestStreak: number;
}
