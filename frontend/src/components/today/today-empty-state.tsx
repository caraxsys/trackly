import { Compass } from 'lucide-react';
import Link from 'next/link';

export function TodayEmptyState() {
  return (
    <section className="border-border bg-surface rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="bg-primary-soft text-primary mx-auto flex size-11 items-center justify-center rounded-full">
        <Compass aria-hidden="true" className="size-5" />
      </span>
      <h2 className="text-foreground mt-4 text-lg font-semibold">
        Your day is clear
      </h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
        Nothing is scheduled for this date. Explore your prepared spaces for
        habits, tasks, and goals.
      </p>
      <nav
        aria-label="Explore Trackly"
        className="mt-5 flex flex-wrap justify-center gap-3"
      >
        {[
          ['Habits', '/habits'],
          ['Tasks', '/tasks'],
          ['Goals', '/goals'],
        ].map(([label, href]) => (
          <Link
            className="border-border bg-background text-foreground hover:bg-muted focus-visible:ring-ring rounded-md border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2"
            href={href ?? '/today'}
            key={label}
          >
            {label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
