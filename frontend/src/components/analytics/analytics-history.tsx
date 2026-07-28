'use client';

import { Activity, CalendarRange, CheckCircle2, Target } from 'lucide-react';
import Link from 'next/link';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '@/components/feedback/empty-state';
import { formatShortDate } from '@/lib/today-format';
import type {
  AnalyticsHistoryData,
  AnalyticsHistoryPeriod,
  AnalyticsPeriod,
} from '@/types/analytics';

const historyPeriods: AnalyticsHistoryPeriod[] = ['7d', '30d', '90d'];

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatTick(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function historyHref(
  historyPeriod: AnalyticsHistoryPeriod,
  summaryPeriod: AnalyticsPeriod,
  selectedDate?: string,
) {
  const query = new URLSearchParams({
    period: summaryPeriod,
    historyPeriod,
  });
  if (selectedDate) query.set('date', selectedDate);
  return `/analytics?${query.toString()}`;
}

function TrendChart({
  data,
  dataKey,
  label,
}: {
  data: AnalyticsHistoryData['history'];
  dataKey: 'completionRate' | 'progressRate';
  label: string;
}) {
  return (
    <section
      aria-labelledby={`${dataKey}-heading`}
      className="border-border bg-surface rounded-xl border p-5 sm:p-6"
    >
      <h3 className="font-semibold" id={`${dataKey}-heading`}>
        {label}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Daily percentage across the selected history.
      </p>
      <div aria-hidden="true" className="mt-5 h-64 min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={{ left: -12, right: 12, top: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={24}
              tickFormatter={formatTick}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value) => [
                formatPercentage(Number(value ?? 0)),
                label,
              ]}
              labelFormatter={(value) => formatShortDate(String(value))}
            />
            <Line
              dataKey={dataKey}
              dot={data.length <= 30}
              stroke="var(--primary)"
              strokeWidth={2.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function AnalyticsHistory({
  data,
  selectedDate,
  summaryPeriod,
}: {
  data: AnalyticsHistoryData;
  selectedDate?: string;
  summaryPeriod: AnalyticsPeriod;
}) {
  const metrics = [
    {
      label: 'Average completion',
      value: formatPercentage(data.summary.averageCompletionRate),
      icon: CheckCircle2,
    },
    {
      label: 'Average progress',
      value: formatPercentage(data.summary.averageProgressRate),
      icon: Activity,
    },
    {
      label: 'Scheduled occurrences',
      value: data.summary.scheduledCount.toLocaleString(),
      icon: CalendarRange,
    },
    {
      label: 'Target units',
      value: data.summary.totalTargetCount.toLocaleString(),
      icon: Target,
    },
  ] as const;

  return (
    <section aria-labelledby="history-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            className="text-2xl font-semibold tracking-tight"
            id="history-heading"
          >
            Daily trends
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatShortDate(data.startDate)} – {formatShortDate(data.endDate)}
          </p>
        </div>
        <nav aria-label="Analytics history period" className="flex gap-2">
          {historyPeriods.map((period) => (
            <Link
              aria-current={data.period === period ? 'page' : undefined}
              className={`focus-visible:ring-ring min-h-10 rounded-lg px-4 py-2 text-sm font-semibold uppercase outline-none focus-visible:ring-2 ${
                data.period === period
                  ? 'bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted border'
              }`}
              href={historyHref(period, summaryPeriod, selectedDate)}
              key={period}
            >
              {period}
            </Link>
          ))}
        </nav>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }) => (
          <div
            className="border-border bg-surface rounded-xl border p-5"
            key={label}
          >
            <div className="flex items-center gap-2">
              <Icon aria-hidden="true" className="text-primary size-4" />
              <dt className="text-muted-foreground text-sm">{label}</dt>
            </div>
            <dd className="mt-3 text-2xl font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {data.summary.scheduledCount === 0 ? (
        <EmptyState
          description="There were no scheduled habit occurrences in this period. Every calendar day is still represented in the history."
          title="No activity in this period"
        />
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <TrendChart
            data={data.history}
            dataKey="completionRate"
            label="Completion Rate"
          />
          <TrendChart
            data={data.history}
            dataKey="progressRate"
            label="Progress Rate"
          />
        </div>
      )}

      <table className="sr-only">
        <caption>Daily analytics history</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Completion Rate</th>
            <th scope="col">Progress Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.history.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatShortDate(point.date)}</th>
              <td>{formatPercentage(point.completionRate)}</td>
              <td>{formatPercentage(point.progressRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
