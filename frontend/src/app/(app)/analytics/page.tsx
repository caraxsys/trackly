import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AnalyticsHistory } from '@/components/analytics/analytics-history';
import { AnalyticsHeatmap } from '@/components/analytics/analytics-heatmap';
import { AnalyticsInsights } from '@/components/analytics/analytics-insights';
import { AnalyticsRankings } from '@/components/analytics/analytics-rankings';
import { AnalyticsSummary } from '@/components/analytics/analytics-summary';
import { PageHeader } from '@/components/layout/page-header';
import { getServerSession } from '@/lib/auth-session';
import {
  AnalyticsServerError,
  getServerAnalyticsHeatmap,
  getServerAnalyticsCategories,
  getServerAnalyticsHabits,
  getServerAnalyticsHistory,
  getServerAnalyticsInsights,
  getServerAnalyticsSummary,
} from '@/services/analytics-server-service';
import type {
  AnalyticsHeatmapPeriod,
  AnalyticsHistoryPeriod,
  AnalyticsPeriod,
} from '@/types/analytics';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Habit completion and progress summaries.',
};

export const dynamic = 'force-dynamic';

function readSingle(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string | string[];
    historyPeriod?: string | string[];
    heatmapPeriod?: string | string[];
    period?: string | string[];
  }>;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const query = await searchParams;
  const rawPeriod = readSingle(query.period);
  const period = (rawPeriod ?? 'week') as AnalyticsPeriod;
  const historyPeriod = (readSingle(query.historyPeriod) ??
    '30d') as AnalyticsHistoryPeriod;
  const heatmapPeriod = (readSingle(query.heatmapPeriod) ??
    '365d') as AnalyticsHeatmapPeriod;
  const date = readSingle(query.date);

  let data;
  let history;
  let insights;
  let heatmap;
  let categories;
  let habits;
  let invalidQuery = false;

  try {
    [data, history, insights, heatmap, categories, habits] = await Promise.all([
      getServerAnalyticsSummary(period, date),
      getServerAnalyticsHistory(historyPeriod),
      getServerAnalyticsInsights(historyPeriod),
      getServerAnalyticsHeatmap(heatmapPeriod),
      getServerAnalyticsCategories(historyPeriod),
      getServerAnalyticsHabits(historyPeriod),
    ]);
  } catch (error) {
    if (error instanceof AnalyticsServerError && error.status === 401) {
      redirect('/login');
    }
    if (error instanceof AnalyticsServerError && error.status === 400) {
      invalidQuery = true;
    } else {
      throw error;
    }
  }

  if (
    invalidQuery ||
    !data ||
    !history ||
    !insights ||
    !heatmap ||
    !categories ||
    !habits
  ) {
    return (
      <section
        className="border-border bg-surface rounded-xl border px-6 py-12 text-center"
        role="alert"
      >
        <h1 className="text-foreground text-xl font-semibold">
          That analytics range is not available
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Choose a supported summary, history, and heatmap period with a valid
          calendar date.
        </p>
        <Link
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2"
          href="/analytics"
        >
          Return to analytics
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description="Review scheduled habit occurrences and absolute progress for a local-calendar range."
        title="Analytics"
      />
      <AnalyticsSummary data={data} selectedDate={date} />
      <AnalyticsHistory
        data={history}
        heatmapPeriod={heatmapPeriod}
        selectedDate={date}
        summaryPeriod={period}
      />
      <AnalyticsInsights data={insights} />
      <AnalyticsHeatmap
        data={heatmap}
        historyPeriod={historyPeriod}
        selectedDate={date}
        summaryPeriod={period}
      />
      <AnalyticsRankings categories={categories} habits={habits} />
    </div>
  );
}
