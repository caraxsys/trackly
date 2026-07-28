import {
  Activity,
  CalendarCheck2,
  CheckCircle2,
  CircleGauge,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/feedback/empty-state';
import { formatShortDate } from '@/lib/today-format';
import type { AnalyticsPeriod, AnalyticsSummaryData } from '@/types/analytics';

const periods: AnalyticsPeriod[] = ['day', 'week', 'month'];

function analyticsHref(period: AnalyticsPeriod, date?: string) {
  const query = new URLSearchParams({ period });
  if (date) query.set('date', date);
  return `/analytics?${query.toString()}`;
}

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

function insightFor(completionRate: number) {
  if (completionRate >= 80) {
    return {
      title: 'Excellent consistency',
      description:
        'You completed most scheduled habit occurrences in this range. Keep protecting the routines that are working.',
    };
  }

  if (completionRate >= 50) {
    return {
      title: 'Momentum is building',
      description:
        'More than half of your scheduled occurrences are complete. A focused finish can turn this into a strong period.',
    };
  }

  if (completionRate > 0) {
    return {
      title: 'A small reset can help',
      description:
        'Progress has started, but consistency has room to grow. Choose one scheduled habit to complete next.',
    };
  }

  return {
    title: 'Start with one occurrence',
    description:
      'No scheduled occurrences are complete yet. One focused check-in is enough to begin building momentum.',
  };
}

function ProgressMetric({
  label,
  value,
  description,
  icon: Icon,
}: {
  description: string;
  icon: typeof CircleGauge;
  label: string;
  value: number;
}) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="border-border bg-surface rounded-xl border p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon aria-hidden="true" className="text-primary size-5" />
            <h3 className="font-semibold">{label}</h3>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {description}
          </p>
        </div>
        <span className="text-2xl font-semibold tabular-nums">
          {formatPercentage(value)}
        </span>
      </div>
      <div
        aria-label={`${label}: ${formatPercentage(value)}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={boundedValue}
        className="bg-muted mt-5 h-2.5 overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] motion-reduce:transition-none"
          style={{ width: `${boundedValue}%` }}
        />
      </div>
    </div>
  );
}

export function AnalyticsSummary({
  data,
  selectedDate,
}: {
  data: AnalyticsSummaryData;
  selectedDate?: string;
}) {
  const insight = insightFor(data.completionRate);
  const headlineMetrics = [
    {
      label: 'Scheduled',
      value: data.scheduledCount.toLocaleString(),
      helper: 'Habit occurrences planned',
      icon: CalendarCheck2,
    },
    {
      label: 'Completed',
      value: data.completedCount.toLocaleString(),
      helper: 'Occurrences reaching their target',
      icon: CheckCircle2,
    },
    {
      label: 'Completion Rate',
      value: formatPercentage(data.completionRate),
      helper: 'Completed versus scheduled',
      icon: TrendingUp,
    },
  ] as const;
  const detailMetrics = [
    {
      label: 'Total progress',
      value: data.totalCompletedCount.toLocaleString(),
      helper: 'Check-in units recorded',
      icon: Activity,
    },
    {
      label: 'Total target',
      value: data.totalTargetCount.toLocaleString(),
      helper: 'Check-in units available',
      icon: Target,
    },
    {
      label: 'Remaining progress',
      value: Math.max(
        0,
        data.totalTargetCount - data.totalCompletedCount,
      ).toLocaleString(),
      helper: 'Units left to reach every target',
      icon: ListChecks,
    },
  ] as const;

  return (
    <div className="space-y-8">
      <section
        aria-label="Analytics controls"
        className="border-border bg-surface rounded-xl border p-5 sm:p-6"
      >
        <nav aria-label="Analytics period" className="flex flex-wrap gap-2">
          {periods.map((period) => (
            <Link
              aria-current={data.period === period ? 'page' : undefined}
              className={`focus-visible:ring-ring rounded-lg px-4 py-2 text-sm font-medium capitalize outline-none focus-visible:ring-2 ${
                data.period === period
                  ? 'bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted border'
              }`}
              href={analyticsHref(period, selectedDate)}
              key={period}
            >
              {period}
            </Link>
          ))}
        </nav>
        <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
          <input name="period" type="hidden" value={data.period} />
          <label className="space-y-1.5 text-sm font-medium">
            <span className="block">Selected date</span>
            <input
              className="border-input bg-background focus-visible:ring-ring min-h-10 rounded-lg border px-3 outline-none focus-visible:ring-2"
              defaultValue={selectedDate}
              name="date"
              type="date"
            />
          </label>
          <button
            className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring min-h-10 rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-2"
            type="submit"
          >
            Apply date
          </button>
        </form>
      </section>

      <section aria-labelledby="analytics-range-heading" className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-wide">
              Performance overview
            </p>
            <h2
              className="text-foreground mt-1 text-2xl font-semibold tracking-tight"
              id="analytics-range-heading"
            >
              {formatShortDate(data.startDate)} –{' '}
              {formatShortDate(data.endDate)}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm capitalize">
            Inclusive {data.period} range
          </p>
        </div>

        {data.scheduledCount === 0 ? (
          <EmptyState
            description="There are no active habits scheduled in this date range. Choose another period or add a schedule to see performance metrics."
            title="No scheduled occurrences"
          />
        ) : null}

        <dl className="grid gap-4 md:grid-cols-3">
          {headlineMetrics.map(({ helper, icon: Icon, label, value }) => (
            <div
              className="border-border bg-surface rounded-xl border p-5 shadow-sm"
              key={label}
            >
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground text-sm font-medium">
                  {label}
                </dt>
                <span className="bg-primary-soft text-primary flex size-9 items-center justify-center rounded-lg">
                  <Icon aria-hidden="true" className="size-4.5" />
                </span>
              </div>
              <dd className="text-foreground mt-4 text-3xl font-semibold tabular-nums tracking-tight">
                {value}
              </dd>
              <dd className="text-muted-foreground mt-1 text-sm">{helper}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="rate-heading">
          <div>
            <h2 className="text-xl font-semibold" id="rate-heading">
              Rate breakdown
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Completion measures finished occurrences; progress measures
              absolute check-in units.
            </p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ProgressMetric
              description={`${data.completedCount.toLocaleString()} of ${data.scheduledCount.toLocaleString()} scheduled occurrences completed`}
              icon={CircleGauge}
              label="Completion Rate"
              value={data.completionRate}
            />
            <ProgressMetric
              description={`${data.totalCompletedCount.toLocaleString()} of ${data.totalTargetCount.toLocaleString()} target units recorded`}
              icon={Activity}
              label="Progress Rate"
              value={data.progressRate}
            />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <section
            aria-labelledby="detail-metrics-heading"
            className="border-border bg-surface rounded-xl border p-5 sm:p-6"
          >
            <h2 className="text-lg font-semibold" id="detail-metrics-heading">
              Detail metrics
            </h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-3">
              {detailMetrics.map(({ helper, icon: Icon, label, value }) => (
                <div key={label}>
                  <div className="flex items-center gap-2">
                    <Icon
                      aria-hidden="true"
                      className="text-muted-foreground size-4"
                    />
                    <dt className="text-muted-foreground text-sm">{label}</dt>
                  </div>
                  <dd className="mt-2 text-2xl font-semibold tabular-nums">
                    {value}
                  </dd>
                  <dd className="text-muted-foreground mt-1 text-xs leading-5">
                    {helper}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <aside
            aria-labelledby="analytics-insight-heading"
            className="border-primary/25 bg-primary-soft rounded-xl border p-5 sm:p-6"
          >
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="text-primary size-5" />
              <p className="text-primary text-sm font-semibold">Insight</p>
            </div>
            <h2
              className="mt-4 text-lg font-semibold"
              id="analytics-insight-heading"
            >
              {insight.title}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {insight.description}
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
