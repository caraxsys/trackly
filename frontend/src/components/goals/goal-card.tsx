import Link from 'next/link';
import { GoalProgress } from '@/components/goals/goal-progress';
import {
  getDaysRemaining,
  getGoalDateState,
} from '@/features/goals/goal-dashboard';
import type { Goal } from '@/types/goal';

export function GoalCard({
  goal,
  localToday,
  compact = false,
}: {
  goal: Goal;
  localToday: string;
  compact?: boolean;
}) {
  const dateState = getGoalDateState(goal, localToday);
  const isOverTarget = goal.progress.currentCount > goal.progress.targetCount;
  const daysRemaining =
    goal.status === 'active' && dateState === 'active'
      ? getDaysRemaining(goal.endDate, localToday)
      : null;
  const detailLabel = `View ${goal.name} Goal details`;

  return (
    <article className="border-border bg-surface rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold">
            <Link
              className="focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
              href={`/goals/${goal.id}`}
              aria-label={detailLabel}
            >
              {goal.name}
            </Link>
          </h3>
          <p className="text-muted-foreground truncate text-sm">
            Habit: {goal.habitName}
          </p>
        </div>
        <span className="text-muted-foreground text-sm capitalize">
          {goal.status}
        </span>
      </div>

      <p className="text-muted-foreground mt-3 text-sm">
        {goal.startDate} – {goal.endDate}
      </p>
      <GoalProgress goal={goal} />

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {!goal.progress.isTargetReached ? (
          <span>{goal.progress.remainingCount} remaining</span>
        ) : null}
        {isOverTarget ? <span>Over target</span> : null}
        {dateState === 'not-started' ? <span>Not started</span> : null}
        {dateState === 'expired' ? <span>Expired</span> : null}
        {daysRemaining !== null ? (
          <span>
            {daysRemaining === 0
              ? 'Ends today'
              : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`}
          </span>
        ) : null}
      </div>

      {!compact ? (
        <nav className="mt-4 flex gap-4" aria-label={`${goal.name} actions`}>
          <Link className="text-sm underline" href={`/goals/${goal.id}`}>
            View details
          </Link>
          <Link className="text-sm underline" href={`/goals/${goal.id}/edit`}>
            Edit Goal
          </Link>
        </nav>
      ) : null}
    </article>
  );
}
