import type { CategoryProjection } from '../shared/query.types.js';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TodayTask {
  category: CategoryProjection | null;
  completedAt: Date | null;
  description: string | null;
  dueAt: Date | null;
  id: string;
  position: number;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
}

export interface TodayTaskGroups {
  completedToday: TodayTask[];
  dueToday: TodayTask[];
  overdue: TodayTask[];
}
