import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  hrefForPage: (page: number) => string;
  totalPages: number;
}

export function Pagination({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  hrefForPage,
  totalPages,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Habit results pagination"
      className="flex items-center justify-between gap-4"
    >
      {hasPreviousPage ? (
        <Link
          className="border-border bg-surface hover:bg-muted focus-visible:ring-ring inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          href={hrefForPage(currentPage - 1)}
          rel="prev"
        >
          <ChevronLeft aria-hidden="true" className="size-4" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground text-sm">
        Page {currentPage} of {totalPages}
      </span>
      {hasNextPage ? (
        <Link
          className="border-border bg-surface hover:bg-muted focus-visible:ring-ring inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          href={hrefForPage(currentPage + 1)}
          rel="next"
        >
          Next <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
