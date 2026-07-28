import { ArrowLeft, CalendarDays, Pencil } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/common/status-badge';
import { HabitCheckInControl } from '@/components/habits/habit-check-in-control';
import { HabitLifecycleActions } from '@/components/habits/habit-lifecycle-actions';
import { CategoryBadge } from '@/components/today/category-badge';
import {
  formatDateRange,
  formatSchedule,
  formatTarget,
  formatTimestamp,
} from '@/lib/habit-format';
import { formatDisplayDate } from '@/lib/today-format';
import type {
  HabitDetail as HabitDetailData,
  HabitStreak,
} from '@/types/habit';

export function HabitDetail({
  habit,
  streak,
  timezone,
  success,
}: {
  habit: HabitDetailData;
  streak: HabitStreak;
  timezone: string;
  success?: 'created' | 'updated';
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
      {success && (
        <p
          className="border-primary/30 bg-primary-soft rounded-lg border px-4 py-3 text-sm font-medium"
          role="status"
        >
          Habit {success} successfully.
        </p>
      )}
      <Link
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-sm font-medium focus-visible:ring-2"
        href="/habits"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to habits
      </Link>
      <header className="space-y-4">
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
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2"
            href={`/habits/${habit.id}/edit`}
          >
            <Pencil aria-hidden="true" className="size-4" /> Edit
          </Link>
          <HabitLifecycleActions habitId={habit.id} isActive={habit.isActive} />
        </div>
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
          <div className="mt-4">
            <HabitCheckInControl
              date={habit.today.date}
              habitId={habit.id}
              habitName={habit.name}
              initialCompletedCount={habit.today.completedCount}
              initialIsCompleted={habit.today.isCompleted}
              isActive={habit.isActive}
              isScheduled={habit.today.isScheduled}
              targetCount={habit.targetCount}
            />
          </div>
        </section>
      </div>
      <section
        aria-labelledby="streak-heading"
        className="border-border bg-surface rounded-xl border p-6"
      >
        <h2 id="streak-heading" className="text-lg font-semibold">
          Streak
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-sm">Current Streak</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {streak.currentStreak}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Longest Streak</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {streak.longestStreak}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              Last Completed Date
            </dt>
            <dd className="mt-1 font-medium">
              {streak.lastCompletedDate
                ? formatDisplayDate(streak.lastCompletedDate)
                : 'No completed occurrences'}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
