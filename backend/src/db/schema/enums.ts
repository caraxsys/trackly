import { pgEnum } from 'drizzle-orm/pg-core';

export const habitFrequencyType = pgEnum('habit_frequency_type', [
  'daily',
  'weekly',
  'custom',
]);

export const taskStatus = pgEnum('task_status', [
  'todo',
  'in_progress',
  'completed',
  'cancelled',
]);

export const priority = pgEnum('priority', ['low', 'medium', 'high']);

export const goalStatus = pgEnum('goal_status', [
  'active',
  'completed',
  'cancelled',
]);
