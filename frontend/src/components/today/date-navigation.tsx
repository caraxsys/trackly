import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';

import { addDisplayDateDays } from '@/lib/today-format';

export function DateNavigation({
  date,
  hasExplicitDate,
  basePath = '/today',
  preservedParams = {},
  ariaLabel = 'Dashboard date',
}: {
  date: string;
  hasExplicitDate: boolean;
  basePath?: string;
  preservedParams?: Record<string, string>;
  ariaLabel?: string;
}) {
  const controlClass =
    'border-border bg-surface text-foreground hover:bg-muted focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-md border outline-none focus-visible:ring-2';

  const href = (targetDate?: string) => {
    const params = new URLSearchParams(preservedParams);
    if (targetDate) params.set('date', targetDate);
    else params.delete('date');
    params.delete('page');
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-2">
      <Link
        aria-label="Previous day"
        className={controlClass}
        href={href(addDisplayDateDays(date, -1))}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Link>
      {hasExplicitDate ? (
        <Link
          className="border-border bg-surface text-foreground hover:bg-muted focus-visible:ring-ring inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium outline-none focus-visible:ring-2"
          href={href()}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Today
        </Link>
      ) : null}
      <Link
        aria-label="Next day"
        className={controlClass}
        href={href(addDisplayDateDays(date, 1))}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Link>
    </nav>
  );
}
