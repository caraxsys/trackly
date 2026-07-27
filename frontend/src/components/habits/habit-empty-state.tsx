import { SearchX, Sprout } from 'lucide-react';
import Link from 'next/link';

import { habitsHref } from '@/lib/habit-query';
import type { HabitCollectionData } from '@/types/habit';

export function HabitEmptyState({
  query,
}: {
  query: HabitCollectionData['query'];
}) {
  const searched = Boolean(query.search);
  const title = searched
    ? `No habits match “${query.search}”`
    : query.view === 'today'
      ? 'No habits scheduled'
      : query.view === 'inactive'
        ? 'No inactive habits'
        : 'No habits yet';
  const description = searched
    ? 'Try another term or clear the search to see the full view.'
    : query.view === 'today'
      ? 'Your routine is clear for this selected date.'
      : query.view === 'inactive'
        ? 'All of your visible habits are currently active.'
        : 'Habit creation will be available in a future milestone.';
  const Icon = searched ? SearchX : Sprout;

  return (
    <section className="border-border bg-surface rounded-xl border px-6 py-12 text-center">
      <Icon
        aria-hidden="true"
        className="text-muted-foreground mx-auto size-8"
      />
      <h2 className="text-foreground mt-4 text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {searched && (
        <Link
          className="text-primary focus-visible:ring-ring mt-4 inline-block rounded-sm text-sm font-medium hover:underline focus-visible:ring-2"
          href={habitsHref(query, { search: undefined, page: 1 })}
        >
          Clear search
        </Link>
      )}
    </section>
  );
}
