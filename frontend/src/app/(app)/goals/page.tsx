import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/feedback/empty-state';
import { GoalCard } from '@/components/goals/goal-card';
import { GoalDashboard } from '@/components/goals/goal-dashboard';
import { PageHeader } from '@/components/layout/page-header';
import {
  isGoalSort,
  isGoalStatus,
  sortGoals,
} from '@/features/goals/goal-dashboard';
import { getServerSession } from '@/lib/auth-session';
import { getServerGoals } from '@/services/goal-server-service';
import { getServerToday } from '@/services/today-server-service';

export const metadata: Metadata = { title: 'Goals' };
export const dynamic = 'force-dynamic';
export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; status?: string }>;
}) {
  if (!(await getServerSession())) redirect('/login');
  const query = await searchParams;
  const status = isGoalStatus(query.status) ? query.status : undefined;
  const sort = isGoalSort(query.sort) ? query.sort : 'default';
  const [goals, today] = await Promise.all([
    getServerGoals(status),
    getServerToday(),
  ]);
  const sortedGoals = sortGoals(goals, sort);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Set finite accumulation targets for your Habits."
      />
      <div className="flex justify-end">
        <Link
          className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 outline-none focus-visible:ring-2"
          href="/goals/new"
        >
          New Goal
        </Link>
      </div>
      <form
        aria-label="Goal collection controls"
        className="flex flex-wrap items-end gap-2"
        method="get"
      >
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="border-border bg-surface focus-visible:ring-ring rounded-lg border px-3 py-2 outline-none focus-visible:ring-2"
            defaultValue={status ?? ''}
            name="status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Sort
          <select
            className="border-border bg-surface focus-visible:ring-ring rounded-lg border px-3 py-2 outline-none focus-visible:ring-2"
            defaultValue={sort}
            name="sort"
          >
            <option value="default">Default</option>
            <option value="highest-progress">Highest progress</option>
            <option value="nearest-deadline">Nearest deadline</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        <button
          className="border-border focus-visible:ring-ring rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          type="submit"
        >
          Apply
        </button>
      </form>
      {goals.length === 0 ? (
        <EmptyState
          title="No Goals found"
          description="Create a Goal or choose another status filter."
        />
      ) : (
        <>
          <GoalDashboard goals={goals} localToday={today.date} />
          <section aria-labelledby="all-goals-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="all-goals-heading" className="text-lg font-semibold">
                  All Goals
                </h2>
                <p className="text-muted-foreground text-sm">
                  Showing the complete filtered collection.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {sortedGoals.map((goal) => (
                <GoalCard goal={goal} key={goal.id} localToday={today.date} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
