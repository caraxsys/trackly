import { ArrowLeft, CalendarDays } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/common/status-badge';
import { CategoryBadge } from '@/components/today/category-badge';
import {
  formatDateRange,
  formatSchedule,
  formatTarget,
  formatTimestamp,
} from '@/lib/habit-format';
import { formatDisplayDate } from '@/lib/today-format';
import type { HabitDetail as HabitDetailData } from '@/types/habit';

export function HabitDetail({
  habit,
  timezone,
}: {
  habit: HabitDetailData;
  timezone: string;
}) {
  const fields = [
    ['Frequency', formatSchedule(habit.frequencyType, habit.schedule.weekdays)],
    ['Target', formatTarget(habit.targetCount)],
    ['Date range', formatDateRange(habit.startDate, habit.endDate)],
    ['Created', formatTimestamp(habit.createdAt, timezone)],
    ['Updated', formatTimestamp(habit.updatedAt, timezone)],
  ];

  return (
    <div className="space-y-6">
      <Link
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-sm font-medium focus-visible:ring-2"
        href="/habits"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to habits
      </Link>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {habit.name}
          </h1>
          <StatusBadge muted={!habit.isActive}>
            {habit.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>
          <CategoryBadge category={habit.category} />
        </div>
        {habit.description ? (
          <p className="text-muted-foreground max-w-3xl leading-7">
            {habit.description}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            No description provided.
          </p>
        )}
      </header>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section
          aria-labelledby="habit-details-heading"
          className="border-border bg-surface rounded-xl border p-6"
        >
          <h2 id="habit-details-heading" className="text-lg font-semibold">
            Routine details
          </h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground text-sm">{label}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section
          aria-labelledby="today-status-heading"
          className="border-border bg-surface rounded-xl border p-6"
        >
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="text-primary size-5" />
            <h2 id="today-status-heading" className="text-lg font-semibold">
              Today
            </h2>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {formatDisplayDate(habit.today.date)}
          </p>
          <p className="mt-5 text-2xl font-semibold">
            {habit.today.isScheduled ? 'Scheduled' : 'Not scheduled'}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {habit.today.completedCount} of {habit.targetCount} completed
          </p>
          <p className="mt-4 text-sm font-medium">
            {habit.today.isCompleted
              ? 'Target completed'
              : 'Target not completed'}
          </p>
        </section>
      </div>
    </div>
  );
}
