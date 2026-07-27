'use client';

import Link from 'next/link';

import { ErrorState } from '@/components/feedback/error-state';

export default function TodayError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <ErrorState
        description="Trackly could not load your dashboard. Check the connection and try again."
        onRetry={reset}
        title="Today is temporarily unavailable"
      />
      <p className="text-muted-foreground -mt-8 text-center text-sm">
        Or{' '}
        <Link
          className="text-primary focus-visible:ring-ring rounded-sm font-medium hover:underline focus-visible:ring-2"
          href="/today"
        >
          return to today
        </Link>
        .
      </p>
    </div>
  );
}
