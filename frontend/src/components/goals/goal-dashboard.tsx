import {
  Ban,
  CheckCircle2,
  CircleDot,
  Gauge,
  ListChecks,
  Target,
} from 'lucide-react';
import { GoalCard } from '@/components/goals/goal-card';
import {
  groupPriorityGoals,
  summarizeGoals,
} from '@/features/goals/goal-dashboard';
import type { Goal } from '@/types/goal';

const metrics = [
  ['Total Goals', 'totalGoals', ListChecks],
  ['Active Goals', 'activeGoals', CircleDot],
  ['Completed Goals', 'completedGoals', CheckCircle2],
  ['Cancelled Goals', 'cancelledGoals', Ban],
  ['Targets reached', 'reachedGoals', Target],
  ['Average active progress', 'averageActiveProgressRate', Gauge],
] as const;

export function GoalDashboard({
  goals,
  localToday,
}: {
  goals: Goal[];
  localToday: string;
}) {
  const summary = summarizeGoals(goals);
  const groups = groupPriorityGoals(goals, localToday);
  const sections = [
    ['Almost there', 'Active Goals at least 70% complete.', groups.almostThere],
    [
      'Ending soon',
      'Unreached active Goals ending within seven days.',
      groups.endingSoon,
    ],
    [
      'Targets reached',
      'Goals currently at or beyond their target.',
      groups.reached,
    ],
    [
      'Over target',
      'Goals whose accumulated progress exceeds their target.',
      groups.overTarget,
    ],
  ] as const;

  return (
    <>
      <section aria-labelledby="goal-summary-heading">
        <h2 id="goal-summary-heading" className="text-lg font-semibold">
          At a glance
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(([label, key, Icon]) => (
            <div
              className="border-border bg-surface rounded-xl border p-4"
              key={key}
            >
              <dt className="text-muted-foreground flex items-center gap-2 text-sm">
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </dt>
              <dd className="mt-2 text-2xl font-semibold">
                {summary[key]}
                {key === 'averageActiveProgressRate' ? '%' : ''}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {sections.some(([, , values]) => values.length > 0) ? (
        <section aria-labelledby="goal-priorities-heading">
          <h2 id="goal-priorities-heading" className="text-lg font-semibold">
            Priorities
          </h2>
          <div className="mt-3 space-y-6">
            {sections.map(([title, description, values]) =>
              values.length > 0 ? (
                <section
                  aria-labelledby={`goal-${title.toLowerCase().replaceAll(' ', '-')}`}
                  key={title}
                >
                  <h3
                    className="font-semibold"
                    id={`goal-${title.toLowerCase().replaceAll(' ', '-')}`}
                  >
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {description}
                  </p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {values.map((goal) => (
                      <GoalCard
                        compact
                        goal={goal}
                        key={goal.id}
                        localToday={localToday}
                      />
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
