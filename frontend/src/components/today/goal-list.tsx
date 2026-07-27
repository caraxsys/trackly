import { Target } from 'lucide-react';
import Link from 'next/link';

import { CategoryBadge } from './category-badge';
import { formatShortDate } from '@/lib/today-format';
import type { TodayGoal } from '@/types/today';

export function GoalList({ goals }: { goals: TodayGoal[] }) {
  return (
    <section aria-labelledby="goals-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2
            className="text-foreground text-lg font-semibold"
            id="goals-title"
          >
            Active goals
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Longer-term progress worth keeping in view.
          </p>
        </div>
        <Link
          className="text-primary focus-visible:ring-ring rounded-sm text-sm font-medium hover:underline focus-visible:ring-2"
          href="/goals"
        >
          View goals
        </Link>
      </div>
      {goals.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <article
              className="border-border bg-surface rounded-xl border p-5"
              key={goal.id}
            >
              <div className="flex items-start gap-3">
                <span className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Target aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-foreground break-words font-medium">
                    {goal.title}
                  </h3>
                  {goal.targetDate ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Target {formatShortDate(goal.targetDate)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {goal.completedSteps} of {goal.totalSteps} steps
                  </span>
                  <span className="text-foreground font-medium">
                    {goal.progressPercentage}%
                  </span>
                </div>
                <div
                  aria-label={`${goal.title}: ${goal.progressPercentage}% complete`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={goal.progressPercentage}
                  className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
                  role="progressbar"
                >
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${goal.progressPercentage}%` }}
                  />
                </div>
                {goal.totalSteps === 0 ? (
                  <p className="text-muted-foreground mt-2 text-xs">
                    No steps defined yet.
                  </p>
                ) : null}
                <div className="mt-3">
                  <CategoryBadge category={goal.category} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          No active goals to show.
        </p>
      )}
    </section>
  );
}
