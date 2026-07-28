import type { Goal } from '@/types/goal';

export function GoalProgress({
  goal,
  detailed = false,
}: {
  goal: Goal;
  detailed?: boolean;
}) {
  const { progress } = goal;
  return (
    <section aria-label={`${goal.name} target progress`} className="mt-3">
      <div className="flex justify-between text-sm">
        <span>
          {progress.currentCount} / {progress.targetCount}
        </span>
        <span>
          {progress.isTargetReached
            ? 'Target reached'
            : `${progress.progressRate.toFixed(2)}%`}
        </span>
      </div>
      <progress
        aria-label={`${goal.name} progress: ${progress.currentCount} of ${progress.targetCount}`}
        className="mt-1 h-2 w-full"
        max={Math.max(progress.targetCount, progress.currentCount)}
        value={progress.currentCount}
      />
      {detailed ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd>{progress.remainingCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Progress rate</dt>
            <dd>{progress.progressRate.toFixed(2)}%</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Achievement</dt>
            <dd>
              {progress.isTargetReached
                ? 'Target reached'
                : 'Target not reached'}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
