import { ArrowRight, CalendarDays, CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/common/status-badge';
import { CategoryBadge } from '@/components/today/category-badge';
import {
  formatDateRange,
  formatSchedule,
  formatTarget,
} from '@/lib/habit-format';
import type { HabitListItem } from '@/types/habit';

export function HabitList({ items }: { items: HabitListItem[] }) {
  return (
    <ul aria-label="Habits" className="space-y-3">
      {items.map((habit) => (
        <li
          className={`border-border bg-surface rounded-xl border p-5 ${habit.isActive ? '' : 'opacity-70'}`}
          key={habit.id}
        >
          <article className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="text-foreground focus-visible:ring-ring hover:text-primary rounded-sm text-lg font-semibold hover:underline focus-visible:ring-2"
                  href={`/habits/${habit.id}`}
                >
                  {habit.name}
                </Link>
                <StatusBadge muted={!habit.isActive}>
                  {habit.isActive ? 'Active' : 'Archived'}
                </StatusBadge>
                <CategoryBadge category={habit.category} />
              </div>
              {habit.description && (
                <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                  {habit.description}
                </p>
              )}
              <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden="true" className="size-4" />
                  {formatSchedule(habit.frequencyType, habit.schedule.weekdays)}
                </span>
                <span>{formatTarget(habit.targetCount)}</span>
                <span>{formatDateRange(habit.startDate, habit.endDate)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
              <span className="text-sm font-medium">
                {habit.selectedDate.isScheduled ? (
                  <span className="inline-flex items-center gap-1.5">
                    {habit.selectedDate.isCompleted ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="text-primary size-4"
                      />
                    ) : (
                      <Circle
                        aria-hidden="true"
                        className="text-muted-foreground size-4"
                      />
                    )}
                    {habit.selectedDate.completedCount}/{habit.targetCount}{' '}
                    completed
                  </span>
                ) : (
                  'Not scheduled'
                )}
              </span>
              <Link
                aria-label={`View ${habit.name} details`}
                className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:underline focus-visible:ring-2"
                href={`/habits/${habit.id}`}
              >
                Details <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
