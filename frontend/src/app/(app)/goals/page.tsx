import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { GoalProgress } from '@/components/goals/goal-progress';
import { getServerSession } from '@/lib/auth-session';
import { getServerGoals } from '@/services/goal-server-service';
import type { GoalStatus } from '@/types/goal';

export const metadata: Metadata = { title: 'Goals' };
export const dynamic = 'force-dynamic';
export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await getServerSession())) redirect('/login');
  const value = (await searchParams).status;
  const status =
    value && ['active', 'completed', 'cancelled'].includes(value)
      ? (value as GoalStatus)
      : undefined;
  const goals = await getServerGoals(status);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Set finite accumulation targets for your Habits."
      />
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'completed', 'cancelled'].map((item) => (
          <Link
            className="border-border focus-visible:ring-ring rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
            aria-current={
              (item === 'all' ? !status : status === item) ? 'page' : undefined
            }
            href={item === 'all' ? '/goals' : `/goals?status=${item}`}
            key={item}
          >
            {item}
          </Link>
        ))}
        <Link
          className="bg-primary text-primary-foreground ml-auto rounded-lg px-4 py-2"
          href="/goals/new"
        >
          New Goal
        </Link>
      </div>
      {goals.length === 0 ? (
        <EmptyState
          title="No Goals found"
          description="Create a Goal or choose another status filter."
        />
      ) : (
        <div className="grid gap-3">
          {goals.map((goal) => (
            <article
              className="border-border bg-surface rounded-xl border p-5"
              key={goal.id}
            >
              <div className="flex justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    <Link href={`/goals/${goal.id}`}>{goal.name}</Link>
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {goal.habitName}
                  </p>
                </div>
                <span className="capitalize">{goal.status}</span>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                Target {goal.targetCount} · {goal.startDate} – {goal.endDate}
              </p>
              <GoalProgress goal={goal} />
              <Link
                className="mt-3 inline-block text-sm underline"
                href={`/goals/${goal.id}/edit`}
              >
                Edit
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
