import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { GoalDeleteButton } from '@/components/goals/goal-delete-button';
import { GoalProgress } from '@/components/goals/goal-progress';
import { PageHeader } from '@/components/layout/page-header';
import { getServerSession } from '@/lib/auth-session';
import { getServerGoal, GoalServerError } from '@/services/goal-server-service';
export default async function GoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getServerSession())) redirect('/login');
  let goal;
  try {
    goal = await getServerGoal((await params).id);
  } catch (error) {
    if (error instanceof GoalServerError && error.status === 404) notFound();
    throw error;
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={goal.name}
        description="A finite accumulation target linked to your Habit."
      />
      <section className="border-border bg-surface rounded-xl border p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Habit</dt>
            <dd>{goal.habitName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{goal.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target count</dt>
            <dd>{goal.targetCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date range</dt>
            <dd>
              {goal.startDate} – {goal.endDate}
            </dd>
          </div>
        </dl>
        <GoalProgress detailed goal={goal} />
        <p className="text-muted-foreground mt-3 text-sm">
          Manual status: <span className="capitalize">{goal.status}</span>.
          Target achievement is derived independently.
        </p>
        <p className="text-muted-foreground mt-5 text-sm">
          Progress from Habit check-ins will be integrated in the next
          milestone.
        </p>
      </section>
      <div className="flex gap-3">
        <Link
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2"
          href={`/goals/${goal.id}/edit`}
        >
          Edit Goal
        </Link>
        <GoalDeleteButton id={goal.id} />
      </div>
    </div>
  );
}
