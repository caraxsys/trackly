import Link from 'next/link';

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

export function AnalyticsSummary({
  data,
  selectedDate,
}: {
  data: AnalyticsSummaryData;
  selectedDate?: string;
}) {
  const metrics = [
    ['Scheduled', data.scheduledCount.toLocaleString()],
    ['Completed', data.completedCount.toLocaleString()],
    ['Completion Rate', formatPercentage(data.completionRate)],
    ['Total Progress', data.totalCompletedCount.toLocaleString()],
    ['Total Target', data.totalTargetCount.toLocaleString()],
    ['Progress Rate', formatPercentage(data.progressRate)],
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

      <section aria-labelledby="analytics-range-heading">
        <h2
          className="text-foreground text-xl font-semibold"
          id="analytics-range-heading"
        >
          {formatShortDate(data.startDate)} – {formatShortDate(data.endDate)}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Inclusive {data.period} range
        </p>

        {data.scheduledCount === 0 ? (
          <div className="border-border bg-surface mt-5 rounded-xl border px-6 py-10 text-center">
            <h3 className="text-foreground font-semibold">
              No scheduled occurrences
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              There are no active habits scheduled in this date range.
            </p>
          </div>
        ) : null}

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div
              className="border-border bg-surface rounded-xl border p-5"
              key={label}
            >
              <dt className="text-muted-foreground text-sm">{label}</dt>
              <dd className="text-foreground mt-2 text-2xl font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
