import Link from 'next/link';

import { EmptyState } from '@/components/feedback/empty-state';
import { formatShortDate } from '@/lib/today-format';
import type {
  AnalyticsHeatmapData,
  AnalyticsHeatmapPeriod,
  AnalyticsHistoryPeriod,
  AnalyticsPeriod,
} from '@/types/analytics';

const periods: Array<{ label: string; value: AnalyticsHeatmapPeriod }> = [
  { label: '90D', value: '90d' },
  { label: '180D', value: '180d' },
  { label: '1Y', value: '365d' },
];

const levelClasses = [
  'bg-muted border-border',
  'bg-primary/20 border-primary/20',
  'bg-primary/40 border-primary/30',
  'bg-primary/70 border-primary/50',
  'bg-primary border-primary',
] as const;

function heatmapHref(
  heatmapPeriod: AnalyticsHeatmapPeriod,
  summaryPeriod: AnalyticsPeriod,
  historyPeriod: AnalyticsHistoryPeriod,
  selectedDate?: string,
) {
  const query = new URLSearchParams({
    period: summaryPeriod,
    historyPeriod,
    heatmapPeriod,
  });
  if (selectedDate) query.set('date', selectedDate);
  return `/analytics?${query.toString()}`;
}

function weekday(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return value === 0 ? 7 : value;
}

function describeDay(day: AnalyticsHeatmapData['days'][number]) {
  if (day.scheduledCount === 0)
    return `${formatShortDate(day.date)}: no scheduled habits`;
  return `${formatShortDate(day.date)}: ${day.completedCount} of ${day.scheduledCount} completed, ${day.completionRate.toFixed(2)}%`;
}

export function AnalyticsHeatmap({
  data,
  historyPeriod,
  selectedDate,
  summaryPeriod,
}: {
  data: AnalyticsHeatmapData;
  historyPeriod: AnalyticsHistoryPeriod;
  selectedDate?: string;
  summaryPeriod: AnalyticsPeriod;
}) {
  const leading = data.days.length > 0 ? weekday(data.days[0]!.date) - 1 : 0;
  const monthLabels = data.days.filter(
    (day, index, days) =>
      index === 0 || day.date.slice(0, 7) !== days[index - 1]!.date.slice(0, 7),
  );

  return (
    <section aria-labelledby="heatmap-heading" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold" id="heatmap-heading">
            Contribution heatmap
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Daily scheduled habit completion from{' '}
            {formatShortDate(data.startDate)} to {formatShortDate(data.endDate)}
            .
          </p>
        </div>
        <nav
          aria-label="Heatmap period"
          className="border-border bg-surface inline-flex w-fit rounded-lg border p-1"
        >
          {periods.map(({ label, value }) => (
            <Link
              aria-current={data.period === value ? 'page' : undefined}
              className="focus-visible:ring-ring aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2"
              href={heatmapHref(
                value,
                summaryPeriod,
                historyPeriod,
                selectedDate,
              )}
              key={value}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Active days', data.summary.activeDays],
          ['Completed days', data.summary.completedDays],
          [
            'Completed occurrences',
            `${data.summary.totalCompletedCount}/${data.summary.totalScheduledCount}`,
          ],
          [
            'Average completion',
            `${data.summary.averageCompletionRate.toFixed(2)}%`,
          ],
        ].map(([label, value]) => (
          <div
            className="border-border bg-surface rounded-xl border p-4"
            key={label}
          >
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="mt-1 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </div>

      {data.summary.activeDays === 0 ? (
        <EmptyState
          description="No habits were scheduled in this period. Daily cells remain available for calendar context."
          title="No heatmap activity yet"
        />
      ) : null}

      <div className="border-border bg-surface rounded-xl border p-4 sm:p-6">
        <div
          aria-label="Daily completion heatmap. Scroll horizontally to review all dates."
          className="focus-visible:ring-ring overflow-x-auto pb-3 outline-none focus-visible:ring-2"
          tabIndex={0}
        >
          <div className="text-muted-foreground mb-2 flex w-max min-w-full justify-between gap-8 text-xs">
            {monthLabels.map((day) => (
              <span key={day.date}>
                {new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(`${day.date}T00:00:00.000Z`))}
              </span>
            ))}
          </div>
          <div
            className="grid w-max grid-flow-col grid-rows-7 gap-1"
            style={{
              gridTemplateColumns: `repeat(${Math.ceil((leading + data.days.length) / 7)}, 0.875rem)`,
            }}
          >
            {Array.from({ length: leading }, (_, index) => (
              <span aria-hidden="true" key={`blank-${index}`} />
            ))}
            {data.days.map((day) => (
              <span
                aria-label={describeDay(day)}
                className={`focus-visible:ring-ring h-3.5 w-3.5 rounded-[3px] border outline-none focus-visible:ring-2 ${day.scheduledCount === 0 ? 'border-dashed bg-transparent' : levelClasses[day.level]}`}
                key={day.date}
                tabIndex={0}
                title={describeDay(day)}
              />
            ))}
          </div>
        </div>
        <div
          className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs"
          aria-label="Heatmap intensity legend"
        >
          <span>No schedule</span>
          <span className="border-border h-3.5 w-3.5 rounded-[3px] border border-dashed" />
          <span className="ml-2">No completion</span>
          {levelClasses.map((className, level) => (
            <span
              aria-label={`Level ${level}`}
              className={`h-3.5 w-3.5 rounded-[3px] border ${className}`}
              key={className}
            />
          ))}
          <span>Fully completed</span>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Columns represent weeks; rows run Monday through Sunday.
        </p>
      </div>
    </section>
  );
}
