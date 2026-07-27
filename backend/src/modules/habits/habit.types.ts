import type { CategoryProjection } from '../shared/query.types.js';

export interface TodayHabit {
  category: CategoryProjection | null;
  completedCount: number;
  description: string | null;
  frequencyType: 'daily' | 'weekly' | 'custom';
  id: string;
  isCompleted: boolean;
  name: string;
  position: number;
  targetCount: number;
}
