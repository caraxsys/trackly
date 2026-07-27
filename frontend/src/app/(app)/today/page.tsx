import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { TodayDashboard } from '@/components/today/today-dashboard';
import { getServerSession } from '@/lib/auth-session';
import {
  getServerToday,
  TodayServerError,
} from '@/services/today-server-service';

export const metadata: Metadata = {
  title: 'Today',
  description: 'A calm starting point for your day.',
};

export const dynamic = 'force-dynamic';

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  const rawDate = (await searchParams).date;
  const date = typeof rawDate === 'string' ? rawDate : undefined;

  let data;
  let invalidDate = false;

  try {
    data = await getServerToday(date);
  } catch (error) {
    if (error instanceof TodayServerError && error.status === 401) {
      redirect('/login');
    }

    if (error instanceof TodayServerError && error.status === 400) {
      invalidDate = true;
    } else {
      throw error;
    }
  }

  if (invalidDate || !data) {
    return (
      <section
        className="border-border bg-surface rounded-xl border px-6 py-12 text-center"
        role="alert"
      >
        <h1 className="text-foreground text-xl font-semibold">
          That date is not available
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
          Use a real calendar date in YYYY-MM-DD format.
        </p>
        <Link
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring mt-5 inline-flex rounded-md px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2"
          href="/today"
        >
          Return to today
        </Link>
      </section>
    );
  }

  return (
    <TodayDashboard
      data={data}
      hasExplicitDate={Boolean(date)}
      now={new Date()}
      userName={session.user.name}
    />
  );
}
