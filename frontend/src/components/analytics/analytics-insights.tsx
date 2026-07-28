import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarCheck2,
  CalendarClock,
  Sparkles,
} from 'lucide-react';

import { EmptyState } from '@/components/feedback/empty-state';
import { formatShortDate } from '@/lib/today-format';
import type { AnalyticsInsightsData } from '@/types/analytics';

function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

function trendPresentation(
  trend: NonNullable<AnalyticsInsightsData['insights']['trend']>,
) {
  if (trend.direction === 'insufficient-data') {
    return {
      icon: CalendarClock,
      title: 'More activity needed',
      detail:
        'Both comparison windows need at least one active day before a trend can be calculated.',
    };
  }

  if (trend.direction === 'up') {
    return {
      icon: ArrowUpRight,
      title: 'Trending up',
      detail: `Up ${formatPercentage(Math.abs(trend.changePercentagePoints ?? 0))} points versus the previous window.`,
    };
  }

  if (trend.direction === 'down') {
    return {
      icon: ArrowDownRight,
      title: 'Trending down',
      detail: `Down ${formatPercentage(Math.abs(trend.changePercentagePoints ?? 0))} points versus the previous window.`,
    };
  }

  return {
    icon: ArrowRight,
    title: 'Holding steady',
    detail: 'Completion is unchanged from the previous comparison window.',
  };
}

export function AnalyticsInsights({ data }: { data: AnalyticsInsightsData }) {
  if (!data.hasActivity) {
    return (
      <section aria-labelledby="insights-heading" className="space-y-5">
        <div>
          <h2
            className="text-2xl font-semibold tracking-tight"
            id="insights-heading"
          >
            Insights
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Deterministic observations for the selected history period.
          </p>
        </div>
        <EmptyState
          description="Insights will appear after at least one day has a scheduled habit occurrence."
          title="No activity to analyze"
        />
      </section>
    );
  }

  const { bestDay, consistency, lowestDay, mostProductiveWeekday, trend } =
    data.insights;
  if (
    !bestDay ||
    !consistency ||
    !lowestDay ||
    !mostProductiveWeekday ||
    !trend
  )
    return null;

  const trendView = trendPresentation(trend);
  const TrendIcon = trendView.icon;
  const cards = [
    {
      label: 'Best Day',
      value: formatShortDate(bestDay.date),
      helper: `${formatPercentage(bestDay.completionRate)} completion`,
      icon: Award,
    },
    {
      label: 'Strongest Weekday',
      value: mostProductiveWeekday.weekday,
      helper: `${formatPercentage(mostProductiveWeekday.averageCompletionRate)} average completion`,
      icon: CalendarCheck2,
    },
    {
      label: 'Consistency',
      value: formatPercentage(consistency.consistencyRate),
      helper: `${consistency.fullyCompletedDays} of ${consistency.activeDays} active days fully completed`,
      icon: Sparkles,
    },
    {
      label: 'Recent Trend',
      value: trendView.title,
      helper: trendView.detail,
      icon: TrendIcon,
    },
  ] as const;

  return (
    <section aria-labelledby="insights-heading" className="space-y-5">
      <div>
        <h2
          className="text-2xl font-semibold tracking-tight"
          id="insights-heading"
        >
          Insights
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Deterministic observations for {data.period.toUpperCase()} of
          user-local activity.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ helper, icon: Icon, label, value }) => (
          <div
            className="border-border bg-surface rounded-xl border p-5"
            key={label}
          >
            <div className="flex items-center gap-2">
              <Icon aria-hidden="true" className="text-primary size-5" />
              <dt className="text-muted-foreground text-sm font-medium">
                {label}
              </dt>
            </div>
            <dd className="mt-4 text-xl font-semibold capitalize">{value}</dd>
            <dd className="text-muted-foreground mt-2 text-sm leading-6">
              {helper}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground text-sm">
        Lowest day:{' '}
        <span className="text-foreground font-medium">
          {formatShortDate(lowestDay.date)}
        </span>{' '}
        at {formatPercentage(lowestDay.completionRate)} completion.
      </p>
    </section>
  );
}
