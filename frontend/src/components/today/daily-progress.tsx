import { CheckCircle2, CircleAlert, ListChecks } from 'lucide-react';

import type { TodayResponseData } from '@/types/today';

export function DailyProgress({
  summary,
}: {
  summary: TodayResponseData['summary'];
}) {
  const hasItems = summary.totalItems > 0;
  const progressLabel = hasItems
    ? `${summary.completedItems} of ${summary.totalItems} items completed`
    : 'Nothing scheduled yet';

  return (
    <section
      aria-labelledby="daily-progress-title"
      className="border-border bg-surface overflow-hidden rounded-xl border"
    >
      <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p
            className="text-muted-foreground text-sm font-medium"
            id="daily-progress-title"
          >
            Daily progress
          </p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-foreground text-4xl font-semibold tracking-tight">
              {summary.completionPercentage}%
            </p>
            <p className="text-muted-foreground pb-1 text-sm">
              {progressLabel}
            </p>
          </div>
          <div
            aria-label={progressLabel}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={summary.completionPercentage}
            className="bg-muted mt-5 h-2.5 overflow-hidden rounded-full"
            role="progressbar"
          >
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${summary.completionPercentage}%` }}
            />
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3 sm:min-w-72">
          <ProgressMetric
            icon={<CheckCircle2 aria-hidden="true" className="size-4" />}
            label="Habits"
            value={`${summary.habitsCompleted}/${summary.habitsTotal}`}
          />
          <ProgressMetric
            icon={<ListChecks aria-hidden="true" className="size-4" />}
            label="Tasks done"
            value={summary.tasksCompletedToday.toString()}
          />
          <ProgressMetric
            icon={<CircleAlert aria-hidden="true" className="size-4" />}
            label="Overdue"
            value={summary.overdueTasks.toString()}
          />
        </dl>
      </div>
    </section>
  );
}

function ProgressMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/70 rounded-lg p-3">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </dt>
      <dd className="text-foreground mt-1.5 text-lg font-semibold">{value}</dd>
    </div>
  );
}
