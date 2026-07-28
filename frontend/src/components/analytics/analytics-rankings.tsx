import { EmptyState } from '@/components/feedback/empty-state';
import type {
  AnalyticsCategoryRankings,
  AnalyticsHabitRankings,
} from '@/types/analytics';

const rate = (value: number) => `${value.toFixed(2)}%`;

export function AnalyticsRankings({
  categories,
  habits,
}: {
  categories: AnalyticsCategoryRankings;
  habits: AnalyticsHabitRankings;
}) {
  if (!categories.hasActivity && !habits.hasActivity)
    return (
      <EmptyState
        title="No ranked activity yet"
        description="Rankings appear when habits have scheduled occurrences in this period."
      />
    );

  const visibleHabits = habits.habits.slice(0, 10);
  const remainingHabits = habits.habits.slice(10);

  const renderHabit = (
    item: AnalyticsHabitRankings['habits'][number],
    index: number,
  ) => (
    <article
      className="border-border bg-surface rounded-xl border p-4"
      key={item.habitId}
    >
      <p className="text-muted-foreground text-xs">
        #{index + 1} · {item.category?.name ?? 'Uncategorized'}
      </p>
      <h3 className="mt-1 font-semibold">{item.name}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Completion</dt>
          <dd>
            {rate(item.completionRate)} ({item.completedCount}/
            {item.scheduledCount})
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Progress</dt>
          <dd>{rate(item.progressRate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Current streak</dt>
          <dd>{item.currentStreak}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Longest streak</dt>
          <dd>{item.longestStreak}</dd>
        </div>
      </dl>
    </article>
  );

  return (
    <div className="grid gap-8">
      <section aria-labelledby="category-performance">
        <h2 className="text-2xl font-semibold" id="category-performance">
          Category Performance
        </h2>
        {!categories.hasActivity ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Categorized activity is unavailable; uncategorized habit rankings
            remain below.
          </p>
        ) : null}
        <div className="mt-4 grid gap-3">
          {categories.categories.map((item, index) => (
            <article
              className="border-border bg-surface rounded-xl border p-4"
              key={item.categoryId}
            >
              <div className="flex justify-between gap-4">
                <h3 className="font-semibold">
                  {index + 1}. {item.name}
                </h3>
                <strong>{rate(item.completionRate)}</strong>
              </div>
              <div
                className="bg-muted mt-3 h-2 rounded-full"
                role="img"
                aria-label={`${item.name} completion ${rate(item.completionRate)}`}
              >
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${item.completionRate}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                {item.completedCount}/{item.scheduledCount} completed ·{' '}
                {rate(item.progressRate)} progress · {item.activeHabitCount}{' '}
                active habits
              </p>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="habit-performance">
        <h2 className="text-2xl font-semibold" id="habit-performance">
          Habit Performance
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Top performers and habits that may benefit from attention, ranked
          without treating low volume as poor performance.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleHabits.map(renderHabit)}
        </div>
        {remainingHabits.length > 0 ? (
          <details className="mt-4">
            <summary className="focus-visible:ring-ring w-fit cursor-pointer rounded text-sm font-medium outline-none focus-visible:ring-2">
              Show {remainingHabits.length} more habits
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {remainingHabits.map((item, index) =>
                renderHabit(item, index + visibleHabits.length),
              )}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
