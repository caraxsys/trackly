export interface CategoryProjection {
  color: string | null;
  icon: string | null;
  id: string;
  name: string;
}

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

export interface TodayTask {
  category: CategoryProjection | null;
  completedAt: string | null;
  description: string | null;
  dueAt: string | null;
  id: string;
  position: number;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  title: string;
}

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

export interface TodayResponseData {
  date: string;
  goals: TodayGoal[];
  habits: TodayHabit[];
  summary: {
    activeGoals: number;
    completedItems: number;
    completionPercentage: number;
    habitsCompleted: number;
    habitsTotal: number;
    overdueTasks: number;
    tasksCompletedToday: number;
    tasksDueToday: number;
    totalItems: number;
  };
  tasks: {
    completedToday: TodayTask[];
    dueToday: TodayTask[];
    overdue: TodayTask[];
  };
  timezone: string;
}
