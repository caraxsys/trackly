export type GoalStatus = 'active' | 'completed' | 'cancelled';
export interface Goal {
  id: string;
  userId: string;
  habitId: string;
  habitName: string;
  name: string;
  targetCount: number;
  startDate: string;
  endDate: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}
export interface GoalPayload {
  habitId: string;
  name: string;
  targetCount: number;
  startDate: string;
  endDate: string;
  status: GoalStatus;
}
