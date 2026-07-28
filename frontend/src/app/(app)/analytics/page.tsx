import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AnalyticsSummary } from '@/components/analytics/analytics-summary';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { getServerSession } from '@/lib/auth-session';
import {
  AnalyticsServerError,
  getServerAnalyticsSummary,
} from '@/services/analytics-server-service';
import type { AnalyticsPeriod } from '@/types/analytics';

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
    period?: string | string[];
  }>;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const query = await searchParams;
  const rawPeriod = readSingle(query.period);
  const period = (rawPeriod ?? 'week') as AnalyticsPeriod;
  const date = readSingle(query.date);

  let data;
  let invalidQuery = false;

  try {
    data = await getServerAnalyticsSummary(period, date);
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

  if (invalidQuery || !data) {
    return (
      <div role="alert">
        <EmptyState
          action={
            <Link
              className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex rounded-lg px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2"
              href="/analytics"
            >
              Return to analytics
            </Link>
          }
          description="Choose day, week, or month and use a valid calendar date."
          title="That analytics range is not available"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description="Review scheduled habit occurrences and absolute progress for a local-calendar range."
        title="Analytics"
      />
      <AnalyticsSummary data={data} selectedDate={date} />
    </div>
  );
}
