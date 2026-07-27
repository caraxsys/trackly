import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

import { CategoryBadge } from './category-badge';
import type { TodayHabit } from '@/types/today';

export function HabitList({ habits }: { habits: TodayHabit[] }) {
  return (
    <section
      aria-labelledby="habits-title"
      className="border-border bg-surface rounded-xl border p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            className="text-foreground text-lg font-semibold"
            id="habits-title"
          >
            Today&apos;s habits
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Your scheduled routines for this date.
          </p>
        </div>
        <Link
          className="text-primary focus-visible:ring-ring rounded-sm text-sm font-medium hover:underline focus-visible:ring-2"
          href="/habits"
        >
          View habits
        </Link>
      </div>
      {habits.length ? (
        <ul className="mt-5 divide-y">
          {habits.map((habit) => (
            <li className="flex gap-3 py-4 first:pt-0 last:pb-0" key={habit.id}>
              {habit.isCompleted ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="text-primary mt-0.5 size-5 shrink-0"
                />
              ) : (
                <Circle
                  aria-hidden="true"
                  className="text-muted-foreground mt-0.5 size-5 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-foreground break-words font-medium">
                    {habit.name}
                  </p>
                  <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                    {habit.completedCount}/{habit.targetCount}
                  </span>
                </div>
                {habit.description ? (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {habit.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <CategoryBadge category={habit.category} />
                  <span className="sr-only">
                    {habit.isCompleted ? 'Completed' : 'Not completed'}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-5 text-sm">
          No habits are scheduled for this date.
        </p>
      )}
    </section>
  );
}
