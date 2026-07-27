import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Pagination } from '@/components/common/pagination';
import { HabitControls } from '@/components/habits/habit-controls';
import { HabitEmptyState } from '@/components/habits/habit-empty-state';
import { HabitList } from '@/components/habits/habit-list';
import { PageHeader } from '@/components/layout/page-header';
import { getServerSession } from '@/lib/auth-session';
import { habitsHref, normalizeHabitParams } from '@/lib/habit-query';
import {
  getServerHabits,
  HabitServerError,
} from '@/services/habit-server-service';

export const metadata: Metadata = {
  title: 'Habits',
  description: 'Review routines and recurring activities.',
};
export const dynamic = 'force-dynamic';

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const rawParams = await searchParams;
  const params = normalizeHabitParams(rawParams);
  let data;

  try {
    data = await getServerHabits(params);
  } catch (error) {
    if (error instanceof HabitServerError && error.status === 401) {
      redirect('/login');
    }
    if (error instanceof HabitServerError && error.status === 400) {
      return (
        <section
          className="border-border bg-surface rounded-xl border px-6 py-12 text-center"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Those filters are not valid</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Check the date, view, sorting, and page values.
          </p>
          <Link
            className="text-primary focus-visible:ring-ring mt-4 inline-block rounded-sm font-medium hover:underline focus-visible:ring-2"
            href="/habits"
          >
            Return to default habits
          </Link>
        </section>
      );
    }
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Link
            className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2"
            href="/habits/new"
          >
            <Plus aria-hidden="true" className="size-4" /> New habit
          </Link>
        }
        description="Review and manage your routines and recurring activities."
        title="Habits"
      />
      <HabitControls
        hasExplicitDate={typeof rawParams.date === 'string'}
        query={data.query}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {data.pagination.totalItems}{' '}
          {data.pagination.totalItems === 1 ? 'habit' : 'habits'} found
        </p>
        <p className="text-muted-foreground text-sm">
          Times and dates use {data.query.timezone}
        </p>
      </div>
      {data.items.length ? (
        <HabitList items={data.items} />
      ) : (
        <HabitEmptyState query={data.query} />
      )}
      <Pagination
        currentPage={data.pagination.page}
        hasNextPage={data.pagination.hasNextPage}
        hasPreviousPage={data.pagination.hasPreviousPage}
        hrefForPage={(page) => habitsHref(data.query, { page })}
        totalPages={data.pagination.totalPages}
      />
    </div>
  );
}
