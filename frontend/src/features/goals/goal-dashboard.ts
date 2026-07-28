import type { Goal, GoalStatus } from '@/types/goal';

export type GoalSort =
  'default' | 'highest-progress' | 'nearest-deadline' | 'newest';
export type GoalDateState = 'active' | 'expired' | 'not-started';

export interface GoalDashboardSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  cancelledGoals: number;
  reachedGoals: number;
  averageActiveProgressRate: number;
}

const roundPercentage = (value: number) => Math.round(value * 100) / 100;
const dateValue = (value: string) => Date.parse(`${value}T00:00:00.000Z`);

export function addCalendarDays(date: string, days: number) {
  return new Date(dateValue(date) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function getGoalDateState(
  goal: Pick<Goal, 'startDate' | 'endDate'>,
  localToday: string,
): GoalDateState {
  if (goal.startDate > localToday) return 'not-started';
  if (goal.endDate < localToday) return 'expired';
  return 'active';
}

export function getDaysRemaining(endDate: string, localToday: string) {
  return Math.max(
    Math.round((dateValue(endDate) - dateValue(localToday)) / 86_400_000),
    0,
  );
}

export function summarizeGoals(goals: Goal[]): GoalDashboardSummary {
  const active = goals.filter(({ status }) => status === 'active');
  const activeRate = active.reduce(
    (total, goal) => total + goal.progress.progressRate,
    0,
  );
  return {
    totalGoals: goals.length,
    activeGoals: active.length,
    completedGoals: goals.filter(({ status }) => status === 'completed').length,
    cancelledGoals: goals.filter(({ status }) => status === 'cancelled').length,
    reachedGoals: goals.filter(({ progress }) => progress.isTargetReached)
      .length,
    averageActiveProgressRate:
      active.length === 0 ? 0 : roundPercentage(activeRate / active.length),
  };
}

function stableOrder(goals: Goal[]) {
  return new Map(goals.map((goal, index) => [goal.id, index]));
}

export function groupPriorityGoals(goals: Goal[], localToday: string) {
  const order = stableOrder(goals);
  const fallback = (left: Goal, right: Goal) =>
    (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
  const unreachedActive = (goal: Goal) =>
    goal.status === 'active' && !goal.progress.isTargetReached;
  const endingSoonLimit = addCalendarDays(localToday, 7);

  return {
    almostThere: goals
      .filter(
        (goal) => unreachedActive(goal) && goal.progress.progressRate >= 70,
      )
      .sort(
        (left, right) =>
          right.progress.progressRate - left.progress.progressRate ||
          left.endDate.localeCompare(right.endDate) ||
          fallback(left, right),
      ),
    endingSoon: goals
      .filter(
        (goal) =>
          unreachedActive(goal) &&
          goal.endDate >= localToday &&
          goal.endDate <= endingSoonLimit,
      )
      .sort(
        (left, right) =>
          left.endDate.localeCompare(right.endDate) ||
          right.progress.progressRate - left.progress.progressRate ||
          fallback(left, right),
      ),
    reached: goals
      .filter(({ progress }) => progress.isTargetReached)
      .sort(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) ||
          fallback(left, right),
      ),
    overTarget: goals
      .filter(({ progress }) => progress.currentCount > progress.targetCount)
      .sort(
        (left, right) =>
          right.progress.progressRate - left.progress.progressRate ||
          fallback(left, right),
      ),
  };
}

export function sortGoals(goals: Goal[], sort: GoalSort) {
  const order = stableOrder(goals);
  const fallback = (left: Goal, right: Goal) =>
    (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
  return [...goals].sort((left, right) => {
    if (sort === 'highest-progress')
      return (
        right.progress.progressRate - left.progress.progressRate ||
        fallback(left, right)
      );
    if (sort === 'nearest-deadline')
      return left.endDate.localeCompare(right.endDate) || fallback(left, right);
    if (sort === 'newest')
      return (
        right.createdAt.localeCompare(left.createdAt) || fallback(left, right)
      );
    return fallback(left, right);
  });
}

export function isGoalStatus(value: string | undefined): value is GoalStatus {
  return Boolean(value && ['active', 'completed', 'cancelled'].includes(value));
}

export function isGoalSort(value: string | undefined): value is GoalSort {
  return Boolean(
    value &&
    ['default', 'highest-progress', 'nearest-deadline', 'newest'].includes(
      value,
    ),
  );
}
