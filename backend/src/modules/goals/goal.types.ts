import type { CategoryProjection } from '../shared/query.types.js';

export interface TodayGoal {
  category: CategoryProjection | null;
  completedSteps: number;
  coverImageUrl: string | null;
  description: string | null;
  id: string;
  position: number;
  progressPercentage: number;
  startDate: string | null;
  status: 'active';
  targetDate: string | null;
  title: string;
  totalSteps: number;
}
