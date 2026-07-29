import Link from 'next/link';

import { SearchInput } from '@/components/common/search-input';
import { DateNavigation } from '@/components/today/date-navigation';
import { habitsHref } from '@/lib/habit-query';
import type { HabitCollectionData } from '@/types/habit';

export function HabitControls({
  query,
  hasExplicitDate,
}: {
  query: HabitCollectionData['query'];
  hasExplicitDate: boolean;
}) {
  const hidden = {
    view: query.view,
    date: query.date,
    sort: query.sort,
    order: query.order,
  };

  return (
    <section aria-label="Habit collection controls" className="space-y-4">
      <nav aria-label="Habit views" className="flex gap-1" role="tablist">
        {(['today', 'all', 'archived'] as const).map((view) => (
          <Link
            aria-selected={query.view === view}
            className={
              query.view === view
                ? 'bg-primary text-primary-foreground focus-visible:ring-ring rounded-md px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded-md px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2'
            }
            href={habitsHref(query, { view, page: 1 })}
            key={view}
            role="tab"
          >
            {view[0]!.toUpperCase() + view.slice(1)}
          </Link>
        ))}
      </nav>

      {query.view === 'today' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Scheduled for {query.date}
          </p>
          <DateNavigation
            ariaLabel="Habit date"
            basePath="/habits"
            date={query.date}
            hasExplicitDate={hasExplicitDate}
            preservedParams={{
              view: query.view,
              search: query.search,
              sort: query.sort,
              order: query.order,
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput
          clearHref={habitsHref(query, { search: undefined, page: 1 })}
          defaultValue={query.search}
          hiddenValues={hidden}
          label="Search habits by name or description"
        />
        <form
          action="/habits"
          className="border-border bg-surface flex flex-wrap items-end gap-3 rounded-md border p-3"
        >
          <input name="view" type="hidden" value={query.view} />
          <input name="date" type="hidden" value={query.date} />
          {query.search && (
            <input name="search" type="hidden" value={query.search} />
          )}
          <label className="text-muted-foreground grid gap-1 text-xs">
            Sort by
            <select
              className="border-border bg-background text-foreground focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
              defaultValue={query.sort}
              name="sort"
            >
              <option value="position">Position</option>
              <option value="name">Name</option>
              <option value="createdAt">Created</option>
              <option value="updatedAt">Updated</option>
            </select>
          </label>
          <label className="text-muted-foreground grid gap-1 text-xs">
            Order
            <select
              className="border-border bg-background text-foreground focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
              defaultValue={query.order}
              name="order"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
          <button
            className="border-border hover:bg-muted focus-visible:ring-ring h-9 rounded-md border px-3 text-sm font-medium outline-none focus-visible:ring-2"
            type="submit"
          >
            Apply
          </button>
        </form>
      </div>
    </section>
  );
}
